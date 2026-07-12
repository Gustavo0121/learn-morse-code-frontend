import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../../core/i18n/i18n.service';
import { Lesson, LessonsService } from '../../services/lessons.service';
import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';

@Component({
  selector: 'app-lessons',
  imports: [RouterLink, Button, Divider, Heading],
  templateUrl: './lessons.html',
  host: { class: 'flex flex-1 flex-col' },
})
export class Lessons {
  readonly #lessonsService = inject(LessonsService);
  protected readonly i18n = inject(I18nService);

  protected readonly lessons = signal<Lesson[] | null>(null);
  protected readonly error = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.error.set(false);
    this.lessons.set(null);
    this.#lessonsService.list().subscribe({
      next: (lessons) => this.lessons.set(lessons),
      error: () => this.error.set(true),
    });
  }

  protected pad(order: number): string {
    return String(order).padStart(2, '0');
  }
}
