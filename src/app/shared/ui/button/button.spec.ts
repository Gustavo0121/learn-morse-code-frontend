import { render, screen } from '@testing-library/angular';
import { Button } from './button';

describe('Button', () => {
  it('renderiza um botão nativo acessível com o conteúdo projetado', async () => {
    await render('<button app-button>Start Training</button>', { imports: [Button] });

    expect(screen.getByRole('button', { name: /start training/i })).toBeVisible();
  });

  it('aplica a variante sólida (alto contraste) por padrão', async () => {
    await render('<button app-button>Save</button>', { imports: [Button] });

    expect(screen.getByRole('button')).toHaveClass('bg-ink', 'text-canvas');
  });

  it('aplica classes da variante e tamanho informados', async () => {
    await render('<button app-button variant="outline" size="lg">Save</button>', {
      imports: [Button],
    });

    const button = screen.getByRole('button');
    expect(button).toHaveClass('border', 'border-ink', 'px-12');
  });
});
