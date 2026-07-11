import { Component, computed, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';

/**
 * Placeholder da área autenticada. O conteúdo real (progresso, estatísticas,
 * últimos treinamentos) é escopo da Fase 7. O logout fica no header global.
 */
@Component({
  selector: 'app-dashboard',
  imports: [Divider, Heading],
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <main class="flex flex-1 flex-col justify-center py-16">
      <app-heading text="Dashboard" [eyebrow]="eyebrow()" />

      <app-divider class="my-10" label="Progress" />

      <p class="max-w-xl text-sm leading-relaxed text-ink-muted">
        Suas estatísticas e últimos treinamentos aparecerão aqui.
      </p>
    </main>
  `,
})
export class Dashboard {
  readonly #auth = inject(AuthService);

  protected readonly eyebrow = computed(() => {
    const user = this.#auth.currentUser();
    return user ? `Signed in as ${user.username}` : '';
  });
}
