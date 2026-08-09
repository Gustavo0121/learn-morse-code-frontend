import { Component, inject } from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { Heading } from '../../shared/ui/heading/heading';

const SECURITY_POLICY_URL =
  'https://github.com/Gustavo0121/learn-morse-code-frontend/security/policy';

@Component({
  selector: 'app-security',
  imports: [Heading],
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <main class="max-w-2xl py-16">
      <app-heading [text]="i18n.t('footer.security')" />

      <div class="mt-6 space-y-4 text-sm leading-relaxed text-ink-muted">
        <p>{{ i18n.t('security.p1') }}</p>
        <p>{{ i18n.t('security.p2') }}</p>
      </div>

      <a
        class="mt-6 inline-block font-display text-xs font-bold uppercase tracking-wide-caps text-ink-muted transition-colors hover:text-ink"
        [href]="policyUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ i18n.t('security.viewFull') }}
      </a>
    </main>
  `,
})
export class Security {
  protected readonly i18n = inject(I18nService);
  protected readonly policyUrl = SECURITY_POLICY_URL;
}
