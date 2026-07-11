import { render, screen } from '@testing-library/angular';
import { Heading } from './heading';

describe('Heading', () => {
  it('renderiza um h1 por padrão com o texto informado', async () => {
    await render('<app-heading text="Master the language of signals" />', {
      imports: [Heading],
    });

    expect(
      screen.getByRole('heading', { level: 1, name: /master the language of signals/i }),
    ).toBeVisible();
  });

  it('renderiza um h2 quando level é 2', async () => {
    await render('<app-heading text="Settings" [level]="2" />', { imports: [Heading] });

    expect(screen.getByRole('heading', { level: 2, name: /settings/i })).toBeVisible();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('exibe o eyebrow quando informado', async () => {
    await render('<app-heading text="Practice" eyebrow="-- --- .-. ... ." />', {
      imports: [Heading],
    });

    expect(screen.getByText('-- --- .-. ... .')).toBeVisible();
  });
});
