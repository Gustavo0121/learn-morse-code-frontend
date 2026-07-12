import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

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

interface AllowedKeyDto {
  code: string;
}

/**
 * Mantém as preferências Morse do usuário em memória (nunca em localStorage),
 * carregadas uma vez após a autenticação e compartilhadas entre os serviços
 * de áudio e captura.
 */
@Injectable({ providedIn: 'root' })
export class MorseSettingsService {
  readonly #http = inject(HttpClient);

  readonly #settings = signal<UserMorseSettings | null>(null);
  readonly settings = this.#settings.asReadonly();

  /**
   * Whitelist de teclas aceitas para `input_key`, obtida do backend — a mesma
   * lista que o servidor usa para validar. `null` enquanto não carregada (ou
   * em falha de carregamento).
   */
  readonly #allowedKeys = signal<readonly string[] | null>(null);
  readonly allowedKeys = this.#allowedKeys.asReadonly();

  /** Dispara o carregamento das preferências; falha não bloqueia a sessão. */
  load(): void {
    this.#http.get<UserMorseSettings>(`${environment.apiUrl}/users/morse-settings`).subscribe({
      next: (settings) => this.#settings.set(settings),
      error: () => this.#settings.set(null),
    });
  }

  /** Persiste as preferências; o estado local só muda com a resposta do backend. */
  save(settings: UserMorseSettings): Observable<UserMorseSettings> {
    return this.#http
      .put<UserMorseSettings>(`${environment.apiUrl}/users/morse-settings`, settings)
      .pipe(tap((saved) => this.#settings.set(saved)));
  }

  loadAllowedKeys(): void {
    this.#http.get<AllowedKeyDto[]>(`${environment.apiUrl}/morse-settings/allowed-keys`).subscribe({
      next: (keys) => this.#allowedKeys.set(keys.map((key) => key.code)),
      error: () => this.#allowedKeys.set(null),
    });
  }

  clear(): void {
    this.#settings.set(null);
    this.#allowedKeys.set(null);
  }
}
