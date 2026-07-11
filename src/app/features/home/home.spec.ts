import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';

import { Home } from './home';

describe('Home', () => {
  it('renderiza o título e a chamada para o treino', async () => {
    await render(Home, { providers: [provideRouter([])] });

    expect(screen.getByRole('heading', { level: 1, name: /learn morse code/i })).toBeVisible();

    const cta = screen.getByRole('link', { name: /start training/i });
    expect(cta).toBeVisible();
    expect(cta).toHaveAttribute('href', '/dashboard');
  });
});
