import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/**
 * Agregado de desempenho — contrato de GET /api/users/statistics. Calculado
 * exclusivamente no backend a partir do histórico de prática; usuários sem
 * histórico recebem o registro zerado (nunca 404).
 */
export interface UserStatistics {
  /** Tentativas registradas. */
  characters_seen: number;
  characters_correct: number;
  /** Fração 0.0–1.0. */
  accuracy: number;
  /** Caracteres por minuto, derivada do tempo total de resposta. */
  average_speed: number;
  /** Soma dos tempos de resposta, em ms. */
  training_time: number;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  readonly #http = inject(HttpClient);

  get(): Observable<UserStatistics> {
    return this.#http.get<UserStatistics>(`${environment.apiUrl}/users/statistics`);
  }
}
