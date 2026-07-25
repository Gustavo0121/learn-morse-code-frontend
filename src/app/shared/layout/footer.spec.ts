import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';

import { I18nService } from '../../core/i18n/i18n.service';
import { Footer } from './footer';

describe('Footer', () => {
  async function setup() {
    const { fixture } = await render(Footer, { providers: [provideRouter([])] });
    return { i18n: TestBed.inject(I18nService), fixture };
  }

  it('exibe os cinco links institucionais com os destinos corretos', async () => {
    await setup();

    const github = screen.getByRole('link', { name: 'GitHub' });
    expect(github).toHaveAttribute(
      'href',
      'https://github.com/Gustavo0121/learn-morse-code-frontend',
    );
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.getByRole('link', { name: 'Contato' })).toHaveAttribute(
      'href',
      'mailto:gus0512san@gmail.com',
    );
    expect(screen.getByRole('link', { name: 'Termos de serviço' })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'Segurança' })).toHaveAttribute('href', '/security');
  });

  it('atualiza os rótulos ao trocar de idioma', async () => {
    const { i18n, fixture } = await setup();

    i18n.setLocale('en');
    fixture.detectChanges();

    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      'mailto:gus0512san@gmail.com',
    );
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('href', '/security');
  });

  it('está dentro de um footer semântico', async () => {
    await setup();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
