import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { MorseCharacter } from './morse-characters.service';

/** Lição da trilha — contrato de GET /api/lessons e /api/lessons/{id}. */
export interface Lesson {
  id: number;
  title: string;
  description: string;
  difficulty: number;
  order: number;
  /** Conteúdo da lição: caracteres usados no treino guiado. */
  characters: MorseCharacter[];
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class LessonsService {
  readonly #http = inject(HttpClient);

  /** Lições já vêm ordenadas pela posição na trilha (`order`). */
  list(): Observable<Lesson[]> {
    return this.#http.get<Lesson[]>(`${environment.apiUrl}/lessons`);
  }

  get(id: number | string): Observable<Lesson> {
    return this.#http.get<Lesson>(`${environment.apiUrl}/lessons/${id}`);
  }
}
