import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { MorseInputService, MorsePressEvent } from './morse-input.service';
import { MorseSettingsService } from './morse-settings.service';
import { WORD_GAP_UNITS, unitMs } from './morse-timing';
import { TOUCH_INPUT_METHOD } from './practice.service';

const FALLBACK_KEY = 'Space';
const FALLBACK_WPM = 20;
/** Piso do gap de auto-envio, para velocidades altas não engolirem a pausa. */
const MIN_SUBMIT_GAP_MS = 600;

/** Parte do attempt de `key_capture` que o fluxo de captura produz sozinho. */
export interface KeyCaptureResult {
  /** Tecla configurada, ou `TOUCH_INPUT_METHOD` se o round usou toque. */
  input_method: string;
  press_durations: number[];
}

/**
 * Fluxo de captura de `key_capture` compartilhado entre a prática livre e o
 * treino guiado: enquanto ativo (`start()`/`stop()`), acumula os
 * pressionamentos emitidos pelo `MorseInputService`, sinaliza pressões
 * inválidas e, após a pausa de auto-envio (gap de palavra), emite
 * `press_durations` + `input_method` para a feature montar o attempt
 * (`question`/`expected_answer`/`response_time` e o envio ficam com ela).
 *
 * Prover no componente de feature (uma instância por tela): o estado é do
 * round corrente e o teardown acompanha o ciclo de vida do componente.
 */
@Injectable()
export class KeyCaptureService {
  readonly #settings = inject(MorseSettingsService);
  readonly #input = inject(MorseInputService);

  readonly #symbols = signal('');
  /** Símbolos já capturados no round atual (ex.: ".-"). */
  readonly symbols = this.#symbols.asReadonly();

  readonly #invalidPress = signal(false);
  readonly invalidPress = this.#invalidPress.asReadonly();

  readonly #presses = new Subject<MorsePressEvent>();
  readonly #captures = new Subject<KeyCaptureResult>();

  #active = false;
  #pressDurations: number[] = [];
  /** O round usou a superfície de toque — envia `input_method: "Touch"`. */
  #touchUsed = false;
  #gapTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const subscription = this.#input
      .onSymbolDetected()
      .subscribe((press) => this.#handlePress(press));
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.stop();
    });
  }

  /** Zera o estado do round e liga a captura (teclado e tap pad). */
  start(): void {
    this.stop();
    this.#pressDurations = [];
    this.#touchUsed = false;
    this.#symbols.set('');
    this.#invalidPress.set(false);
    this.#active = true;
    this.#input.startCapture();
  }

  /** Desliga a captura e cancela o auto-envio pendente. Idempotente. */
  stop(): void {
    this.#active = false;
    this.#input.stopCapture();
    if (this.#gapTimer !== null) {
      clearTimeout(this.#gapTimer);
      this.#gapTimer = null;
    }
  }

  /** Tecla configurada exibida nas mensagens (aviso e dica). */
  inputKeyLabel(): string {
    return this.#settings.settings()?.input_key ?? FALLBACK_KEY;
  }

  /** Todo pressionamento recebido enquanto ativo, inclusive os inválidos. */
  onPress(): Observable<MorsePressEvent> {
    return this.#presses.asObservable();
  }

  /** Pausa de auto-envio detectada: emite o acumulado do round. */
  onCapture(): Observable<KeyCaptureResult> {
    return this.#captures.asObservable();
  }

  #handlePress(press: MorsePressEvent): void {
    if (!this.#active) {
      return;
    }

    this.#presses.next(press);

    if (press.symbol === null) {
      // O backend rejeitaria essa duração para o speed_wpm atual: descarta e avisa.
      this.#invalidPress.set(true);
      return;
    }

    this.#invalidPress.set(false);
    this.#touchUsed ||= press.source === 'touch';
    this.#pressDurations.push(press.durationMs);
    this.#symbols.set(this.#symbols() + press.symbol);

    if (this.#gapTimer !== null) {
      clearTimeout(this.#gapTimer);
    }
    this.#gapTimer = setTimeout(() => this.#emitCapture(), this.#submitGapMs());
  }

  /** Pausa sem novos símbolos que encerra o caractere (gap de palavra, com piso). */
  #submitGapMs(): number {
    const speedWpm = this.#settings.settings()?.speed_wpm ?? FALLBACK_WPM;
    return Math.max(MIN_SUBMIT_GAP_MS, WORD_GAP_UNITS * unitMs(speedWpm));
  }

  #emitCapture(): void {
    this.#gapTimer = null;
    if (this.#pressDurations.length === 0) {
      return;
    }
    this.#captures.next({
      input_method: this.#touchUsed ? TOUCH_INPUT_METHOD : this.inputKeyLabel(),
      press_durations: [...this.#pressDurations],
    });
  }
}
