import { Component, inject, signal } from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { MessageKey } from '../../core/i18n/messages';
import { ExerciseType } from '../../services/practice.service';
import {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardService,
} from '../../services/leaderboard.service';
import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';

/** Opções espelhando os choices/validators do backend — nunca substituindo-os. */
const SPEED_OPTIONS: readonly number[] = [5, 10, 15, 20, 25];

const EXERCISE_TYPE_OPTIONS: readonly { label: MessageKey; value: ExerciseType }[] = [
  { label: 'leaderboard.keyCapture', value: 'key_capture' },
  { label: 'dashboard.multipleChoice', value: 'multiple_choice' },
  { label: 'leaderboard.listening', value: 'listening' },
];

const PERIOD_OPTIONS: readonly { label: MessageKey; value: LeaderboardPeriod }[] = [
  { label: 'leaderboard.periodGeneral', value: 'general' },
  { label: 'leaderboard.periodWeekly', value: 'weekly' },
  { label: 'leaderboard.periodMonthly', value: 'monthly' },
];

@Component({
  selector: 'app-leaderboard',
  imports: [Button, Divider, Heading],
  templateUrl: './leaderboard.html',
  host: { class: 'flex flex-1 flex-col' },
})
export class Leaderboard {
  readonly #leaderboardService = inject(LeaderboardService);
  protected readonly i18n = inject(I18nService);

  protected readonly speedOptions = SPEED_OPTIONS;
  protected readonly exerciseTypeOptions = EXERCISE_TYPE_OPTIONS;
  protected readonly periodOptions = PERIOD_OPTIONS;

  protected readonly speedWpm = signal(20);
  protected readonly exerciseType = signal<ExerciseType>('key_capture');
  protected readonly period = signal<LeaderboardPeriod>('general');

  protected readonly entries = signal<LeaderboardEntry[] | null>(null);
  protected readonly error = signal(false);

  constructor() {
    this.load();
  }

  protected onSpeedChange(event: Event): void {
    this.speedWpm.set(Number((event.target as HTMLSelectElement).value));
    this.load();
  }

  protected onExerciseTypeChange(event: Event): void {
    this.exerciseType.set((event.target as HTMLSelectElement).value as ExerciseType);
    this.load();
  }

  protected onPeriodChange(event: Event): void {
    this.period.set((event.target as HTMLSelectElement).value as LeaderboardPeriod);
    this.load();
  }

  protected load(): void {
    this.error.set(false);
    this.entries.set(null);
    this.#leaderboardService
      .list({
        speed_wpm: this.speedWpm(),
        exercise_type: this.exerciseType(),
        period: this.period(),
      })
      .subscribe({
        next: (entries) => this.entries.set(entries),
        error: () => this.error.set(true),
      });
  }
}
