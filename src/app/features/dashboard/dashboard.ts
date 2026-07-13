import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { PracticeRecord, PracticeService } from '../../services/practice.service';
import { StatisticsService, UserStatistics } from '../../services/statistics.service';
import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';

/** Quantos registros do histórico aparecem no bloco "últimos treinamentos". */
const RECENT_LIMIT = 8;

interface StatItem {
  label: string;
  value: string;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  if (minutes > 0) {
    return `${minutes}min ${seconds}s`;
  }
  return `${seconds}s`;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink, Button, Divider, Heading],
  templateUrl: './dashboard.html',
  host: { class: 'flex flex-1 flex-col' },
})
export class Dashboard {
  readonly #auth = inject(AuthService);
  readonly #statisticsService = inject(StatisticsService);
  readonly #practiceService = inject(PracticeService);
  protected readonly i18n = inject(I18nService);

  /** Nome do usuário como título editorial; "Dashboard" desce para o eyebrow. */
  protected readonly heading = computed(() => {
    const user = this.#auth.currentUser();
    return user
      ? { text: user.username, eyebrow: 'Dashboard' }
      : { text: 'Dashboard', eyebrow: '' };
  });

  protected readonly stats = signal<UserStatistics | null>(null);
  protected readonly statsError = signal(false);

  protected readonly history = signal<PracticeRecord[] | null>(null);
  protected readonly historyError = signal(false);

  protected readonly statItems = computed<StatItem[] | null>(() => {
    const stats = this.stats();
    if (!stats) {
      return null;
    }
    const hasAttempts = stats.characters_seen > 0;
    return [
      {
        label: this.i18n.t('common.accuracy'),
        value: hasAttempts ? `${Math.round(stats.accuracy * 100)}%` : '—',
      },
      {
        label: this.i18n.t('dashboard.statSpeed'),
        value: hasAttempts ? `${stats.average_speed.toFixed(1)} cpm` : '—',
      },
      {
        label: this.i18n.t('dashboard.statTrainingTime'),
        value: formatDuration(stats.training_time),
      },
      {
        label: this.i18n.t('dashboard.statCorrect'),
        value: `${stats.characters_correct}/${stats.characters_seen}`,
      },
    ];
  });

  /** Histórico já vem do backend ordenado do mais recente para o mais antigo. */
  protected readonly recent = computed<PracticeRecord[] | null>(() => {
    const history = this.history();
    return history && history.slice(0, RECENT_LIMIT);
  });

  constructor() {
    this.loadStats();
    this.loadHistory();
  }

  protected loadStats(): void {
    this.statsError.set(false);
    this.stats.set(null);
    this.#statisticsService.get().subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => this.statsError.set(true),
    });
  }

  protected loadHistory(): void {
    this.historyError.set(false);
    this.history.set(null);
    this.#practiceService.history().subscribe({
      next: (records) => this.history.set(records),
      error: () => this.historyError.set(true),
    });
  }

  protected exerciseLabel(record: PracticeRecord): string {
    if (record.exercise_type === 'multiple_choice') {
      return this.i18n.t('dashboard.multipleChoice');
    }
    return record.exercise_type === 'key_capture' ? 'Key capture' : 'Listening';
  }

  protected seconds(ms: number): string {
    return `${(ms / 1000).toFixed(1)}s`;
  }
}
