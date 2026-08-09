import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { AuthService } from '../../core/auth/auth.service';
import { UserProfile } from '../../core/auth/auth.models';
import { Account } from './account';

const PROFILE: UserProfile = {
  id: 1,
  username: 'gu',
  email: 'gu@example.com',
  created_at: '2026-07-11T00:00:00Z',
  updated_at: '2026-07-11T00:00:00Z',
};

/** Simula um login completo para popular `AuthService.currentUser`, do qual a tela depende. */
function loginAsCurrentUser(http: HttpTestingController): void {
  TestBed.inject(AuthService).login({ username: 'gu', password: 'x' }).subscribe();
  http.expectOne('/api/auth/login').flush({ access: 'token' });
  http.expectOne('/api/users/morse-settings').flush({
    speed_wpm: 20,
    frequency: 700,
    volume: 0.8,
    wave_type: 'sine',
    input_key: 'Space',
  });
  http.expectOne('/api/users/profile').flush(PROFILE);
}

describe('Account', () => {
  async function setup() {
    await render(Account, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    loginAsCurrentUser(http);
    return { http, user: userEvent.setup() };
  }

  it('troca de senha: envia a senha atual e a nova, e mostra sucesso', async () => {
    const { http, user } = await setup();

    await user.type(await screen.findByLabelText('Current password'), 'antiga');
    await user.type(screen.getByLabelText('New password'), 'nova-S3nh4!');
    await user.type(screen.getByLabelText('Confirm new password'), 'nova-S3nh4!');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    const request = http.expectOne('/api/users/change-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      current_password: 'antiga',
      new_password: 'nova-S3nh4!',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada com sucesso.');
  });

  it('troca de senha: bloqueia o envio quando a confirmação não bate', async () => {
    const { http, user } = await setup();

    await user.type(await screen.findByLabelText('Current password'), 'antiga');
    await user.type(screen.getByLabelText('New password'), 'nova-S3nh4!');
    await user.type(screen.getByLabelText('Confirm new password'), 'outra-coisa');

    expect(screen.getByText('As senhas não coincidem.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled();
    http.expectNone('/api/users/change-password');
  });

  it('troca de senha: exibe o erro de campo do backend (senha atual incorreta)', async () => {
    const { http, user } = await setup();

    await user.type(await screen.findByLabelText('Current password'), 'errada');
    await user.type(screen.getByLabelText('New password'), 'nova-S3nh4!');
    await user.type(screen.getByLabelText('Confirm new password'), 'nova-S3nh4!');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    http
      .expectOne('/api/users/change-password')
      .flush(
        { current_password: ['Senha atual incorreta.'] },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha atual incorreta.');
  });

  it('exclusão de conta: exige digitar o username exato para habilitar a confirmação', async () => {
    const { user } = await setup();

    await user.click(await screen.findByRole('button', { name: 'Delete account' }));
    expect(screen.getByRole('button', { name: 'Confirm deletion' })).toBeDisabled();

    await user.type(screen.getByLabelText('Username'), 'usuario-errado');
    await user.type(screen.getByLabelText('Password'), 'segredo');
    expect(screen.getByRole('button', { name: 'Confirm deletion' })).toBeDisabled();

    await user.clear(screen.getByLabelText('Username'));
    await user.type(screen.getByLabelText('Username'), 'gu');
    expect(screen.getByRole('button', { name: 'Confirm deletion' })).toBeEnabled();
  });

  it('exclusão de conta: confirma e envia a senha atual para o backend', async () => {
    const { http, user } = await setup();

    await user.click(await screen.findByRole('button', { name: 'Delete account' }));
    await user.type(screen.getByLabelText('Username'), 'gu');
    await user.type(screen.getByLabelText('Password'), 'segredo');
    await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));

    const request = http.expectOne('/api/users/profile');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ current_password: 'segredo' });
  });

  it('exclusão de conta: exibe o erro de campo quando a senha atual está errada', async () => {
    const { http, user } = await setup();

    await user.click(await screen.findByRole('button', { name: 'Delete account' }));
    await user.type(screen.getByLabelText('Username'), 'gu');
    await user.type(screen.getByLabelText('Password'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));

    http
      .expectOne('/api/users/profile')
      .flush(
        { current_password: ['Senha atual incorreta.'] },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await screen.findByRole('alert')).toHaveTextContent('Senha atual incorreta.');
  });

  it('exclusão de conta: cancelar limpa os campos e esconde a confirmação', async () => {
    const { http, user } = await setup();

    await user.click(await screen.findByRole('button', { name: 'Delete account' }));
    await user.type(screen.getByLabelText('Username'), 'gu');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeVisible();
    http.expectNone('/api/users/profile');
  });
});
