import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { environment } from '../../environments/environment';

export type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth';

/** Preferências Morse do usuário — nomes de campo idênticos ao contrato da API. */
export interface UserMorseSettings {
  speed_wpm: number;
  frequency: number;
  volume: number;
  wave_type: WaveType;
  /** Tecla de captura (código KeyboardEvent.code), validada pelo backend contra a whitelist AllowedKey. */
  input_key: string;
}

/**
 * Mantém as preferências Morse do usuário em memória (nunca em localStorage),
 * carregadas uma vez após a autenticação e compartilhadas entre os serviços
 * de áudio e captura. A edição/gravação (PUT) é escopo da Fase 2.
 */
@Injectable({ providedIn: 'root' })
export class MorseSettingsService {
  readonly #http = inject(HttpClient);

  readonly #settings = signal<UserMorseSettings | null>(null);
  readonly settings = this.#settings.asReadonly();

  /** Dispara o carregamento das preferências; falha não bloqueia a sessão. */
  load(): void {
    this.#http.get<UserMorseSettings>(`${environment.apiUrl}/users/morse-settings`).subscribe({
      next: (settings) => this.#settings.set(settings),
      error: () => this.#settings.set(null),
    });
  }

  clear(): void {
    this.#settings.set(null);
  }
}
