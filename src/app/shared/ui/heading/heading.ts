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
      <p class="mb-6 font-display text-xs font-bold uppercase tracking-wide-caps text-ink-muted">
        {{ eyebrow() }}
      </p>
    }
    @if (level() === 1) {
      <h1
        class="text-6xl md:text-8xl leading-[0.95] font-display font-extrabold tracking-tight whitespace-pre-line text-ink uppercase"
      >
        {{ text() }}
      </h1>
    } @else {
      <h2
        class="text-4xl md:text-5xl font-display leading-none font-extrabold tracking-tight whitespace-pre-line text-ink uppercase"
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
