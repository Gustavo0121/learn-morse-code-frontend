import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { UserProfile } from '../../core/auth/auth.models';
import { UserMorseSettings } from '../../services/morse-settings.service';
import { Login } from './login';

const SETTINGS: UserMorseSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
  input_key: 'Space',
};

const PROFILE: UserProfile = {
  id: 1,
  username: 'gu',
  email: 'gu@example.com',
  created_at: '2026-07-11T00:00:00Z',
  updated_at: '2026-07-11T00:00:00Z',
};

describe('Login', () => {
  async function setup() {
    await render(Login, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return {
      http: TestBed.inject(HttpTestingController),
      router: TestBed.inject(Router),
      user: userEvent.setup(),
    };
  }

  it('valida campos obrigatórios sem chamar a API', async () => {
    const { http, user } = await setup();

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Informe o usuário.')).toBeVisible();
    expect(screen.getByText('Informe a senha.')).toBeVisible();
    http.expectNone('/api/auth/login');
  });

  it('autentica e navega para o dashboard', async () => {
    const { http, router, user } = await setup();
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await user.type(screen.getByLabelText(/username/i), 'gu');
    await user.type(screen.getByLabelText(/password/i), 'segredo');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    const login = http.expectOne('/api/auth/login');
    expect(login.request.body).toEqual({ username: 'gu', password: 'segredo' });
    login.flush({ access: 'token' });
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);
    http.expectOne('/api/users/profile').flush(PROFILE);

    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('alterna para o modo de cadastro, cria a conta e navega autenticado', async () => {
    const { http, router, user } = await setup();
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await user.click(screen.getByRole('button', { name: /create an account/i }));

    await user.type(screen.getByLabelText(/username/i), 'gu');
    await user.type(screen.getByLabelText(/email/i), 'gu@example.com');
    await user.type(screen.getByLabelText(/password/i), 'S3nh4-forte');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    const register = http.expectOne('/api/auth/register');
    expect(register.request.body).toEqual({
      username: 'gu',
      email: 'gu@example.com',
      password: 'S3nh4-forte',
    });
    register.flush(
      { id: 1, username: 'gu', email: 'gu@example.com' },
      { status: 201, statusText: 'Created' },
    );
    http.expectOne('/api/auth/login').flush({ access: 'token' });
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);
    http.expectOne('/api/users/profile').flush(PROFILE);

    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('no cadastro, exibe os erros de validação retornados pelo backend', async () => {
    const { http, user } = await setup();

    await user.click(screen.getByRole('button', { name: /create an account/i }));
    await user.type(screen.getByLabelText(/username/i), 'gu');
    await user.type(screen.getByLabelText(/email/i), 'gu@example.com');
    await user.type(screen.getByLabelText(/password/i), '123');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    http
      .expectOne('/api/auth/register')
      .flush(
        { password: ['Esta senha é muito curta.'] },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta senha é muito curta.');
  });

  it('no modo de cadastro, exige e-mail válido sem chamar a API', async () => {
    const { http, user } = await setup();

    await user.click(screen.getByRole('button', { name: /create an account/i }));
    await user.type(screen.getByLabelText(/username/i), 'gu');
    await user.type(screen.getByLabelText(/email/i), 'nao-e-email');
    await user.type(screen.getByLabelText(/password/i), 'S3nh4-forte');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    expect(await screen.findByText('E-mail inválido.')).toBeVisible();
    http.expectNone('/api/auth/register');
  });

  it('exibe mensagem de erro com credenciais inválidas', async () => {
    const { http, user } = await setup();

    await user.type(screen.getByLabelText(/username/i), 'gu');
    await user.type(screen.getByLabelText(/password/i), 'errada');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    http
      .expectOne('/api/auth/login')
      .flush({ detail: 'invalid' }, { status: 401, statusText: 'Unauthorized' });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Credenciais inválidas');
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeEnabled();
  });
});
