import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { Button } from '../../shared/ui/button/button';
import { Heading } from '../../shared/ui/heading/heading';

type AuthMode = 'signin' | 'register';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Button, Heading],
  templateUrl: './login.html',
  host: { class: 'flex flex-1 flex-col' },
})
export class Login {
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #formBuilder = inject(NonNullableFormBuilder);

  protected readonly mode = signal<AuthMode>('signin');

  protected readonly form = this.#formBuilder.group({
    username: ['', [Validators.required, Validators.maxLength(150)]],
    // Habilitado apenas no modo de cadastro; controles desabilitados não
    // entram na validação do formulário.
    email: [
      { value: '', disabled: true },
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected toggleMode(): void {
    const next: AuthMode = this.mode() === 'signin' ? 'register' : 'signin';
    this.mode.set(next);
    this.error.set(null);

    const email = this.form.controls.email;
    if (next === 'register') {
      email.enable();
    } else {
      email.reset('');
      email.disable();
    }
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const { username, email, password } = this.form.getRawValue();
    const request$ =
      this.mode() === 'register'
        ? this.#auth.register({ username, email, password })
        : this.#auth.login({ username, password });

    request$.subscribe({
      next: () => void this.#router.navigateByUrl(this.#returnUrl()),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(this.#messageFor(error));
      },
    });
  }

  /** Apenas caminhos internos são aceitos como destino pós-login. */
  #returnUrl(): string {
    const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') ? returnUrl : '/dashboard';
  }

  #messageFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Não foi possível concluir. Tente novamente em instantes.';
    }
    if (error.status === 429) {
      return 'Muitas tentativas. Aguarde um instante e tente novamente.';
    }
    if (this.mode() === 'register' && error.status === 400) {
      return (
        this.#fieldErrors(error.error) ?? 'Não foi possível criar a conta. Verifique os dados.'
      );
    }
    if (error.status === 400 || error.status === 401) {
      return 'Credenciais inválidas. Verifique usuário e senha.';
    }
    return 'Não foi possível concluir. Tente novamente em instantes.';
  }

  /** Achata os erros de validação por campo do DRF (`{campo: [mensagens]}`). */
  #fieldErrors(body: unknown): string | null {
    if (typeof body !== 'object' || body === null) {
      return null;
    }
    const messages = Object.values(body)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === 'string');
    return messages.length > 0 ? messages.join(' ') : null;
  }
}
