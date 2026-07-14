import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
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

  it('com sessão, oferece dashboard, lessons, settings e sign out', async () => {
    const { http, auth } = await setup();
    authenticate(http, auth);

    expect(await screen.findByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.getByRole('link', { name: /lessons/i })).toHaveAttribute('href', '/lessons');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('alterna o idioma no seletor PT/EN e persiste a escolha', async () => {
    const { user } = await setup();
    const i18n = TestBed.inject(I18nService);

    expect(screen.getByRole('button', { name: 'PT' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(i18n.locale()).toBe('en');
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('lmc.locale')).toBe('en');

    await user.click(screen.getByRole('button', { name: 'PT' }));
    expect(i18n.locale()).toBe('pt');
  });

  it('menu hambúrguer expõe os itens por extenso e fecha ao navegar', async () => {
    const { http, auth, router, user } = await setup();
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    authenticate(http, auth);

    const toggle = await screen.findByRole('button', { name: 'Menu' });
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument();

    await user.click(toggle);

    const menu = screen.getByRole('navigation', { name: 'Menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(menu).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(within(menu).getByRole('link', { name: 'Lessons' })).toHaveAttribute('href', '/lessons');
    expect(within(menu).getByRole('link', { name: 'Practice' })).toHaveAttribute(
      'href',
      '/practice',
    );
    expect(within(menu).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(within(menu).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();

    await user.click(within(menu).getByRole('link', { name: 'Practice' }));

    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape fecha o menu hambúrguer aberto', async () => {
    const { http, auth, user } = await setup();
    authenticate(http, auth);

    await user.click(await screen.findByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('navigation', { name: 'Menu' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('sign out pelo menu hambúrguer encerra a sessão e fecha o painel', async () => {
    const { http, auth, router, user } = await setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authenticate(http, auth);

    await user.click(await screen.findByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu' });
    await user.click(within(menu).getByRole('button', { name: 'Sign out' }));
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument();
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
