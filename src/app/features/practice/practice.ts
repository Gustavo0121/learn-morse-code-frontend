import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

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

interface ModeInfo {
  id: PracticeMode;
  title: string;
  description: string;
}

const MODES: readonly ModeInfo[] = [
  {
    id: 'key_capture',
    title: 'Key capture',
    description: 'Veja o caractere e transmita o código com a tecla configurada.',
  },
  {
    id: 'text_to_morse',
    title: 'Texto → Morse',
    description: 'Escolha o código correspondente ao caractere.',
  },
  {
    id: 'morse_to_text',
    title: 'Morse → Texto',
    description: 'Escolha o caractere correspondente ao código.',
  },
  {
    id: 'listening',
    title: 'Listening',
    description: 'Ouça o código e identifique o caractere.',
  },
];

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
  host: { class: 'flex flex-1 flex-col' },
})
export class Practice {
  readonly #charactersService = inject(MorseCharactersService);
  readonly #settings = inject(MorseSettingsService);
  readonly #audio = inject(MorseAudioService);
  readonly #input = inject(MorseInputService);
  readonly #practice = inject(PracticeService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly modes = MODES;

  protected readonly characters = signal<MorseCharacter[] | null>(null);
  protected readonly charactersError = signal(false);

  protected readonly mode = signal<PracticeMode | null>(null);
  protected readonly round = signal<Round | null>(null);

  /** Símbolos já capturados no round de key_capture (ex.: ".-"). */
  protected readonly symbols = signal('');
  protected readonly invalidPress = signal(false);

  protected readonly result = signal<PracticeRecord | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal(false);

  protected readonly elapsedS = signal(0);
  readonly #sessionTotal = signal(0);
  readonly #sessionCorrect = signal(0);

  protected readonly accuracy = computed(() => {
    const total = this.#sessionTotal();
    return total === 0 ? null : Math.round((this.#sessionCorrect() / total) * 100);
  });

  protected readonly modeTitle = computed(
    () => MODES.find((info) => info.id === this.mode())?.title ?? '',
  );

  #pressDurations: number[] = [];
  #pendingAttempt: PracticeAttempt | null = null;
  #gapTimer: ReturnType<typeof setTimeout> | null = null;
  #clockTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadCharacters();
    const subscription = this.#input
      .onSymbolDetected()
      .subscribe((press) => this.#handlePress(press));
    this.#destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      this.#teardownRound();
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
    this.#sessionTotal.set(0);
    this.#sessionCorrect.set(0);
    this.startRound();
  }

  protected changeMode(): void {
    this.#teardownRound();
    this.mode.set(null);
    this.round.set(null);
    this.result.set(null);
    this.submitError.set(false);
  }

  protected startRound(): void {
    const mode = this.mode();
    const characters = this.characters();
    if (!mode || !characters || characters.length === 0) {
      return;
    }

    this.#teardownRound();
    this.result.set(null);
    this.submitError.set(false);
    this.#pendingAttempt = null;
    this.#pressDurations = [];
    this.symbols.set('');
    this.invalidPress.set(false);

    const character = characters[Math.floor(Math.random() * characters.length)];
    this.round.set({
      character,
      question:
        mode === 'morse_to_text' || mode === 'listening' ? character.code : character.character,
      expected:
        mode === 'text_to_morse' || mode === 'key_capture' ? character.code : character.character,
      options: this.#buildOptions(mode, character, characters),
      startedAt: performance.now(),
    });

    this.elapsedS.set(0);
    this.#clockTimer = setInterval(() => {
      const round = this.round();
      if (round) {
        this.elapsedS.set(Math.floor((performance.now() - round.startedAt) / 1000));
      }
    }, CLOCK_TICK_MS);

    if (mode === 'key_capture') {
      this.#input.startCapture();
    }
  }

  /** Resposta dos modos de escolha (texto→Morse, Morse→texto, listening). */
  protected answer(option: string): void {
    const mode = this.mode();
    const round = this.round();
    if (!mode || !round || this.result() || this.submitting()) {
      return;
    }
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

  protected clock(): string {
    const total = this.elapsedS();
    const minutes = String(Math.floor(total / 60)).padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  #handlePress(press: MorsePressEvent): void {
    const round = this.round();
    if (this.mode() !== 'key_capture' || !round || this.result() || this.submitting()) {
      return;
    }

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
        this.result.set(record);
        this.#sessionTotal.update((total) => total + 1);
        if (record.correct) {
          this.#sessionCorrect.update((correct) => correct + 1);
        }
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
    if (this.#clockTimer !== null) {
      clearInterval(this.#clockTimer);
      this.#clockTimer = null;
    }
  }
}
