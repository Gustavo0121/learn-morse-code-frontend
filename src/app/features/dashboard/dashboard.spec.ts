import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';

import { AuthService } from '../../core/auth/auth.service';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  it('exibe o usuário logado quando o perfil é carregado', async () => {
    await render(Dashboard, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);

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

    expect(await screen.findByText(/signed in as gu/i)).toBeVisible();
    http.verify();
  });
});
