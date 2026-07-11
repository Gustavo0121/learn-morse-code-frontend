import { render, screen } from '@testing-library/angular';
import { App } from './app';

describe('App', () => {
  it('renderiza o hero inicial', async () => {
    await render(App);

    expect(
      screen.getByRole('heading', { level: 1, name: /master\s+the language\s+of signals/i }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /start training/i })).toBeVisible();
  });
});
