import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { MorseInputService } from '../../../services/morse-input.service';

/**
 * Superfície de toque para transmitir Morse em telas touch (mobile/tablet):
 * pressionar e soltar equivale ao pressionamento da tecla configurada. Só é
 * exibida em dispositivos de ponteiro grosseiro (`pointer-coarse:`) — no
 * desktop a captura continua pelo teclado físico.
 *
 * Usa Pointer Events com `touch-none` para a pressão não rolar a página;
 * `pointercancel` descarta a pressão em andamento (mesmo tratamento do blur
 * na captura por teclado). Só funciona com a captura ativa
 * (`MorseInputService.startCapture()`), como o teclado.
 */
@Component({
  selector: 'app-tap-pad',
  template: '{{ i18n.t("common.tapPadHint") }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'hidden pointer-coarse:flex h-36 w-full max-w-md cursor-pointer touch-none select-none ' +
      'items-center justify-center border border-line px-6 text-center font-display text-xs ' +
      'font-bold uppercase tracking-wide-caps text-ink-muted transition-colors',
    '[class.border-ink]': 'pressed()',
    '[class.text-ink]': 'pressed()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerCancel($event)',
    '(contextmenu)': '$event.preventDefault()',
  },
})
export class TapPad {
  readonly #input = inject(MorseInputService);
  protected readonly i18n = inject(I18nService);

  protected readonly pressed = signal(false);
  #pointerId: number | null = null;

  protected onPointerDown(event: PointerEvent): void {
    // Multi-toque: só o primeiro dedo conta.
    if (event.isPrimary === false || this.#pointerId !== null) {
      return;
    }
    event.preventDefault();
    this.#pointerId = event.pointerId ?? 0;
    // Mantém o pointerup vindo para o pad mesmo se o dedo deslizar para fora.
    // Pode lançar NotFoundError se o ponteiro já não estiver ativo (e no
    // jsdom dos testes, que não rastreia ponteiros) — nunca é fatal aqui.
    const target = event.target as Element;
    try {
      target.setPointerCapture?.(this.#pointerId);
    } catch {
      // Sem pointer capture o pad segue funcional; só perde o pointerup
      // se o dedo deslizar para fora antes de soltar.
    }
    this.pressed.set(true);
    this.#input.beginTouchPress();
  }

  protected onPointerUp(event: PointerEvent): void {
    if ((event.pointerId ?? 0) !== this.#pointerId) {
      return;
    }
    this.#pointerId = null;
    this.pressed.set(false);
    this.#input.endTouchPress();
  }

  protected onPointerCancel(event: PointerEvent): void {
    if ((event.pointerId ?? 0) !== this.#pointerId) {
      return;
    }
    this.#pointerId = null;
    this.pressed.set(false);
    this.#input.cancelTouchPress();
  }
}
