import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

/** Caractere do alfabeto Morse — contrato de GET /api/morse-characters. */
export interface MorseCharacter {
  id: number;
  character: string;
  code: string;
  type: 'letter' | 'number' | 'punctuation';
}

@Injectable({ providedIn: 'root' })
export class MorseCharactersService {
  readonly #http = inject(HttpClient);

  #characters$: Observable<MorseCharacter[]> | null = null;

  /**
   * Alfabeto Morse, ordenado por tipo e caractere. Conteúdo estático: a
   * primeira resposta é cacheada; uma falha descarta o cache para permitir
   * nova tentativa.
   */
  list(): Observable<MorseCharacter[]> {
    this.#characters$ ??= this.#http
      .get<MorseCharacter[]>(`${environment.apiUrl}/morse-characters`)
      .pipe(
        catchError((error: unknown) => {
          this.#characters$ = null;
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.#characters$;
  }
}
