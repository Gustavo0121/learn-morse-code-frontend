import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { AuthService } from '../../core/auth/auth.service';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  async function setup() {
    await render(Dashboard, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return {
      http: TestBed.inject(HttpTestingController),
      auth: TestBed.inject(AuthService),
      router: TestBed.inject(Router),
      user: userEvent.setup(),
    };
  }

  it('exibe o usuário logado quando o perfil é carregado', async () => {
    const { http, auth } = await setup();

    const done = auth.bootstrap();
    http.expectOne('/api/auth/refresh').flush({ access: 'token' });
    http.expectOne('/api/users/morse-settings').flush({
      speed_wpm: 20,
      frequency: 700,
      volume: 0.8,
      wave_type: 'sine',
      input_key: 'Space',
    });
    http.expectOne('/api/users/profile').flush({
      id: 1,
      username: 'gu',
      email: 'gu@example.com',
      created_at: '2026-07-11T00:00:00Z',
      updated_at: '2026-07-11T00:00:00Z',
    });
    await done;

    expect(await screen.findByText(/signed in as/i)).toBeVisible();
    expect(screen.getByText('gu')).toBeVisible();
  });

  it('sign out encerra a sessão e redireciona para o login', async () => {
    const { http, auth, router, user } = await setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await user.click(screen.getByRole('button', { name: /sign out/i }));
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
