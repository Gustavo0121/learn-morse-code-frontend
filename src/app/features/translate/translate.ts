import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MorseAudioService, MorsePlaybackSettings } from '../../services/morse-audio.service';
import { MorseSettingsService } from '../../services/morse-settings.service';
import { morseToText, textToMorse } from '../../services/morse-translator';
import { Heading } from '../../shared/ui/heading/heading';

type Field = 'text' | 'morse';

/** Fallback para visitantes anônimos, sem preferências carregadas. */
const DEFAULT_PLAYBACK: MorsePlaybackSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
};

const COPIED_RESET_MS = 1500;

@Component({
  selector: 'app-translate',
  imports: [RouterLink, Heading],
  templateUrl: './translate.html',
  host: { class: 'flex flex-1 flex-col' },
})
export class Translate {
  readonly #audio = inject(MorseAudioService);
  readonly #settings = inject(MorseSettingsService);
  readonly #auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);

  protected readonly authenticated = this.#auth.isAuthenticated;

  protected readonly text = signal('');
  protected readonly morse = signal('');
  protected readonly source = signal<Field>('text');
  protected readonly copiedField = signal<Field | null>(null);

  readonly #textResult = computed(() => textToMorse(this.text()));
  readonly #morseResult = computed(() => morseToText(this.morse()));

  protected readonly derivedMorse = computed(() =>
    this.source() === 'text' ? this.#textResult().code : this.morse(),
  );
  protected readonly derivedText = computed(() =>
    this.source() === 'morse' ? this.#morseResult().text : this.text(),
  );
  protected readonly unsupported = computed(() =>
    this.source() === 'text' ? this.#textResult().unsupported : [],
  );
  protected readonly invalidTokens = computed(() =>
    this.source() === 'morse' ? this.#morseResult().invalidTokens : [],
  );

  protected onTextInput(event: Event): void {
    this.source.set('text');
    this.text.set((event.target as HTMLTextAreaElement).value);
  }

  protected onMorseInput(event: Event): void {
    this.source.set('morse');
    this.morse.set((event.target as HTMLTextAreaElement).value);
  }

  protected play(): void {
    void this.#audio.playSequence(
      this.derivedMorse(),
      this.#settings.settings() ?? DEFAULT_PLAYBACK,
    );
  }

  protected async copy(field: Field): Promise<void> {
    const value = field === 'text' ? this.derivedText() : this.derivedMorse();
    await navigator.clipboard.writeText(value);
    this.copiedField.set(field);
    setTimeout(() => this.copiedField.set(null), COPIED_RESET_MS);
  }
}
