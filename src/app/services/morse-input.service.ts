import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { MorseSettingsService } from './morse-settings.service';
import { MorseSymbol, classifyPress } from './morse-timing';

export interface MorsePressEvent {
  /**
   * Símbolo classificado com o mesmo limiar do backend; `null` quando a
   * duração seria rejeitada pelo servidor para o `speed_wpm` atual — a UI
   * deve sinalizar entrada inválida em vez de aceitar o símbolo.
   */
  symbol: MorseSymbol | null;
  durationMs: number;
}

const FALLBACK_KEY = 'Space';
const FALLBACK_WPM = 20;

/**
 * Captura de código Morse via teclado: mede a duração entre `keydown` e
 * `keyup` da tecla configurada e emite o símbolo classificado
 * (`morse-timing.ts` — mesma fórmula baseada em `speed_wpm` que o backend
 * usa para validar `press_durations`).
 *
 * A tecla e a velocidade vêm de `MorseSettingsService`; `setInputKey()`
 * permite sobrepô-la em tempo de execução (ex.: testar um rascunho ainda não
 * salvo). Consumidores devem chamar `stopCapture()` ao sair da tela.
 */
@Injectable({ providedIn: 'root' })
export class MorseInputService {
  readonly #settings = inject(MorseSettingsService);

  readonly #presses = new Subject<MorsePressEvent>();

  readonly #capturing = signal(false);
  readonly capturing = this.#capturing.asReadonly();

  #explicitKey: string | null = null;
  #pressStartMs: number | null = null;
  #activeCode: string | null = null;

  startCapture(): void {
    if (this.#capturing()) {
      return;
    }
    window.addEventListener('keydown', this.#onKeyDown);
    window.addEventListener('keyup', this.#onKeyUp);
    window.addEventListener('blur', this.#onBlur);
    this.#capturing.set(true);
  }

  stopCapture(): void {
    if (!this.#capturing()) {
      return;
    }
    window.removeEventListener('keydown', this.#onKeyDown);
    window.removeEventListener('keyup', this.#onKeyUp);
    window.removeEventListener('blur', this.#onBlur);
    this.#resetPress();
    this.#capturing.set(false);
  }

  /** Sobrepõe a tecla das preferências; `null` volta a usá-las. */
  setInputKey(code: string | null): void {
    this.#explicitKey = code;
    this.#resetPress();
  }

  onSymbolDetected(): Observable<MorsePressEvent> {
    return this.#presses.asObservable();
  }

  get #inputKey(): string {
    return this.#explicitKey ?? this.#settings.settings()?.input_key ?? FALLBACK_KEY;
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== this.#inputKey) {
      return;
    }
    // A tecla de captura não deve rolar a página (Space) nem submeter forms.
    event.preventDefault();
    if (event.repeat || this.#pressStartMs !== null) {
      return;
    }
    this.#pressStartMs = performance.now();
    this.#activeCode = event.code;
  };

  readonly #onKeyUp = (event: KeyboardEvent): void => {
    // Compara com a tecla que iniciou o pressionamento, para não perder o
    // keyup se a tecla configurada mudar no meio de uma pressão.
    if (this.#pressStartMs === null || event.code !== this.#activeCode) {
      return;
    }
    event.preventDefault();
    const durationMs = performance.now() - this.#pressStartMs;
    this.#resetPress();

    const speedWpm = this.#settings.settings()?.speed_wpm ?? FALLBACK_WPM;
    this.#presses.next({ symbol: classifyPress(durationMs, speedWpm), durationMs });
  };

  /** Janela perdeu o foco no meio da pressão: o keyup nunca virá — descarta. */
  readonly #onBlur = (): void => {
    this.#resetPress();
  };

  #resetPress(): void {
    this.#pressStartMs = null;
    this.#activeCode = null;
  }
}
