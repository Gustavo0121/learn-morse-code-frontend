import { Component, inject } from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { Heading } from '../../shared/ui/heading/heading';

@Component({
  selector: 'app-terms',
  imports: [Heading],
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <main class="max-w-2xl py-16">
      <app-heading [text]="i18n.t('footer.terms')" />

      <div class="mt-6 space-y-4 text-sm leading-relaxed text-ink-muted">
        <p>{{ i18n.t('terms.p1') }}</p>
        <p>{{ i18n.t('terms.p2') }}</p>
      </div>
    </main>
  `,
})
export class Terms {
  protected readonly i18n = inject(I18nService);
}
