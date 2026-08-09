import { render, screen } from '@testing-library/angular';

import { Privacy } from './privacy';

describe('Privacy', () => {
  it('renderiza o título e os parágrafos de política de privacidade', async () => {
    await render(Privacy);

    expect(screen.getByRole('heading', { name: 'Política de privacidade' })).toBeVisible();
    expect(screen.getByText(/coletamos apenas os dados necessários/i)).toBeVisible();
    expect(screen.getByText(/token de acesso vive apenas em memória/i)).toBeVisible();
  });
});
