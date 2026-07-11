import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';

import { Home } from './home';

describe('Home', () => {
  it('renderiza o hero inicial com a chamada para o treino', async () => {
    await render(Home, { providers: [provideRouter([])] });

    expect(
      screen.getByRole('heading', { level: 1, name: /master\s+the language\s+of signals/i }),
    ).toBeVisible();

    const cta = screen.getByRole('link', { name: /start training/i });
    expect(cta).toBeVisible();
    expect(cta).toHaveAttribute('href', '/dashboard');
  });
});
