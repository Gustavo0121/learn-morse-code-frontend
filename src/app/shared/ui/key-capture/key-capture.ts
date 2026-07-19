import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { KeyCaptureService } from '../../../services/key-capture.service';
import { TapPad } from '../tap-pad/tap-pad';

/**
 * Bloco visual do exercício de `key_capture`: caractere alvo, símbolos já
 * capturados, aviso de pressão inválida, dica da tecla e a superfície de
 * toque. Puro apresentação — a lógica vive no `KeyCaptureService`, provido
 * pela feature hospedeira (prática livre e treino guiado), que também arma e
 * desarma a captura (`start()`/`stop()`) no ciclo do round.
 *
 * `display: contents`: os filhos participam do flex da section hospedeira,
 * preservando o layout de quando o bloco era inline nas features.
 */
@Component({
  selector: 'app-key-capture',
  imports: [TapPad],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <p class="font-display text-7xl font-extrabold uppercase text-ink">
      {{ question() }}
    </p>
    <p class="min-h-8 font-display text-3xl font-extrabold tracking-widest text-ink">
      {{ capture.symbols() || ' ' }}
    </p>
    @if (capture.invalidPress()) {
      <p class="text-sm text-error" role="alert">
        {{ i18n.t('common.invalidPress', { key: capture.inputKeyLabel() }) }}
      </p>
    }
    <p class="text-sm text-ink-muted pointer-coarse:hidden">
      {{ i18n.t('common.pressHint', { key: capture.inputKeyLabel() }) }}
    </p>
    <app-tap-pad />
  `,
})
export class KeyCapture {
  protected readonly capture = inject(KeyCaptureService);
  protected readonly i18n = inject(I18nService);

  /** Caractere alvo do round (`question` enviado no attempt). */
  readonly question = input.required<string>();
}
