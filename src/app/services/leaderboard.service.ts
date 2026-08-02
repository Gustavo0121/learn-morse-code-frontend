import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ExerciseType } from './practice.service';

export type LeaderboardPeriod = 'general' | 'weekly' | 'monthly';

export interface LeaderboardFilters {
  speed_wpm: number;
  exercise_type: ExerciseType;
  period: LeaderboardPeriod;
}

/** Uma posição do ranking — contrato de GET /api/leaderboard. */
export interface LeaderboardEntry {
  position: number;
  username: string;
  /** Fração 0.0–1.0. */
  accuracy: number;
  /** Caracteres por minuto. */
  cpm: number;
  /** `accuracy * 100 + cpm` — calculada no backend. */
  score: number;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  readonly #http = inject(HttpClient);

  list(filters: LeaderboardFilters): Observable<LeaderboardEntry[]> {
    const params = new HttpParams()
      .set('speed_wpm', filters.speed_wpm)
      .set('exercise_type', filters.exercise_type)
      .set('period', filters.period);
    return this.#http.get<LeaderboardEntry[]>(`${environment.apiUrl}/leaderboard`, { params });
  }
}
