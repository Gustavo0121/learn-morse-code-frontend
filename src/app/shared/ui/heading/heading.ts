import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Bloco tipográfico editorial: título em caixa alta com peso elevado e
 * "eyebrow" opcional (rótulo pequeno acima). Quebras de linha no texto
 * (`\n`) são preservadas para composição em múltiplas linhas.
 */
@Component({
  selector: 'app-heading',
  template: `
    @if (eyebrow()) {
      <p class="mb-3 font-display text-xs font-bold uppercase tracking-wide-caps text-ink-muted">
        {{ eyebrow() }}
      </p>
    }
    @if (level() === 1) {
      <h1
        class="font-display text-3xl leading-tight font-extrabold tracking-tight whitespace-pre-line text-ink uppercase md:text-4xl"
      >
        {{ text() }}
      </h1>
    } @else {
      <h2
        class="font-display text-xl leading-tight font-extrabold tracking-tight whitespace-pre-line text-ink uppercase md:text-2xl"
      >
        {{ text() }}
      </h2>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Heading {
  readonly text = input.required<string>();
  readonly eyebrow = input<string>('');
  readonly level = input<1 | 2>(1);
}
