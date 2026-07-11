import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
        Treino auditivo e captura por tecla, no seu ritmo.
      </p>

      <div class="mt-10">
        <a app-button routerLink="/dashboard">Start Training</a>
      </div>
    </main>
  `,
})
export class Home {}
