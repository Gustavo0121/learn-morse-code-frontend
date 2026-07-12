import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MorseSettingsService, UserMorseSettings } from '../../services/morse-settings.service';
import { UserProfile } from './auth.models';
import { AuthService } from './auth.service';

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

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('login: guarda o access token em memória e carrega as preferências Morse', () => {
    service.login({ username: 'gu', password: 'segredo' }).subscribe();

    const login = http.expectOne('/api/auth/login');
    expect(login.request.method).toBe('POST');
    expect(login.request.withCredentials).toBe(true);
    login.flush({ access: 'token-1' });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken()).toBe('token-1');

    http.expectOne('/api/users/morse-settings').flush(SETTINGS);
    http.expectOne('/api/users/profile').flush(PROFILE);
    expect(TestBed.inject(MorseSettingsService).settings()).toEqual(SETTINGS);
    expect(service.currentUser()).toEqual(PROFILE);
  });

  it('register: cria a conta e autentica na sequência', () => {
    service
      .register({ username: 'gu', email: 'gu@example.com', password: 'S3nh4-forte' })
      .subscribe();

    const register = http.expectOne('/api/auth/register');
    expect(register.request.method).toBe('POST');
    expect(register.request.body).toEqual({
      username: 'gu',
      email: 'gu@example.com',
      password: 'S3nh4-forte',
    });
    register.flush(
      { id: 1, username: 'gu', email: 'gu@example.com' },
      { status: 201, statusText: 'Created' },
    );

    const login = http.expectOne('/api/auth/login');
    expect(login.request.body).toEqual({ username: 'gu', password: 'S3nh4-forte' });
    login.flush({ access: 'token-r' });

    http.expectOne('/api/users/morse-settings').flush(SETTINGS);
    http.expectOne('/api/users/profile').flush(PROFILE);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual(PROFILE);
  });

  it('register: falha de validação não cria sessão nem tenta login', () => {
    let failed = false;
    service
      .register({ username: 'gu', email: 'x', password: '123' })
      .subscribe({ error: () => (failed = true) });

    http
      .expectOne('/api/auth/register')
      .flush({ password: ['Senha muito curta.'] }, { status: 400, statusText: 'Bad Request' });
    http.expectNone('/api/auth/login');

    expect(failed).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('login: falha de credenciais não autentica e propaga o erro', () => {
    let failed = false;
    service
      .login({ username: 'gu', password: 'errada' })
      .subscribe({ error: () => (failed = true) });

    http
      .expectOne('/api/auth/login')
      .flush({ detail: 'invalid' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('refresh: chamadas simultâneas compartilham uma única requisição HTTP', () => {
    service.refresh().subscribe();
    service.refresh().subscribe();

    const refresh = http.expectOne('/api/auth/refresh');
    expect(refresh.request.withCredentials).toBe(true);
    expect(refresh.request.headers.get('X-CSRF-Protection')).toBe('1');
    refresh.flush({ access: 'token-2' });

    expect(service.accessToken()).toBe('token-2');
  });

  it('bootstrap: restaura a sessão a partir do cookie de refresh', async () => {
    const done = service.bootstrap();

    http.expectOne('/api/auth/refresh').flush({ access: 'token-3' });
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);
    http.expectOne('/api/users/profile').flush(PROFILE);

    await done;
    expect(service.isAuthenticated()).toBe(true);
    expect(TestBed.inject(MorseSettingsService).settings()).toEqual(SETTINGS);
    expect(service.currentUser()).toEqual(PROFILE);
  });

  it('bootstrap: sem cookie válido, resolve sem erro e segue deslogado', async () => {
    const done = service.bootstrap();

    http
      .expectOne('/api/auth/refresh')
      .flush({ detail: 'no cookie' }, { status: 401, statusText: 'Unauthorized' });

    await expect(done).resolves.toBeUndefined();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('logout: descarta o token, limpa as preferências e navega para /login', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    service.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush({ access: 'token-4' });
    http.expectNone('/api/users/morse-settings');
    TestBed.inject(MorseSettingsService).load();
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);

    service.logout().subscribe();
    const logout = http.expectOne('/api/auth/logout');
    expect(logout.request.withCredentials).toBe(true);
    expect(logout.request.headers.get('X-CSRF-Protection')).toBe('1');
    logout.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.isAuthenticated()).toBe(false);
    expect(TestBed.inject(MorseSettingsService).settings()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('logout: encerra a sessão local mesmo se a chamada ao backend falhar', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    service.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush({ access: 'token-5' });

    service.logout().subscribe();
    http
      .expectOne('/api/auth/logout')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(service.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
