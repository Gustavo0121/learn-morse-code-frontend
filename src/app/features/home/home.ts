import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Button, Divider, Heading],
  template: `
    <main class="flex min-h-screen flex-col justify-center bg-canvas px-6 py-24 md:px-16">
      <div class="mx-auto w-full max-w-5xl">
        <app-heading
          eyebrow="-- --- .-. ... ."
          text="Master
the language
of signals"
        />

        <app-divider class="my-14" label="Training" />

        <p class="mb-14 max-w-md text-base leading-relaxed text-ink-muted">
          Aprenda código Morse com treino auditivo e captura por tecla, no seu ritmo.
        </p>

        <a app-button size="lg" routerLink="/dashboard">Start Training</a>
      </div>
    </main>
  `,
})
export class Home {}
