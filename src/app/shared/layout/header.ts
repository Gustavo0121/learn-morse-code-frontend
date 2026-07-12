import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

/**
 * Header persistente da aplicação (estilo monkeytype): marca LMC à esquerda,
 * navegação compacta à direita, presente em todas as telas.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink],
  template: `
    <header class="flex items-center justify-between border-b border-line py-5">
      <a class="group flex items-baseline gap-3" routerLink="/">
        <span class="font-display text-xl font-extrabold tracking-tight text-ink">LMC</span>
        <span
          class="hidden font-display text-xs font-bold uppercase tracking-wide-caps text-ink-muted transition-colors group-hover:text-ink sm:inline"
        >
          Learn Morse Code
        </span>
      </a>

      <nav
        class="flex items-center gap-8 font-display text-xs font-bold uppercase tracking-wide-caps"
        aria-label="Principal"
      >
        @if (authenticated()) {
          <a class="text-ink-muted transition-colors hover:text-ink" routerLink="/dashboard">
            Dashboard
          </a>
          <a class="text-ink-muted transition-colors hover:text-ink" routerLink="/settings">
            Settings
          </a>
          <button
            class="cursor-pointer text-ink-muted uppercase transition-colors hover:text-ink"
            type="button"
            (click)="logout()"
          >
            Sign out
          </button>
        } @else {
          <a class="text-ink-muted transition-colors hover:text-ink" routerLink="/login">
            Sign in
          </a>
        }
      </nav>
    </header>
  `,
})
export class Header {
  readonly #auth = inject(AuthService);

  protected readonly authenticated = this.#auth.isAuthenticated;

  protected logout(): void {
    this.#auth.logout().subscribe();
  }
}
