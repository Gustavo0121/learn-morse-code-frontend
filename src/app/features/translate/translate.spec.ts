import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { AuthService } from '../../core/auth/auth.service';
import { MorseAudioService } from '../../services/morse-audio.service';
import { Translate } from './translate';

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  return { writeText };
}

async function setup() {
  await render(Translate, {
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  return {
    http: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AuthService),
    user: userEvent.setup(),
  };
}

function authenticate(http: HttpTestingController, auth: AuthService): void {
  auth.refresh().subscribe();
  http.expectOne('/api/auth/refresh').flush({ access: 'token' });
}

describe('Translate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('traduz texto para Morse ao vivo, sem botão de traduzir', async () => {
    const { user } = await setup();

    await user.type(screen.getByLabelText('Text'), 'SOS');

    expect(screen.getByLabelText('Morse')).toHaveValue('... --- ...');
    expect(screen.queryByRole('button', { name: /traduzir/i })).not.toBeInTheDocument();
  });

  it('traduz Morse para texto ao vivo', async () => {
    const { user } = await setup();

    await user.type(screen.getByLabelText('Morse'), '... --- ...');

    expect(screen.getByLabelText('Text')).toHaveValue('SOS');
  });

  it('mostra aviso apenas quando há caractere sem código Morse', async () => {
    const { user } = await setup();

    expect(screen.queryByText(/sem código morse/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Text'), 'A~B');

    expect(screen.getByText(/sem código morse.*~/i)).toBeVisible();
  });

  it('mostra aviso apenas quando há sequência Morse inválida', async () => {
    const { user } = await setup();

    expect(screen.queryByText(/sequência inválida/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Morse'), '... ......... ---');

    expect(screen.getByText(/sequência inválida/i)).toBeVisible();
  });

  it('copia o valor atual do campo texto e mostra confirmação temporária', async () => {
    const { user } = await setup();
    const { writeText } = stubClipboard();

    await user.type(screen.getByLabelText('Text'), 'SOS');
    await user.click(screen.getAllByRole('button', { name: /copiar/i })[0]);

    expect(writeText).toHaveBeenCalledWith('SOS');
    expect(await screen.findByText('Copiado!')).toBeVisible();

    await waitFor(() => expect(screen.queryByText('Copiado!')).not.toBeInTheDocument(), {
      timeout: 2000,
    });
  });

  it('toca a sequência Morse derivada com as configurações padrão para visitante anônimo', async () => {
    const { user } = await setup();
    const playSequence = vi
      .spyOn(TestBed.inject(MorseAudioService), 'playSequence')
      .mockResolvedValue(undefined);

    await user.type(screen.getByLabelText('Text'), 'SOS');
    await user.click(screen.getByRole('button', { name: /ouvir a sequência morse/i }));

    expect(playSequence).toHaveBeenCalledWith(
      '... --- ...',
      expect.objectContaining({ speed_wpm: 20 }),
    );
  });

  it('oferece o CTA de criar conta apenas para visitante anônimo', async () => {
    await setup();

    expect(screen.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  it('não oferece o CTA de criar conta para usuário autenticado', async () => {
    const { http, auth } = await setup();
    authenticate(http, auth);

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument(),
    );
  });
});
