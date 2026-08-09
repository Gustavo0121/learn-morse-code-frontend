import { HttpErrorResponse } from '@angular/common/http';
import { Component, WritableSignal, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MessageKey } from '../../core/i18n/messages';
import { Button } from '../../shared/ui/button/button';
import { Heading } from '../../shared/ui/heading/heading';

interface Feedback {
  kind: 'success' | 'error';
  text: string;
}

/** Extrai mensagens por campo de um erro 400 do DRF (`{campo: [mensagens]}`). */
function fieldMessagesFrom(error: unknown, fields: readonly string[]): Record<string, string> {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return {};
  }
  const body = error.error;
  if (typeof body !== 'object' || body === null) {
    return {};
  }
  const record = body as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const field of fields) {
    const value = record[field];
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      result[field] = value.join(' ');
    }
  }
  return result;
}

@Component({
  selector: 'app-account',
  imports: [Button, Heading],
  templateUrl: './account.html',
  host: { class: 'flex flex-1 flex-col' },
})
export class Account {
  readonly #auth = inject(AuthService);
  protected readonly i18n = inject(I18nService);

  protected readonly currentUser = this.#auth.currentUser;

  // ------------------------------------------------------------- change password

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly passwordSubmitting = signal(false);
  protected readonly passwordFeedback = signal<Feedback | null>(null);
  protected readonly passwordErrors = signal<Record<string, string>>({});

  protected readonly passwordMismatch = computed(
    () =>
      this.newPassword().length > 0 &&
      this.confirmPassword().length > 0 &&
      this.newPassword() !== this.confirmPassword(),
  );

  protected readonly canSubmitPassword = computed(
    () =>
      this.currentPassword().length > 0 &&
      this.newPassword().length > 0 &&
      this.confirmPassword().length > 0 &&
      !this.passwordMismatch(),
  );

  protected onCurrentPasswordInput(event: Event): void {
    this.currentPassword.set((event.target as HTMLInputElement).value);
  }

  protected onNewPasswordInput(event: Event): void {
    this.newPassword.set((event.target as HTMLInputElement).value);
  }

  protected onConfirmPasswordInput(event: Event): void {
    this.confirmPassword.set((event.target as HTMLInputElement).value);
  }

  protected submitPasswordChange(): void {
    if (!this.canSubmitPassword() || this.passwordSubmitting()) {
      return;
    }
    this.passwordSubmitting.set(true);
    this.passwordFeedback.set(null);
    this.passwordErrors.set({});

    this.#auth
      .changePassword({
        current_password: this.currentPassword(),
        new_password: this.newPassword(),
      })
      .subscribe({
        next: () => {
          this.passwordSubmitting.set(false);
          this.currentPassword.set('');
          this.newPassword.set('');
          this.confirmPassword.set('');
          this.passwordFeedback.set({
            kind: 'success',
            text: this.i18n.t('account.passwordChanged'),
          });
        },
        error: (error: unknown) => {
          this.passwordSubmitting.set(false);
          this.#handleAccountError(error, ['current_password', 'new_password'], {
            errors: this.passwordErrors,
            feedback: this.passwordFeedback,
            genericMessage: 'account.changePasswordError',
          });
        },
      });
  }

  // ------------------------------------------------------------- delete account

  protected readonly deleteRevealed = signal(false);
  protected readonly deleteConfirmUsername = signal('');
  protected readonly deletePassword = signal('');
  protected readonly deleting = signal(false);
  protected readonly deleteFeedback = signal<Feedback | null>(null);
  protected readonly deleteErrors = signal<Record<string, string>>({});

  protected readonly canConfirmDelete = computed(() => {
    const user = this.currentUser();
    return (
      !!user && this.deleteConfirmUsername() === user.username && this.deletePassword().length > 0
    );
  });

  protected onDeleteUsernameInput(event: Event): void {
    this.deleteConfirmUsername.set((event.target as HTMLInputElement).value);
  }

  protected onDeletePasswordInput(event: Event): void {
    this.deletePassword.set((event.target as HTMLInputElement).value);
  }

  protected revealDelete(): void {
    this.deleteRevealed.set(true);
    this.deleteFeedback.set(null);
  }

  protected cancelDelete(): void {
    this.deleteRevealed.set(false);
    this.deleteConfirmUsername.set('');
    this.deletePassword.set('');
    this.deleteErrors.set({});
    this.deleteFeedback.set(null);
  }

  protected confirmDelete(): void {
    if (!this.canConfirmDelete() || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.deleteFeedback.set(null);
    this.deleteErrors.set({});

    this.#auth.deleteAccount({ current_password: this.deletePassword() }).subscribe({
      error: (error: unknown) => {
        this.deleting.set(false);
        this.#handleAccountError(error, ['current_password'], {
          errors: this.deleteErrors,
          feedback: this.deleteFeedback,
          genericMessage: 'account.deleteError',
        });
      },
    });
  }

  #handleAccountError(
    error: unknown,
    fields: readonly string[],
    target: {
      errors: WritableSignal<Record<string, string>>;
      feedback: WritableSignal<Feedback | null>;
      genericMessage: MessageKey;
    },
  ): void {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      target.feedback.set({ kind: 'error', text: this.i18n.t('account.tooManyAttempts') });
      return;
    }
    const fieldErrors = fieldMessagesFrom(error, fields);
    if (Object.keys(fieldErrors).length > 0) {
      target.errors.set(fieldErrors);
      return;
    }
    target.feedback.set({ kind: 'error', text: this.i18n.t(target.genericMessage) });
  }
}
