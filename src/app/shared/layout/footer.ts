import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../../core/i18n/i18n.service';

const GITHUB_URL = 'https://github.com/Gustavo0121/learn-morse-code-frontend';

/**
 * Rodapé institucional, presente em todas as rotas via `app.html`. Ícones
 * (SVG inline, traço monocromático) com nome acessível em `aria-label`/
 * `title`, no mesmo padrão do header — GitHub, contato, termos, privacidade
 * e segurança. Termos, privacidade e segurança abrem em nova aba (como o
 * GitHub) para não tirar o usuário do fluxo atual.
 */
@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="mt-auto border-t border-line py-6">
      <nav class="flex items-center gap-6 text-ink-muted" aria-label="Institucional">
        <a
          class="transition-colors hover:text-ink"
          [href]="githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          [attr.aria-label]="i18n.t('footer.github')"
          [title]="i18n.t('footer.github')"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.113.793-.26.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .32.192.694.801.576C20.566 21.797 24 17.303 24 12c0-6.627-5.373-12-12-12z"
            />
          </svg>
        </a>
        <a
          class="transition-colors hover:text-ink"
          href="mailto:gus0512san@gmail.com"
          [attr.aria-label]="i18n.t('footer.contact')"
          [title]="i18n.t('footer.contact')"
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
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </a>
        <a
          class="transition-colors hover:text-ink"
          routerLink="/terms"
          target="_blank"
          rel="noopener noreferrer"
          [attr.aria-label]="i18n.t('footer.terms')"
          [title]="i18n.t('footer.terms')"
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </a>
        <a
          class="transition-colors hover:text-ink"
          routerLink="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          [attr.aria-label]="i18n.t('footer.privacy')"
          [title]="i18n.t('footer.privacy')"
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
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </a>
        <a
          class="transition-colors hover:text-ink"
          routerLink="/security"
          target="_blank"
          rel="noopener noreferrer"
          [attr.aria-label]="i18n.t('footer.security')"
          [title]="i18n.t('footer.security')"
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
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </a>
      </nav>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly i18n = inject(I18nService);
  protected readonly githubUrl = GITHUB_URL;
}
