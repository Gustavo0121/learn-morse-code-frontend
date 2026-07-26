import { render, screen } from '@testing-library/angular';

import { Terms } from './terms';

describe('Terms', () => {
  it('renderiza o título e os parágrafos de termos de serviço', async () => {
    await render(Terms);

    expect(screen.getByRole('heading', { name: 'Termos de serviço' })).toBeVisible();
    expect(screen.getByText(/projeto pessoal e educacional/i)).toBeVisible();
    expect(screen.getByText(/fornecido como está/i)).toBeVisible();
  });
});
