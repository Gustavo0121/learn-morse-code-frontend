import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { KeyCaptureResult, KeyCaptureService } from './key-capture.service';
import { MorseCharacter } from './morse-characters.service';
import { PracticeAttempt, PracticeRecord, PracticeService } from './practice.service';

export type PracticeMode = 'key_capture' | 'text_to_morse' | 'morse_to_text' | 'listening';

/** Meta da sessão: duração fixa ou quantidade de caracteres respondidos. */
export type SessionKind = 'time' | 'characters';

export interface PracticeRound {
  character: MorseCharacter;
  /** Valor exibido/enviado como `question`. */
  question: string;
  /** Valor enviado como `expected_answer`. */
  expected: string;
  /** Alternativas dos modos de escolha; `null` no key_capture. */
  options: string[] | null;
  startedAt: number;
}

/** Valores selecionáveis na barra de meta, por tipo de sessão. */
const SESSION_VALUES: Record<SessionKind, readonly number[]> = {
  time: [15, 30, 60, 120],
  characters: [10, 15, 20, 25],
};

const DEFAULT_TIME_GOAL_S = 60;
const DEFAULT_CHARACTER_GOAL = 10;

const CLOCK_TICK_MS = 500;

/**
 * Regras da sessão de prática livre: filtros de conteúdo, sorteio e montagem
 * dos rounds, contadores (total/acertos/precisão/cpm), relógio da sessão
 * (começa no primeiro input; expira a sessão por tempo), metas por tempo ou
 * caracteres e o envio das tentativas (`PracticeService`), incluindo o fluxo
 * de `key_capture` via `KeyCaptureService`.
 *
 * Prover no componente de feature junto com o `KeyCaptureService`: o estado é
 * da sessão corrente e o teardown acompanha o ciclo de vida da tela.
 */
@Injectable()
export class PracticeSessionService {
  readonly #capture = inject(KeyCaptureService);
  readonly #practice = inject(PracticeService);

  readonly #characters = signal<MorseCharacter[] | null>(null);
  /** Alfabeto carregado pela tela; `null` enquanto carrega. */
  readonly characters = this.#characters.asReadonly();

  readonly #mode = signal<PracticeMode | null>(null);
  readonly mode = this.#mode.asReadonly();

  readonly #round = signal<PracticeRound | null>(null);
  readonly round = this.#round.asReadonly();

  // Configuração da sessão (barras flutuantes, estilo monkeytype). Letras
  // sempre entram; pontuação e números são opcionais.
  readonly #includePunctuation = signal(false);
  readonly includePunctuation = this.#includePunctuation.asReadonly();

  readonly #includeNumbers = signal(false);
  readonly includeNumbers = this.#includeNumbers.asReadonly();

  readonly #sessionKind = signal<SessionKind>('characters');
  readonly sessionKind = this.#sessionKind.asReadonly();

  readonly #timeGoalS = signal(DEFAULT_TIME_GOAL_S);
  readonly #characterGoal = signal(DEFAULT_CHARACTER_GOAL);

  readonly sessionValues = computed(() => SESSION_VALUES[this.sessionKind()]);
  readonly sessionGoal = computed(() =>
    this.sessionKind() === 'time' ? this.#timeGoalS() : this.#characterGoal(),
  );

  /** Caracteres sorteáveis conforme os filtros de conteúdo da primeira barra. */
  readonly pool = computed<MorseCharacter[] | null>(() => {
    const characters = this.characters();
    if (!characters) {
      return null;
    }
    const filtered = characters.filter(
      (character) =>
        character.type === 'letter' ||
        (character.type === 'number' && this.includeNumbers()) ||
        (character.type === 'punctuation' && this.includePunctuation()),
    );
    return filtered.length > 0 ? filtered : characters;
  });

  readonly #result = signal<PracticeRecord | null>(null);
  readonly result = this.#result.asReadonly();

  readonly #submitting = signal(false);
  readonly submitting = this.#submitting.asReadonly();

  readonly #submitError = signal(false);
  readonly submitError = this.#submitError.asReadonly();

  readonly #finished = signal(false);
  readonly finished = this.#finished.asReadonly();

  readonly #elapsedS = signal(0);
  readonly elapsedS = this.#elapsedS.asReadonly();

  readonly #sessionTotal = signal(0);
  readonly sessionTotal = this.#sessionTotal.asReadonly();

  readonly #sessionCorrect = signal(0);
  readonly sessionCorrect = this.#sessionCorrect.asReadonly();

  /** Soma dos tempos de resposta da sessão (ms) — base do cpm, como no backend. */
  readonly #sessionResponseMs = signal(0);

  readonly accuracy = computed(() => {
    const total = this.sessionTotal();
    return total === 0 ? null : Math.round((this.sessionCorrect() / total) * 100);
  });

  /** Caracteres por minuto, com a mesma fórmula do agregado do backend. */
  readonly cpm = computed(() => {
    const total = this.sessionTotal();
    const responseMs = this.#sessionResponseMs();
    return total === 0 || responseMs === 0 ? null : (total * 60_000) / responseMs;
  });

  #pendingAttempt: PracticeAttempt | null = null;
  #clockTimer: ReturnType<typeof setInterval> | null = null;
  #sessionStartedAt = 0;

  constructor() {
    // O relógio da sessão começa em qualquer press, inclusive os inválidos.
    const pressSubscription = this.#capture
      .onPress()
      .subscribe(() => this.#startClockOnFirstInput());
    const captureSubscription = this.#capture
      .onCapture()
      .subscribe((result) => this.#submitKeyCapture(result));
    inject(DestroyRef).onDestroy(() => {
      pressSubscription.unsubscribe();
      captureSubscription.unsubscribe();
      this.#capture.stop();
      this.#stopClock();
    });
  }

  setCharacters(characters: MorseCharacter[] | null): void {
    this.#characters.set(characters);
  }

  selectMode(mode: PracticeMode): void {
    this.#mode.set(mode);
    this.restart();
  }

  /** Volta à seleção de modos, desarmando captura e relógio. */
  exitMode(): void {
    this.#capture.stop();
    this.#stopClock();
    this.#mode.set(null);
    this.#round.set(null);
    this.#result.set(null);
    this.#submitError.set(false);
    this.#finished.set(false);
  }

  // Mudar qualquer configuração reinicia a sessão (como no monkeytype): os
  // contadores e o relógio voltam do zero com a nova configuração aplicada.

  togglePunctuation(): void {
    this.#includePunctuation.update((value) => !value);
    this.restart();
  }

  toggleNumbers(): void {
    this.#includeNumbers.update((value) => !value);
    this.restart();
  }

  setSessionKind(kind: SessionKind): void {
    if (this.sessionKind() === kind) {
      return;
    }
    this.#sessionKind.set(kind);
    this.restart();
  }

  setSessionGoal(value: number): void {
    if (this.sessionGoal() === value) {
      return;
    }
    if (this.sessionKind() === 'time') {
      this.#timeGoalS.set(value);
    } else {
      this.#characterGoal.set(value);
    }
    this.restart();
  }

  restart(): void {
    this.#finished.set(false);
    this.#result.set(null);
    this.#submitError.set(false);
    this.#sessionTotal.set(0);
    this.#sessionCorrect.set(0);
    this.#sessionResponseMs.set(0);
    this.#stopClock();
    this.#elapsedS.set(0);
    this.nextRound();
  }

  /** Sorteia o próximo round e arma a captura no modo `key_capture`. */
  nextRound(): void {
    const mode = this.mode();
    const pool = this.pool();
    if (!mode || !pool || pool.length === 0) {
      return;
    }

    this.#capture.stop();
    this.#result.set(null);
    this.#submitError.set(false);
    this.#pendingAttempt = null;

    const character = pool[Math.floor(Math.random() * pool.length)];
    this.#round.set({
      character,
      question:
        mode === 'morse_to_text' || mode === 'listening' ? character.code : character.character,
      expected:
        mode === 'text_to_morse' || mode === 'key_capture' ? character.code : character.character,
      options: this.#buildOptions(mode, character, pool),
      startedAt: performance.now(),
    });

    if (mode === 'key_capture') {
      this.#capture.start();
    }
  }

  /** Resposta dos modos de escolha (texto→Morse, Morse→texto, listening). */
  answer(option: string): void {
    const mode = this.mode();
    const round = this.round();
    if (!mode || !round || this.result() || this.submitting()) {
      return;
    }
    this.#startClockOnFirstInput();
    this.#submit({
      exercise_type: mode === 'listening' ? 'listening' : 'multiple_choice',
      question: round.question,
      expected_answer: round.expected,
      user_answer: option,
      response_time: this.#responseTime(round),
    });
  }

  retrySubmit(): void {
    if (this.#pendingAttempt) {
      this.#submit(this.#pendingAttempt);
    }
  }

  /** O relógio da sessão só começa a contar no primeiro input do usuário. */
  #startClockOnFirstInput(): void {
    if (this.#clockTimer !== null) {
      return;
    }
    this.#sessionStartedAt = performance.now();
    this.#clockTimer = setInterval(() => {
      const elapsed = Math.floor((performance.now() - this.#sessionStartedAt) / 1000);
      this.#elapsedS.set(elapsed);
      if (this.sessionKind() === 'time' && elapsed >= this.#timeGoalS()) {
        this.#finishSession();
      }
    }, CLOCK_TICK_MS);
  }

  #stopClock(): void {
    if (this.#clockTimer !== null) {
      clearInterval(this.#clockTimer);
      this.#clockTimer = null;
    }
  }

  #finishSession(): void {
    this.#capture.stop();
    this.#stopClock();
    this.#round.set(null);
    this.#result.set(null);
    this.#submitError.set(false);
    this.#pendingAttempt = null;
    this.#finished.set(true);
  }

  /** Pausa de auto-envio detectada pelo `KeyCaptureService`: fecha o attempt. */
  #submitKeyCapture(result: KeyCaptureResult): void {
    const round = this.round();
    if (!round) {
      return;
    }
    this.#submit({
      exercise_type: 'key_capture',
      ...result,
      question: round.question,
      expected_answer: round.expected,
      response_time: this.#responseTime(round),
    });
  }

  #submit(attempt: PracticeAttempt): void {
    this.#capture.stop();
    this.#pendingAttempt = attempt;
    this.#submitting.set(true);
    this.#submitError.set(false);

    this.#practice.submit(attempt).subscribe({
      next: (record) => {
        this.#submitting.set(false);
        this.#pendingAttempt = null;
        this.#sessionTotal.update((total) => total + 1);
        this.#sessionResponseMs.update((ms) => ms + record.response_time);
        if (record.correct) {
          this.#sessionCorrect.update((correct) => correct + 1);
        }
        // A sessão por tempo pode ter expirado com este envio em voo: a
        // tentativa conta, mas o resumo permanece na tela.
        if (this.finished()) {
          return;
        }
        if (this.sessionKind() === 'characters' && this.sessionTotal() >= this.#characterGoal()) {
          this.#finishSession();
          return;
        }
        this.#result.set(record);
      },
      error: () => {
        this.#submitting.set(false);
        this.#submitError.set(true);
      },
    });
  }

  #responseTime(round: PracticeRound): number {
    return Math.max(1, Math.round(performance.now() - round.startedAt));
  }

  #buildOptions(
    mode: PracticeMode,
    character: MorseCharacter,
    characters: MorseCharacter[],
  ): string[] | null {
    if (mode === 'key_capture') {
      return null;
    }
    const sameType = characters.filter(
      (other) => other.type === character.type && other.id !== character.id,
    );
    const pool = sameType.length >= 3 ? sameType : characters.filter((c) => c.id !== character.id);
    const pick = (item: MorseCharacter): string =>
      mode === 'text_to_morse' ? item.code : item.character;

    const distractors = this.#shuffle(pool.map(pick)).slice(0, 3);
    return this.#shuffle([pick(character), ...distractors]);
  }

  #shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
