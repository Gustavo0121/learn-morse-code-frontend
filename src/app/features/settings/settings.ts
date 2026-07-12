import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';

import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';
import { MorseAudioService } from '../../services/morse-audio.service';
import {
  MorseSettingsService,
  UserMorseSettings,
  WaveType,
} from '../../services/morse-settings.service';

/** Opções espelhando os choices/validators do backend — nunca substituindo-os. */
const SPEED_OPTIONS: readonly number[] = [5, 10, 15, 20, 30, 40, 60];
const FREQUENCY_OPTIONS = [
  { label: 'Grave', value: 400 },
  { label: 'Médio', value: 700 },
  { label: 'Agudo', value: 1000 },
] as const;
const WAVE_OPTIONS: readonly WaveType[] = ['sine', 'square', 'triangle', 'sawtooth'];

/** Amostra tocada pelo "Test sound": LMC em Morse — demonstra timbre e velocidade. */
const TEST_SEQUENCE = '.-.. -- -.-.';

interface Feedback {
  kind: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-settings',
  imports: [Button, Divider, Heading],
  templateUrl: './settings.html',
  host: { class: 'flex flex-1 flex-col' },
})
export class Settings {
  readonly #settingsService = inject(MorseSettingsService);
  readonly #audio = inject(MorseAudioService);

  protected readonly speedOptions = SPEED_OPTIONS;
  protected readonly frequencyOptions = FREQUENCY_OPTIONS;
  protected readonly waveOptions = WAVE_OPTIONS;

  protected readonly saved = this.#settingsService.settings;
  protected readonly allowedKeys = this.#settingsService.allowedKeys;

  /** Rascunho editável; só vira estado compartilhado após salvar no backend. */
  protected readonly draft = signal<UserMorseSettings | null>(null);
  protected readonly confirming = signal(false);
  protected readonly saving = signal(false);
  protected readonly feedback = signal<Feedback | null>(null);

  readonly #touched = signal(false);

  protected readonly dirty = computed(() => {
    const saved = this.saved();
    const draft = this.draft();
    if (!saved || !draft) {
      return false;
    }
    return (Object.keys(saved) as (keyof UserMorseSettings)[]).some(
      (key) => saved[key] !== draft[key],
    );
  });

  constructor() {
    this.#settingsService.loadAllowedKeys();
    if (!this.saved()) {
      this.#settingsService.load();
    }
    // Preenche o rascunho quando as preferências chegam, sem sobrescrever edições.
    effect(() => {
      const saved = this.saved();
      if (saved && !this.#touched()) {
        this.draft.set({ ...saved });
      }
    });
  }

  protected update<K extends keyof UserMorseSettings>(key: K, value: UserMorseSettings[K]): void {
    const draft = this.draft();
    if (!draft) {
      return;
    }
    this.#touched.set(true);
    this.confirming.set(false);
    this.feedback.set(null);
    this.draft.set({ ...draft, [key]: value });
  }

  protected onVolumeInput(event: Event): void {
    this.update('volume', Number((event.target as HTMLInputElement).value));
  }

  /** Primeira interação do usuário: aqui (e só aqui) o AudioContext é iniciado. */
  protected testSound(): void {
    const draft = this.draft();
    if (draft) {
      void this.#audio.playSequence(TEST_SEQUENCE, draft);
    }
  }

  protected requestSave(): void {
    if (this.dirty() && !this.saving()) {
      this.feedback.set(null);
      this.confirming.set(true);
    }
  }

  protected cancelSave(): void {
    this.confirming.set(false);
  }

  protected confirmSave(): void {
    const draft = this.draft();
    if (!draft || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.#settingsService.save(draft).subscribe({
      next: () => {
        this.saving.set(false);
        this.confirming.set(false);
        this.feedback.set({ kind: 'success', text: 'Preferências salvas.' });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.confirming.set(false);
        this.feedback.set({ kind: 'error', text: this.#messageFor(error) });
      },
    });
  }

  protected optionClass(selected: boolean): string {
    const base =
      'cursor-pointer border px-4 py-2 font-display text-xs font-bold uppercase tracking-wide-caps transition-colors';
    return selected
      ? `${base} border-ink bg-ink text-canvas`
      : `${base} border-line text-ink-muted hover:border-ink hover:text-ink`;
  }

  #messageFor(error: unknown): string {
    if (
      error instanceof HttpErrorResponse &&
      error.status === 400 &&
      typeof error.error === 'object' &&
      error.error !== null
    ) {
      const messages = Object.values(error.error as Record<string, unknown>)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === 'string');
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }
    return 'Não foi possível salvar. Tente novamente.';
  }
}
