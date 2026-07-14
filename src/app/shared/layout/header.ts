import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * Header persistente da aplicação (estilo monkeytype): marca LMC à esquerda,
 * navegação compacta à direita, presente em todas as telas. As seções usam
 * ícones (SVG inline, traço monocromático) com nome acessível em
 * `aria-label`/`title` — sem dependência de fonte de ícones externa.
 *
 * Em telas estreitas (< `sm`) a fileira de ícones dá lugar a um menu
 * hambúrguer: painel sobreposto abaixo do header com os itens por extenso.
 * Os rótulos são os editoriais do design (iguais em PT/EN, fora do
 * dicionário i18n, como os `aria-label` dos ícones).
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink],
  host: {
    '(document:keydown.escape)': 'closeMenu()',
  },
  template: `
    <header class="relative flex items-center justify-between border-b border-line py-5">
      <a class="group flex items-baseline gap-3" routerLink="/" (click)="closeMenu()">
        <span class="font-display text-xl font-extrabold tracking-tight text-ink">LMC</span>
        <span
          class="hidden font-display text-xs font-bold uppercase tracking-wide-caps text-ink-muted transition-colors group-hover:text-ink sm:inline"
        >
          Learn Morse Code
        </span>
      </a>

      <nav class="flex items-center gap-7" aria-label="Principal">
        <span
          class="flex items-center gap-1 font-display text-xs font-bold uppercase tracking-wide-caps"
          role="group"
          aria-label="Idioma"
        >
          <button
            class="cursor-pointer transition-colors"
            [class.text-ink]="i18n.locale() === 'pt'"
            [class.text-ink-muted]="i18n.locale() !== 'pt'"
            [class.hover:text-ink]="i18n.locale() !== 'pt'"
            type="button"
            [attr.aria-pressed]="i18n.locale() === 'pt'"
            title="Português"
            (click)="i18n.setLocale('pt')"
          >
            PT
          </button>
          <span class="text-ink-muted" aria-hidden="true">/</span>
          <button
            class="cursor-pointer transition-colors"
            [class.text-ink]="i18n.locale() === 'en'"
            [class.text-ink-muted]="i18n.locale() !== 'en'"
            [class.hover:text-ink]="i18n.locale() !== 'en'"
            type="button"
            [attr.aria-pressed]="i18n.locale() === 'en'"
            title="English"
            (click)="i18n.setLocale('en')"
          >
            EN
          </button>
        </span>

        @if (authenticated()) {
          <span class="hidden items-center gap-7 sm:flex">
            <a
              class="text-ink-muted transition-colors hover:text-ink"
              routerLink="/dashboard"
              aria-label="Dashboard"
              title="Dashboard"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="6" y1="20" x2="6" y2="16" />
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
              </svg>
            </a>
            <a
              class="text-ink-muted transition-colors hover:text-ink"
              routerLink="/lessons"
              aria-label="Lessons"
              title="Lessons"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </a>
            <a
              class="text-ink-muted transition-colors hover:text-ink"
              routerLink="/practice"
              aria-label="Practice"
              title="Practice"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path
                  d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"
                />
              </svg>
            </a>
            <a
              class="text-ink-muted transition-colors hover:text-ink"
              routerLink="/settings"
              aria-label="Settings"
              title="Settings"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="21" y1="4" x2="14" y2="4" />
                <line x1="10" y1="4" x2="3" y2="4" />
                <line x1="21" y1="12" x2="12" y2="12" />
                <line x1="8" y1="12" x2="3" y2="12" />
                <line x1="21" y1="20" x2="16" y2="20" />
                <line x1="12" y1="20" x2="3" y2="20" />
                <line x1="14" y1="2" x2="14" y2="6" />
                <line x1="8" y1="10" x2="8" y2="14" />
                <line x1="16" y1="18" x2="16" y2="22" />
              </svg>
            </a>
            <button
              class="cursor-pointer text-ink-muted transition-colors hover:text-ink"
              type="button"
              aria-label="Sign out"
              title="Sign out"
              (click)="logout()"
            >
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </span>

          <button
            class="cursor-pointer text-ink-muted transition-colors hover:text-ink sm:hidden"
            type="button"
            aria-label="Menu"
            aria-controls="mobile-menu"
            [attr.aria-expanded]="menuOpen()"
            (click)="toggleMenu()"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              @if (menuOpen()) {
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              } @else {
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              }
            </svg>
          </button>
        } @else {
          <a
            class="font-display text-xs font-bold uppercase tracking-wide-caps text-ink-muted transition-colors hover:text-ink"
            routerLink="/login"
          >
            Sign in
          </a>
        }
      </nav>

      @if (menuOpen()) {
        <nav
          class="absolute inset-x-0 top-full z-20 divide-y divide-line border-b border-line bg-canvas sm:hidden"
          id="mobile-menu"
          aria-label="Menu"
        >
          <a class="{{ menuItemClasses }}" routerLink="/dashboard" (click)="closeMenu()">
            Dashboard
          </a>
          <a class="{{ menuItemClasses }}" routerLink="/lessons" (click)="closeMenu()">Lessons</a>
          <a class="{{ menuItemClasses }}" routerLink="/practice" (click)="closeMenu()">Practice</a>
          <a class="{{ menuItemClasses }}" routerLink="/settings" (click)="closeMenu()">Settings</a>
          <button class="{{ menuItemClasses }} w-full text-left" type="button" (click)="logout()">
            Sign out
          </button>
        </nav>
      }
    </header>
  `,
})
export class Header {
  readonly #auth = inject(AuthService);

  protected readonly i18n = inject(I18nService);
  protected readonly authenticated = this.#auth.isAuthenticated;
  protected readonly menuOpen = signal(false);

  /** Itens do painel móvel: linhas editoriais de largura total. */
  protected readonly menuItemClasses =
    'block cursor-pointer px-1 py-4 font-display text-xs font-bold uppercase ' +
    'tracking-wide-caps text-ink-muted transition-colors hover:text-ink';

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.closeMenu();
    this.#auth.logout().subscribe();
  }
}
