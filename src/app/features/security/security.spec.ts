import { render, screen } from '@testing-library/angular';

import { Security } from './security';

describe('Security', () => {
  it('renderiza o título, o resumo da política e o link para o GitHub', async () => {
    await render(Security);

    expect(screen.getByRole('heading', { name: 'Segurança' })).toBeVisible();
    expect(
      screen.getByText(/entregue continuamente a partir da branch de produção/i),
    ).toBeVisible();
    expect(screen.getByText(/não abra uma issue pública/i)).toBeVisible();

    const link = screen.getByRole('link', { name: 'Ver política completa no GitHub' });
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/Gustavo0121/learn-morse-code-frontend/security/policy',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
