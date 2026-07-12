import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Divisória editorial: linha fina com rótulo opcional em caixa alta.
 * Substitui cards tradicionais na separação de blocos de conteúdo.
 */
@Component({
  selector: 'app-divider',
  template: `
    @if (label()) {
      <span class="font-display text-xs font-bold uppercase tracking-wide-caps text-ink-muted">
        {{ label() }}
      </span>
    }
    <span class="h-px flex-1 bg-line" aria-hidden="true"></span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center gap-4',
    role: 'separator',
    '[attr.aria-label]': 'label() || null',
  },
})
export class Divider {
  readonly label = input<string>('');
}
