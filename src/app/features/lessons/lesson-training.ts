import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../../core/i18n/i18n.service';
import { MessageKey } from '../../core/i18n/messages';
import { KeyCaptureResult, KeyCaptureService } from '../../services/key-capture.service';
import { Lesson, LessonsService } from '../../services/lessons.service';
import { MorseAudioService, MorsePlaybackSettings } from '../../services/morse-audio.service';
import { MorseCharacter } from '../../services/morse-characters.service';
import { MorseSettingsService } from '../../services/morse-settings.service';
import { PracticeAttempt, PracticeRecord, PracticeService } from '../../services/practice.service';
import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';
import { KeyCapture } from '../../shared/ui/key-capture/key-capture';

type TrainingMode = 'text_to_morse' | 'morse_to_text' | 'listening' | 'key_capture';

/**
 * Sequência fixa do treino guiado: do reconhecimento (ver o código) à
 * produção (transmitir na tecla), passando pela escuta.
 */
const MODE_SEQUENCE: readonly TrainingMode[] = [
  'text_to_morse',
  'morse_to_text',
  'listening',
  'key_capture',
];

const MODE_INSTRUCTIONS: Record<TrainingMode, MessageKey> = {
  text_to_morse: 'practice.whichCode',
  morse_to_text: 'practice.whichCharacter',
  listening: 'practice.listenIdentify',
  key_capture: 'practice.transmit',
};

type Stage = 'study' | 'exercise' | 'done';

interface Step {
  mode: TrainingMode;
  character: MorseCharacter;
  /** Valor exibido/enviado como `question`. */
  question: string;
  /** Valor enviado como `expected_answer`. */
  expected: string;
  /** Alternativas dos modos de escolha; `null` no key_capture. */
  options: string[] | null;
}

const DEFAULT_PLAYBACK: MorsePlaybackSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
};

/**
 * Treino guiado da lição: mix dos quatro modos de prática, restrito aos
 * caracteres da lição. Cada tentativa é registrada no histórico de prática
 * com o mesmo contrato do módulo de prática livre.
 */
@Component({
  selector: 'app-lesson-training',
  imports: [RouterLink, Button, Divider, Heading, KeyCapture],
  providers: [KeyCaptureService],
  templateUrl: './lesson-training.html',
  host: {
    class: 'flex flex-1 flex-col',
    '(window:keydown.enter)': 'advanceOnEnter($event)',
  },
})
export class LessonTraining {
  readonly #lessonsService = inject(LessonsService);
  readonly #settings = inject(MorseSettingsService);
  readonly #audio = inject(MorseAudioService);
  readonly #capture = inject(KeyCaptureService);
  readonly #practice = inject(PracticeService);
  readonly #destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);

  /** Vem da rota (`/lessons/:id/train`) via component input binding. */
  readonly id = input.required<string>();

  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly error = signal(false);

  protected readonly stage = signal<Stage>('study');
  protected readonly steps = signal<Step[]>([]);
  protected readonly index = signal(0);
  readonly #stepStartedAt = signal(0);

  protected readonly result = signal<PracticeRecord | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal(false);

  protected readonly totalAnswered = signal(0);
  protected readonly totalCorrect = signal(0);

  protected readonly step = computed<Step | null>(() => this.steps()[this.index()] ?? null);

  protected readonly accuracy = computed(() => {
    const total = this.totalAnswered();
    return total === 0 ? null : Math.round((this.totalCorrect() / total) * 100);
  });

  protected readonly instruction = computed(() => {
    const step = this.step();
    return step ? this.i18n.t(MODE_INSTRUCTIONS[step.mode]) : '';
  });

  #pendingAttempt: PracticeAttempt | null = null;

  constructor() {
    effect(() => this.load(this.id()));
    const subscription = this.#capture
      .onCapture()
      .subscribe((result) => this.#submitKeyCapture(result));
    this.#destroyRef.onDestroy(() => {
      subscription.unsubscribe();
      this.#capture.stop();
    });
  }

  protected load(id: string): void {
    this.error.set(false);
    this.lesson.set(null);
    this.#lessonsService.get(id).subscribe({
      next: (lesson) => this.lesson.set(lesson),
      error: () => this.error.set(true),
    });
  }

  /** Monta a sequência (cada bloco de modo percorre a lição embaralhada). */
  protected start(): void {
    const lesson = this.lesson();
    if (!lesson || lesson.characters.length === 0) {
      return;
    }

    const steps = MODE_SEQUENCE.flatMap((mode) =>
      this.#shuffle(lesson.characters).map((character) => this.#buildStep(mode, character, lesson)),
    );
    this.steps.set(steps);
    this.index.set(0);
    this.totalAnswered.set(0);
    this.totalCorrect.set(0);
    this.stage.set('exercise');
    this.#enterStep();
  }

  /** Avança para o próximo passo; ao final, mostra o resumo do treino. */
  protected next(): void {
    if (this.index() + 1 >= this.steps().length) {
      this.#capture.stop();
      this.result.set(null);
      this.stage.set('done');
      return;
    }
    this.index.update((value) => value + 1);
    this.#enterStep();
  }

  /** Enter conduz o fluxo: começa, avança no resultado e reinicia no fim. */
  protected advanceOnEnter(event: Event): void {
    if (this.stage() === 'study' && this.lesson()) {
      event.preventDefault();
      this.start();
      return;
    }
    if (this.stage() === 'done') {
      event.preventDefault();
      this.start();
      return;
    }
    if (this.result() && !this.submitting()) {
      event.preventDefault();
      this.next();
    }
  }

  /** Resposta dos passos de escolha (texto→Morse, Morse→texto, listening). */
  protected answer(option: string): void {
    const step = this.step();
    if (!step || this.result() || this.submitting()) {
      return;
    }
    this.#submit({
      exercise_type: step.mode === 'listening' ? 'listening' : 'multiple_choice',
      question: step.question,
      expected_answer: step.expected,
      user_answer: option,
      response_time: this.#responseTime(),
    });
  }

  /** Reproduz o código do caractere (estudo, listening e replays). */
  protected play(character: MorseCharacter): void {
    void this.#audio.playSequence(character.code, this.#settings.settings() ?? DEFAULT_PLAYBACK);
  }

  protected retrySubmit(): void {
    if (this.#pendingAttempt) {
      this.#submit(this.#pendingAttempt);
    }
  }

  protected progress(): string {
    return `${this.index() + 1}/${this.steps().length}`;
  }

  #buildStep(mode: TrainingMode, character: MorseCharacter, lesson: Lesson): Step {
    return {
      mode,
      character,
      question:
        mode === 'morse_to_text' || mode === 'listening' ? character.code : character.character,
      expected:
        mode === 'text_to_morse' || mode === 'key_capture' ? character.code : character.character,
      options: this.#buildOptions(mode, character, lesson.characters),
    };
  }

  #enterStep(): void {
    this.#capture.stop();
    this.result.set(null);
    this.submitError.set(false);
    this.#pendingAttempt = null;
    this.#stepStartedAt.set(performance.now());

    if (this.step()?.mode === 'key_capture') {
      this.#capture.start();
    }
  }

  /** Pausa de auto-envio detectada pelo `KeyCaptureService`: fecha o attempt. */
  #submitKeyCapture(result: KeyCaptureResult): void {
    const step = this.step();
    if (!step) {
      return;
    }
    this.#submit({
      exercise_type: 'key_capture',
      ...result,
      question: step.question,
      expected_answer: step.expected,
      response_time: this.#responseTime(),
    });
  }

  #submit(attempt: PracticeAttempt): void {
    this.#capture.stop();
    this.#pendingAttempt = attempt;
    this.submitting.set(true);
    this.submitError.set(false);

    this.#practice.submit(attempt).subscribe({
      next: (record) => {
        this.submitting.set(false);
        this.#pendingAttempt = null;
        this.totalAnswered.update((total) => total + 1);
        if (record.correct) {
          this.totalCorrect.update((correct) => correct + 1);
        }
        this.result.set(record);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set(true);
      },
    });
  }

  #responseTime(): number {
    return Math.max(1, Math.round(performance.now() - this.#stepStartedAt()));
  }

  #buildOptions(
    mode: TrainingMode,
    character: MorseCharacter,
    characters: MorseCharacter[],
  ): string[] | null {
    if (mode === 'key_capture') {
      return null;
    }
    const others = characters.filter((other) => other.id !== character.id);
    const pick = (item: MorseCharacter): string =>
      mode === 'text_to_morse' ? item.code : item.character;

    const distractors = this.#shuffle(others.map(pick)).slice(0, 3);
    return this.#shuffle([pick(character), ...distractors]);
  }

  #shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
