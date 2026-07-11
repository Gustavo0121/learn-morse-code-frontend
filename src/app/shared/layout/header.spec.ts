import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { AuthService } from '../../core/auth/auth.service';
import { Header } from './header';

describe('Header', () => {
  async function setup() {
    await render(Header, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return {
      http: TestBed.inject(HttpTestingController),
      auth: TestBed.inject(AuthService),
      router: TestBed.inject(Router),
      user: userEvent.setup(),
    };
  }

  function authenticate(http: HttpTestingController, auth: AuthService): void {
    auth.refresh().subscribe();
    http.expectOne('/api/auth/refresh').flush({ access: 'token' });
  }

  it('exibe a marca LMC apontando para a home', async () => {
    await setup();

    const brand = screen.getByRole('link', { name: /lmc/i });
    expect(brand).toHaveAttribute('href', '/');
    expect(brand).toHaveTextContent('Learn Morse Code');
  });

  it('sem sessão, oferece apenas o link de sign in', async () => {
    await setup();

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('com sessão, oferece dashboard e sign out', async () => {
    const { http, auth } = await setup();
    authenticate(http, auth);

    expect(await screen.findByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('sign out encerra a sessão e redireciona para o login', async () => {
    const { http, auth, router, user } = await setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authenticate(http, auth);

    await user.click(await screen.findByRole('button', { name: /sign out/i }));
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
