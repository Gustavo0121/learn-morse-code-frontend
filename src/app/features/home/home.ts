import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../../core/i18n/i18n.service';
import { Button } from '../../shared/ui/button/button';
import { Heading } from '../../shared/ui/heading/heading';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Button, Heading],
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <main class="flex flex-1 flex-col justify-center py-16">
      <app-heading text="Learn Morse Code" />

      <p class="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
        {{ i18n.t('home.tagline') }}
      </p>

      <div class="mt-10">
        <a app-button routerLink="/practice">Start Training</a>
      </div>
    </main>
  `,
})
export class Home {
  protected readonly i18n = inject(I18nService);
}
