import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { MessageKey } from '../../core/i18n/messages';
import { MorseAudioService, MorsePlaybackSettings } from '../../services/morse-audio.service';
import { MorseCharacter, MorseCharactersService } from '../../services/morse-characters.service';
import { MorseInputService, MorsePressEvent } from '../../services/morse-input.service';
import { MorseSettingsService } from '../../services/morse-settings.service';
import { WORD_GAP_UNITS, unitMs } from '../../services/morse-timing';
import { PracticeAttempt, PracticeRecord, PracticeService } from '../../services/practice.service';
import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';

export type PracticeMode = 'key_capture' | 'text_to_morse' | 'morse_to_text' | 'listening';

/** Meta da sessão: duração fixa ou quantidade de caracteres respondidos. */
export type SessionKind = 'time' | 'characters';

interface ModeInfo {
  id: PracticeMode;
  title: MessageKey;
  description: MessageKey;
}

const MODES: readonly ModeInfo[] = [
  {
    id: 'key_capture',
    title: 'practice.modeKeyCapture',
    description: 'practice.modeKeyCaptureDesc',
  },
  {
    id: 'text_to_morse',
    title: 'practice.modeTextToMorse',
    description: 'practice.modeTextToMorseDesc',
  },
  {
    id: 'morse_to_text',
    title: 'practice.modeMorseToText',
    description: 'practice.modeMorseToTextDesc',
  },
  {
    id: 'listening',
    title: 'practice.modeListening',
    description: 'practice.modeListeningDesc',
  },
];

/** Valores selecionáveis na terceira barra, por tipo de sessão. */
const SESSION_VALUES: Record<SessionKind, readonly number[]> = {
  time: [15, 30, 60, 120],
  characters: [10, 15, 20, 25],
};

const DEFAULT_TIME_GOAL_S = 60;
const DEFAULT_CHARACTER_GOAL = 10;

interface Round {
  character: MorseCharacter;
  /** Valor exibido/enviado como `question`. */
  question: string;
  /** Valor enviado como `expected_answer`. */
  expected: string;
  /** Alternativas dos modos de escolha; `null` no key_capture. */
  options: string[] | null;
  startedAt: number;
}

const DEFAULT_PLAYBACK: MorsePlaybackSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
};

const FALLBACK_KEY = 'Space';
const FALLBACK_WPM = 20;
/** Piso do gap de auto-envio, para velocidades altas não engolirem a pausa. */
const MIN_SUBMIT_GAP_MS = 600;
const CLOCK_TICK_MS = 500;

@Component({
  selector: 'app-practice',
  imports: [Button, Divider, Heading],
  templateUrl: './practice.html',
  host: {
    class: 'flex flex-1 flex-col',
    '(window:keydown.enter)': 'advanceOnEnter($event)',
  },
})
export class Practice {
  readonly #charactersService = inject(MorseCharactersService);
  readonly #settings = inject(MorseSettingsService);
  readonly #audio = inject(MorseAudioService);
  readonly #input = inject(MorseInputService);
  readonly #practice = inject(PracticeService);
  readonly #destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);

  protected readonly modes = MODES;

  protected readonly characters = signal<MorseCharacter[] | null>(null);
  protected readonly charactersError = signal(false);

  protected readonly mode = signal<PracticeMode | null>(null);
  protected readonly round = signal<Round | null>(null);

  // Configuração da sessão (barras flutuantes, estilo monkeytype). Letras
  // sempre entram; pontuação e números são opcionais.
  protected readonly includePunctuation = signal(false);
  protected readonly includeNumbers = signal(false);
  protected readonly sessionKind = signal<SessionKind>('characters');
  readonly #timeGoalS = signal(DEFAULT_TIME_GOAL_S);
  readonly #characterGoal = signal(DEFAULT_CHARACTER_GOAL);

  protected readonly sessionValues = computed(() => SESSION_VALUES[this.sessionKind()]);
  protected readonly sessionGoal = computed(() =>
    this.sessionKind() === 'time' ? this.#timeGoalS() : this.#characterGoal(),
  );

  /** Caracteres sorteáveis conforme os filtros de conteúdo da primeira barra. */
  protected readonly pool = computed<MorseCharacter[] | null>(() => {
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

  /** Símbolos já capturados no round de key_capture (ex.: ".-"). */
  protected readonly symbols = signal('');
  protected readonly invalidPress = signal(false);

  protected readonly result = signal<PracticeRecord | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal(false);

  protected readonly finished = signal(false);
  protected readonly elapsedS = signal(0);
  protected readonly sessionTotal = signal(0);
  protected readonly sessionCorrect = signal(0);
  /** Soma dos tempos de resposta da sessão (ms) — base do cpm, como no backend. */
  readonly #sessionResponseMs = signal(0);

  protected readonly accuracy = computed(() => {
    const total = this.sessionTotal();
    return total === 0 ? null : Math.round((this.sessionCorrect() / total) * 100);
  });

  /** Caracteres por minuto, com a mesma fórmula do agregado do backend. */
  protected readonly sessionCpm = computed(() => {
    const total = this.sessionTotal();
    const responseMs = this.#sessionResponseMs();
    return total === 0 || responseMs === 0 ? null : (total * 60_000) / responseMs;
  });

  protected readonly modeTitle = computed(() => {
    const info = MODES.find((candidate) => candidate.id === this.mode());
    return info ? this.i18n.t(info.title) : '';
  });

  #pressDurations: number[] = [];
  #pendingAttempt: PracticeAttempt | null = null;
  #gapTimer: ReturnType<typeof setTimeout> | null = null;
  #clockTimer: ReturnType<typeof setInterval> | null = null;
  #sessionStartedAt = 0;

  constructor() {
    this.loadCharacters();
    const subscription = this.#input
      .onSymbolDetected()
      .subscribe((press) => this.#handlePress(press));
    this.#destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      this.#teardownRound();
      this.#stopClock();
    });
  }

  protected loadCharacters(): void {
    this.charactersError.set(false);
    this.characters.set(null);
    this.#charactersService.list().subscribe({
      next: (characters) => this.characters.set(characters),
      error: () => this.charactersError.set(true),
    });
  }

  protected selectMode(mode: PracticeMode): void {
    this.mode.set(mode);
    this.restartSession();
  }

  protected changeMode(): void {
    this.#teardownRound();
    this.#stopClock();
    this.mode.set(null);
    this.round.set(null);
    this.result.set(null);
    this.submitError.set(false);
    this.finished.set(false);
  }

  // Mudar qualquer configuração reinicia a sessão (como no monkeytype): os
  // contadores e o relógio voltam do zero com a nova configuração aplicada.

  protected togglePunctuation(): void {
    this.includePunctuation.update((value) => !value);
    this.restartSession();
  }

  protected toggleNumbers(): void {
    this.includeNumbers.update((value) => !value);
    this.restartSession();
  }

  protected setSessionKind(kind: SessionKind): void {
    if (this.sessionKind() === kind) {
      return;
    }
    this.sessionKind.set(kind);
    this.restartSession();
  }

  protected setSessionGoal(value: number): void {
    if (this.sessionGoal() === value) {
      return;
    }
    if (this.sessionKind() === 'time') {
      this.#timeGoalS.set(value);
    } else {
      this.#characterGoal.set(value);
    }
    this.restartSession();
  }

  protected restartSession(): void {
    this.finished.set(false);
    this.result.set(null);
    this.submitError.set(false);
    this.sessionTotal.set(0);
    this.sessionCorrect.set(0);
    this.#sessionResponseMs.set(0);
    this.#stopClock();
    this.elapsedS.set(0);
    this.startRound();
  }

  protected startRound(): void {
    const mode = this.mode();
    const pool = this.pool();
    if (!mode || !pool || pool.length === 0) {
      return;
    }

    this.#teardownRound();
    this.result.set(null);
    this.submitError.set(false);
    this.#pendingAttempt = null;
    this.#pressDurations = [];
    this.symbols.set('');
    this.invalidPress.set(false);

    const character = pool[Math.floor(Math.random() * pool.length)];
    this.round.set({
      character,
      question:
        mode === 'morse_to_text' || mode === 'listening' ? character.code : character.character,
      expected:
        mode === 'text_to_morse' || mode === 'key_capture' ? character.code : character.character,
      options: this.#buildOptions(mode, character, pool),
      startedAt: performance.now(),
    });

    if (mode === 'key_capture') {
      this.#input.startCapture();
    }
  }

  /** Enter aciona o Next na tela de resultado e o Restart no resumo da sessão. */
  protected advanceOnEnter(event: Event): void {
    if (this.finished()) {
      event.preventDefault();
      this.restartSession();
      return;
    }
    if (this.result() && !this.submitting()) {
      event.preventDefault();
      this.startRound();
    }
  }

  /** Resposta dos modos de escolha (texto→Morse, Morse→texto, listening). */
  protected answer(option: string): void {
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

  /** Reproduz o código do round atual (modo listening e replays). */
  protected playCode(): void {
    const round = this.round();
    if (round) {
      void this.#audio.playSequence(
        round.character.code,
        this.#settings.settings() ?? DEFAULT_PLAYBACK,
      );
    }
  }

  protected retrySubmit(): void {
    if (this.#pendingAttempt) {
      this.#submit(this.#pendingAttempt);
    }
  }

  protected inputKeyLabel(): string {
    return this.#settings.settings()?.input_key ?? FALLBACK_KEY;
  }

  /** Relógio do topo: regressivo na sessão por tempo, corrido na por caracteres. */
  protected clock(): string {
    const totalS =
      this.sessionKind() === 'time'
        ? Math.max(0, this.#timeGoalS() - this.elapsedS())
        : this.elapsedS();
    return this.#formatClock(totalS);
  }

  /** Tempo decorrido da sessão (exibido no resumo final). */
  protected elapsedClock(): string {
    return this.#formatClock(this.elapsedS());
  }

  protected cpmLabel(): string {
    const cpm = this.sessionCpm();
    return cpm === null ? '—' : `${cpm.toFixed(1)} cpm`;
  }

  /** Configuração da sessão exibida no resumo (ex.: "Characters · 10"). */
  protected sessionLabel(): string {
    const goal = this.sessionGoal();
    return this.sessionKind() === 'time' ? `Time · ${goal}s` : `Characters · ${goal}`;
  }

  #formatClock(totalS: number): string {
    const minutes = String(Math.floor(totalS / 60)).padStart(2, '0');
    const seconds = String(totalS % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  /** O relógio da sessão só começa a contar no primeiro input do usuário. */
  #startClockOnFirstInput(): void {
    if (this.#clockTimer !== null) {
      return;
    }
    this.#sessionStartedAt = performance.now();
    this.#clockTimer = setInterval(() => {
      const elapsed = Math.floor((performance.now() - this.#sessionStartedAt) / 1000);
      this.elapsedS.set(elapsed);
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
    this.#teardownRound();
    this.#stopClock();
    this.round.set(null);
    this.result.set(null);
    this.submitError.set(false);
    this.#pendingAttempt = null;
    this.finished.set(true);
  }

  #handlePress(press: MorsePressEvent): void {
    const round = this.round();
    if (this.mode() !== 'key_capture' || !round || this.result() || this.submitting()) {
      return;
    }

    this.#startClockOnFirstInput();

    if (press.symbol === null) {
      // O backend rejeitaria essa duração para o speed_wpm atual: descarta e avisa.
      this.invalidPress.set(true);
      return;
    }

    this.invalidPress.set(false);
    this.#pressDurations.push(press.durationMs);
    this.symbols.set(this.symbols() + press.symbol);

    if (this.#gapTimer !== null) {
      clearTimeout(this.#gapTimer);
    }
    this.#gapTimer = setTimeout(() => this.#submitKeyCapture(), this.#submitGapMs());
  }

  /** Pausa sem novos símbolos que encerra o caractere (gap de palavra, com piso). */
  #submitGapMs(): number {
    const speedWpm = this.#settings.settings()?.speed_wpm ?? FALLBACK_WPM;
    return Math.max(MIN_SUBMIT_GAP_MS, WORD_GAP_UNITS * unitMs(speedWpm));
  }

  #submitKeyCapture(): void {
    const round = this.round();
    if (!round || this.#pressDurations.length === 0) {
      return;
    }
    this.#submit({
      exercise_type: 'key_capture',
      input_method: this.inputKeyLabel(),
      question: round.question,
      expected_answer: round.expected,
      press_durations: [...this.#pressDurations],
      response_time: this.#responseTime(round),
    });
  }

  #submit(attempt: PracticeAttempt): void {
    this.#teardownRound();
    this.#pendingAttempt = attempt;
    this.submitting.set(true);
    this.submitError.set(false);

    this.#practice.submit(attempt).subscribe({
      next: (record) => {
        this.submitting.set(false);
        this.#pendingAttempt = null;
        this.sessionTotal.update((total) => total + 1);
        this.#sessionResponseMs.update((ms) => ms + record.response_time);
        if (record.correct) {
          this.sessionCorrect.update((correct) => correct + 1);
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
        this.result.set(record);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set(true);
      },
    });
  }

  #responseTime(round: Round): number {
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

  #teardownRound(): void {
    this.#input.stopCapture();
    if (this.#gapTimer !== null) {
      clearTimeout(this.#gapTimer);
      this.#gapTimer = null;
    }
  }
}
