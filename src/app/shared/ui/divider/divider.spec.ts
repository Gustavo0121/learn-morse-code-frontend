import { render, screen } from '@testing-library/angular';
import { Divider } from './divider';

describe('Divider', () => {
  it('renderiza como separador sem rótulo por padrão', async () => {
    await render('<app-divider />', { imports: [Divider] });

    const separator = screen.getByRole('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).not.toHaveAccessibleName();
  });

  it('exibe o rótulo em caixa alta quando informado', async () => {
    await render('<app-divider label="Training" />', { imports: [Divider] });

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAccessibleName('Training');
    expect(screen.getByText('Training')).toBeVisible();
  });
});
