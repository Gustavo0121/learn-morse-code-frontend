import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';

/**
 * Placeholder da área autenticada. O conteúdo real (progresso, estatísticas,
 * últimos treinamentos) é escopo da Fase 7.
 */
@Component({
  selector: 'app-dashboard',
  imports: [Button, Divider, Heading],
  template: `
    <main class="flex min-h-screen flex-col justify-center bg-canvas px-6 py-24 md:px-16">
      <div class="mx-auto w-full max-w-5xl">
        <app-heading eyebrow="-.. .- ... ...." text="Dashboard" />

        <app-divider class="my-14" label="Progress" />

        @if (user(); as user) {
          <p
            class="mb-6 font-display text-xs font-bold uppercase tracking-wide-caps text-ink-muted"
          >
            Signed in as <span class="text-ink">{{ user.username }}</span>
          </p>
        }

        <p class="mb-14 max-w-md text-base leading-relaxed text-ink-muted">
          Suas estatísticas e últimos treinamentos aparecerão aqui.
        </p>

        <button app-button variant="outline" type="button" (click)="logout()">Sign out</button>
      </div>
    </main>
  `,
})
export class Dashboard {
  readonly #auth = inject(AuthService);

  protected readonly user = this.#auth.currentUser;

  protected logout(): void {
    this.#auth.logout().subscribe();
  }
}
