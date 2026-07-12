import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonSize = 'md' | 'lg';

/**
 * Botão do design system: grande, alto contraste, sem arredondamento.
 * Aplicado sobre elementos nativos (`<button app-button>` / `<a app-button>`)
 * para preservar semântica e acessibilidade do navegador.
 */
@Component({
  selector: 'button[app-button], a[app-button]',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('solid');
  readonly size = input<ButtonSize>('md');

  protected readonly classes = computed(() => {
    const base =
      'inline-flex cursor-pointer select-none items-center justify-center font-display font-bold uppercase tracking-wide-caps transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40';

    const sizes: Record<ButtonSize, string> = {
      md: 'px-8 py-3 text-sm',
      lg: 'px-12 py-5 text-base',
    };

    const variants: Record<ButtonVariant, string> = {
      solid: 'bg-ink text-canvas hover:bg-accent',
      outline: 'border border-ink text-ink hover:bg-ink hover:text-canvas',
      ghost: 'text-ink-muted hover:text-ink',
    };

    return `${base} ${sizes[this.size()]} ${variants[this.variant()]}`;
  });
}
