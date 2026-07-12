import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../../core/i18n/i18n.service';
import { MessageKey } from '../../core/i18n/messages';
import { Lesson, LessonsService } from '../../services/lessons.service';
import { MorseAudioService, MorsePlaybackSettings } from '../../services/morse-audio.service';
import { MorseCharacter, MorseCharactersService } from '../../services/morse-characters.service';
import { MorseSettingsService } from '../../services/morse-settings.service';
import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';

const TYPE_LABELS: Record<MorseCharacter['type'], MessageKey> = {
  letter: 'lessonDetail.letters',
  number: 'lessonDetail.numbers',
  punctuation: 'lessonDetail.punctuation',
};

/** Fallback para ouvir os caracteres antes de as preferências carregarem. */
const DEFAULT_PLAYBACK: MorsePlaybackSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
};

interface CharacterGroup {
  label: MessageKey;
  items: MorseCharacter[];
}

@Component({
  selector: 'app-lesson-detail',
  imports: [RouterLink, Button, Divider, Heading],
  templateUrl: './lesson-detail.html',
  host: { class: 'flex flex-1 flex-col' },
})
export class LessonDetail {
  readonly #lessonsService = inject(LessonsService);
  readonly #charactersService = inject(MorseCharactersService);
  readonly #audio = inject(MorseAudioService);
  readonly #settings = inject(MorseSettingsService);
  protected readonly i18n = inject(I18nService);

  /** Vem da rota (`/lessons/:id`) via component input binding. */
  readonly id = input.required<string>();

  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly error = signal(false);

  protected readonly characters = signal<MorseCharacter[] | null>(null);
  protected readonly charactersError = signal(false);

  protected readonly groups = computed<CharacterGroup[] | null>(() => {
    const characters = this.characters();
    if (!characters) {
      return null;
    }
    return (Object.keys(TYPE_LABELS) as MorseCharacter['type'][])
      .map((type) => ({
        label: TYPE_LABELS[type],
        items: characters.filter((character) => character.type === type),
      }))
      .filter((group) => group.items.length > 0);
  });

  constructor() {
    effect(() => this.load(this.id()));
    this.loadCharacters();
  }

  protected load(id: string): void {
    this.error.set(false);
    this.lesson.set(null);
    this.#lessonsService.get(id).subscribe({
      next: (lesson) => this.lesson.set(lesson),
      error: () => this.error.set(true),
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

  /** Toca o código do caractere com as preferências do usuário. */
  protected play(character: MorseCharacter): void {
    void this.#audio.playSequence(character.code, this.#settings.settings() ?? DEFAULT_PLAYBACK);
  }

  protected pad(order: number): string {
    return String(order).padStart(2, '0');
  }
}
