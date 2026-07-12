import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type ExerciseType = 'key_capture' | 'multiple_choice' | 'listening';

/**
 * Payload de POST /api/practice/history — nomes de campo exatamente como no
 * contrato. `correct` nunca é enviado (calculado no backend). Para
 * `key_capture`, enviar `press_durations` + `input_method` e omitir
 * `user_answer`: o servidor revalida as durações contra o `speed_wpm` do
 * usuário e deriva a resposta sozinho.
 */
export interface PracticeAttempt {
  exercise_type: ExerciseType;
  question: string;
  expected_answer: string;
  response_time: number;
  input_method?: string;
  user_answer?: string;
  press_durations?: number[];
}

export interface PracticeRecord {
  id: number;
  exercise_type: ExerciseType;
  input_method: string | null;
  question: string;
  expected_answer: string;
  user_answer: string;
  correct: boolean;
  response_time: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class PracticeService {
  readonly #http = inject(HttpClient);

  submit(attempt: PracticeAttempt): Observable<PracticeRecord> {
    return this.#http.post<PracticeRecord>(`${environment.apiUrl}/practice/history`, attempt);
  }

  /** Histórico do usuário, mais recente primeiro (consumido no dashboard). */
  history(): Observable<PracticeRecord[]> {
    return this.#http.get<PracticeRecord[]>(`${environment.apiUrl}/practice/history`);
  }
}
