import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { MorseSettingsService } from './morse-settings.service';
import { MorseSymbol, classifyPress } from './morse-timing';

/** Origem do pressionamento — decide o `input_method` enviado ao backend. */
export type MorsePressSource = 'keyboard' | 'touch';

export interface MorsePressEvent {
  /**
   * Símbolo classificado com o mesmo limiar do backend; `null` quando a
   * duração seria rejeitada pelo servidor para o `speed_wpm` atual — a UI
   * deve sinalizar entrada inválida em vez de aceitar o símbolo.
   */
  symbol: MorseSymbol | null;
  durationMs: number;
  source: MorsePressSource;
}

const FALLBACK_KEY = 'Space';
const FALLBACK_WPM = 20;
/** Sentinela interna para a pressão por toque (nunca colide com `event.code`). */
const TOUCH_CODE = '__touch__';

/**
 * Captura de código Morse: mede a duração entre pressionar e soltar — a tecla
 * configurada (`keydown`/`keyup`) ou a superfície de toque em telas touch
 * (`beginTouchPress()`/`endTouchPress()`) — e emite o símbolo classificado
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

  /** Início de uma pressão por toque (tap pad). Ignorado fora da captura. */
  beginTouchPress(): void {
    if (!this.#capturing() || this.#pressStartMs !== null) {
      return;
    }
    this.#pressStartMs = performance.now();
    this.#activeCode = TOUCH_CODE;
  }

  /** Fim da pressão por toque: classifica e emite como as demais. */
  endTouchPress(): void {
    if (this.#pressStartMs === null || this.#activeCode !== TOUCH_CODE) {
      return;
    }
    this.#emitPress(performance.now() - this.#pressStartMs, 'touch');
  }

  /** Toque interrompido (`pointercancel`): descarta, como no blur do teclado. */
  cancelTouchPress(): void {
    if (this.#activeCode === TOUCH_CODE) {
      this.#resetPress();
    }
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
    this.#emitPress(performance.now() - this.#pressStartMs, 'keyboard');
  };

  #emitPress(durationMs: number, source: MorsePressSource): void {
    this.#resetPress();
    const speedWpm = this.#settings.settings()?.speed_wpm ?? FALLBACK_WPM;
    this.#presses.next({ symbol: classifyPress(durationMs, speedWpm), durationMs, source });
  }

  /** Janela perdeu o foco no meio da pressão: o keyup nunca virá — descarta. */
  readonly #onBlur = (): void => {
    this.#resetPress();
  };

  #resetPress(): void {
    this.#pressStartMs = null;
    this.#activeCode = null;
  }
}
