import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { MorseAudioService } from '../../services/morse-audio.service';
import { UserMorseSettings } from '../../services/morse-settings.service';
import { Settings } from './settings';

const SETTINGS: UserMorseSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
  input_key: 'Space',
};

const ALLOWED_KEYS = [
  { code: 'Enter' },
  { code: 'KeyA' },
  { code: 'KeyD' },
  { code: 'KeyS' },
  { code: 'Space' },
];

describe('Settings', () => {
  async function setup({ allowedKeysFail = false } = {}) {
    await render(Settings, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    const keys = http.expectOne('/api/morse-settings/allowed-keys');
    if (allowedKeysFail) {
      keys.flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
    } else {
      keys.flush(ALLOWED_KEYS);
    }
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);

    return { http, user: userEvent.setup() };
  }

  it('exibe as preferências carregadas com as opções do backend selecionadas', async () => {
    await setup();

    expect(await screen.findByRole('button', { name: '20' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /médio · 700 hz/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'sine' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('oferece apenas as teclas da whitelist do servidor', async () => {
    await setup();

    for (const { code } of ALLOWED_KEYS) {
      expect(await screen.findByRole('button', { name: code })).toBeVisible();
    }
    expect(screen.queryByRole('button', { name: 'KeyZ' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Space' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sem a whitelist, não oferece seleção de tecla e explica o motivo', async () => {
    await setup({ allowedKeysFail: true });

    expect(
      await screen.findByText('Não foi possível carregar as teclas permitidas.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Space' })).not.toBeInTheDocument();
  });

  it('salva alterações somente após confirmação visual', async () => {
    const { http, user } = await setup();

    await user.click(await screen.findByRole('button', { name: '40' }));
    await user.click(screen.getByRole('button', { name: 'KeyA' }));

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Confirmar alterações nas preferências?')).toBeVisible();
    http.expectNone('/api/users/morse-settings');

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const put = http.expectOne('/api/users/morse-settings');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ ...SETTINGS, speed_wpm: 40, input_key: 'KeyA' });
    put.flush({ ...SETTINGS, speed_wpm: 40, input_key: 'KeyA' });

    expect(await screen.findByRole('status')).toHaveTextContent('Preferências salvas.');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('cancelar a confirmação não envia nada ao backend', async () => {
    const { http, user } = await setup();

    await user.click(await screen.findByRole('button', { name: '40' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    http.expectNone('/api/users/morse-settings');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('exibe a mensagem de validação do backend quando o save falha', async () => {
    const { http, user } = await setup();

    await user.click(await screen.findByRole('button', { name: 'KeyA' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    http
      .expectOne('/api/users/morse-settings')
      .flush(
        { input_key: ['Tecla não permitida. Consulte a lista de teclas válidas.'] },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(await screen.findByRole('alert')).toHaveTextContent('Tecla não permitida.');
  });

  it('Test sound toca uma sequência Morse com o rascunho atual', async () => {
    const { user } = await setup();
    const playSequence = vi
      .spyOn(TestBed.inject(MorseAudioService), 'playSequence')
      .mockResolvedValue(undefined);

    await user.click(await screen.findByRole('button', { name: /grave · 400 hz/i }));
    await user.click(screen.getByRole('button', { name: '40' }));
    await user.click(screen.getByRole('button', { name: 'Test sound' }));

    expect(playSequence).toHaveBeenCalledWith(
      '.-.. -- -.-.',
      expect.objectContaining({ frequency: 400, speed_wpm: 40 }),
    );
  });
});
