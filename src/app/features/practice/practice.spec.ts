import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';

import { MorseAudioService } from '../../services/morse-audio.service';
import { MorseCharacter } from '../../services/morse-characters.service';
import { MorseSettingsService } from '../../services/morse-settings.service';
import { PracticeRecord } from '../../services/practice.service';
import { Practice } from './practice';

const CHARACTERS: MorseCharacter[] = [
  { id: 1, character: 'A', code: '.-', type: 'letter' },
  { id: 2, character: 'E', code: '.', type: 'letter' },
  { id: 3, character: 'T', code: '-', type: 'letter' },
  { id: 4, character: 'N', code: '-.', type: 'letter' },
  { id: 5, character: '5', code: '.....', type: 'number' },
  { id: 6, character: '?', code: '..--..', type: 'punctuation' },
];

function record(overrides: Partial<PracticeRecord>): PracticeRecord {
  return {
    id: 1,
    exercise_type: 'multiple_choice',
    input_method: null,
    question: 'A',
    expected_answer: '.-',
    user_answer: '.-',
    correct: true,
    response_time: 1500,
    created_at: '2026-07-12T00:00:00Z',
    ...overrides,
  };
}

describe('Practice', () => {
  let now: number;

  /** Fake timers sem tocar em performance.now (controlado via spy manual). */
  function useTimers(): void {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  }

  async function setup() {
    const view = await render(Practice, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const detectChanges = (): void => view.detectChanges();

    // Math.random = 0 → sempre sorteia o primeiro caractere ('A').
    vi.spyOn(Math, 'random').mockReturnValue(0);
    now = 10_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const settings = TestBed.inject(MorseSettingsService);
    settings.load();
    http.expectOne('/api/users/morse-settings').flush({
      speed_wpm: 20,
      frequency: 700,
      volume: 0.8,
      wave_type: 'sine',
      input_key: 'Space',
    });
    http.expectOne('/api/morse-characters').flush(CHARACTERS);

    // Aguarda a tela de seleção de modos renderizar após os flushes.
    await screen.findByRole('button', { name: /key capture/i });

    return { http, detectChanges };
  }

  function press(durationMs: number): void {
    fireEvent(window, new KeyboardEvent('keydown', { code: 'Space', cancelable: true }));
    now += durationMs;
    fireEvent(window, new KeyboardEvent('keyup', { code: 'Space', cancelable: true }));
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('fluxo completo de key_capture: captura → classificação → envio → feedback', async () => {
    const { http, detectChanges } = await setup();
    useTimers();

    fireEvent.click(screen.getByRole('button', { name: /key capture/i }));

    expect(screen.getByText('A')).toBeVisible();
    expect(screen.getByText(/pressione space/i)).toBeVisible();

    press(100); // "." (< 120 ms a 20 WPM)
    now += 200;
    press(200); // "-" (≥ 120 ms)
    expect(screen.getByText('.-')).toBeVisible();

    await vi.advanceTimersByTimeAsync(700); // gap de auto-envio

    const post = http.expectOne('/api/practice/history');
    expect(post.request.body).toEqual({
      exercise_type: 'key_capture',
      input_method: 'Space',
      question: 'A',
      expected_answer: '.-',
      press_durations: [100, 200],
      response_time: 500,
    });
    post.flush(record({ exercise_type: 'key_capture', input_method: 'Space' }), {
      status: 201,
      statusText: 'Created',
    });
    detectChanges();

    expect(screen.getByText('Correto')).toBeVisible();
    expect(screen.getByText(/tempo de resposta: 1\.5s/i)).toBeVisible();
    expect(screen.getByText(/precisão: 100%/i)).toBeVisible();
  });

  it('pressionamento longo demais é descartado com aviso e fica fora do envio', async () => {
    const { http, detectChanges } = await setup();
    useTimers();

    fireEvent.click(screen.getByRole('button', { name: /key capture/i }));
    expect(screen.getByText('A')).toBeVisible();

    press(400); // ≥ 360 ms a 20 WPM: backend rejeitaria
    expect(screen.getByRole('alert')).toHaveTextContent('longo demais');

    press(100);
    await vi.advanceTimersByTimeAsync(700);

    const post = http.expectOne('/api/practice/history');
    expect(post.request.body).toMatchObject({ press_durations: [100] });
    post.flush(record({ correct: false, user_answer: '.' }), {
      status: 201,
      statusText: 'Created',
    });
    detectChanges();

    expect(screen.getByText('Errado')).toBeVisible();
    expect(screen.getByText(/precisão: 0%/i)).toBeVisible();
  });

  it('texto → Morse envia multiple_choice com a opção escolhida e segue para o próximo round', async () => {
    const { http } = await setup();

    fireEvent.click(screen.getByRole('button', { name: /texto → morse/i }));

    expect(await screen.findByText('A')).toBeVisible();
    now += 2500;
    fireEvent.click(screen.getByRole('button', { name: '.-' }));

    const post = http.expectOne('/api/practice/history');
    expect(post.request.body).toEqual({
      exercise_type: 'multiple_choice',
      question: 'A',
      expected_answer: '.-',
      user_answer: '.-',
      response_time: 2500,
    });
    post.flush(record({}), { status: 201, statusText: 'Created' });

    expect(await screen.findByText('Correto')).toBeVisible();

    // Enter na tela de resultado aciona o Next.
    fireEvent(window, new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    expect(await screen.findByText(/qual é o código\?/i)).toBeVisible();
  });

  it('listening toca o código no Play e envia a resposta como listening', async () => {
    const { http } = await setup();
    const playSequence = vi
      .spyOn(TestBed.inject(MorseAudioService), 'playSequence')
      .mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: /listening/i }));

    fireEvent.click(await screen.findByRole('button', { name: /play code/i }));
    expect(playSequence).toHaveBeenCalledWith('.-', expect.objectContaining({ speed_wpm: 20 }));

    fireEvent.click(screen.getByRole('button', { name: 'A' }));

    const post = http.expectOne('/api/practice/history');
    expect(post.request.body).toEqual({
      exercise_type: 'listening',
      question: '.-',
      expected_answer: 'A',
      user_answer: 'A',
      response_time: 1,
    });
    post.flush(
      record({
        exercise_type: 'listening',
        question: '.-',
        expected_answer: 'A',
        user_answer: 'A',
      }),
      { status: 201, statusText: 'Created' },
    );

    expect(await screen.findByText('Correto')).toBeVisible();
  });

  it('erro de rede no envio permite tentar de novo com o mesmo payload', async () => {
    const { http } = await setup();

    fireEvent.click(screen.getByRole('button', { name: /texto → morse/i }));
    fireEvent.click(await screen.findByRole('button', { name: '.-' }));

    http
      .expectOne('/api/practice/history')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível registrar a tentativa.',
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    const retry = http.expectOne('/api/practice/history');
    expect(retry.request.body).toMatchObject({
      exercise_type: 'multiple_choice',
      question: 'A',
      user_answer: '.-',
    });
    retry.flush(record({}), { status: 201, statusText: 'Created' });

    expect(await screen.findByText('Correto')).toBeVisible();
  });

  it('sorteia só letras por padrão; ligar Numbers amplia o sorteio e reinicia a sessão', async () => {
    await setup();

    fireEvent.click(screen.getByRole('button', { name: /texto → morse/i }));
    // random = 0.9 → último caractere do pool: 'N' só com letras, '5' com números.
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    fireEvent.click(screen.getByRole('button', { name: /^numbers$/i }));

    expect(await screen.findByText('5')).toBeVisible();
    expect(screen.getByRole('button', { name: /^numbers$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('mudar a configuração nas barras reinicia a sessão (contadores zerados)', async () => {
    const { http } = await setup();

    fireEvent.click(screen.getByRole('button', { name: /texto → morse/i }));
    fireEvent.click(await screen.findByRole('button', { name: '.-' }));
    http.expectOne('/api/practice/history').flush(record({}), {
      status: 201,
      statusText: 'Created',
    });
    expect(await screen.findByText(/precisão: 100%/i)).toBeVisible();
    expect(screen.getByText('1/10')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /^punctuation$/i }));

    expect(await screen.findByText(/precisão: —/i)).toBeVisible();
    expect(screen.getByText('0/10')).toBeVisible();
    expect(screen.queryByText('Correto')).not.toBeInTheDocument();
  });

  it('sessão por caracteres termina na meta e mostra o resumo com Restart', async () => {
    const { http } = await setup();

    fireEvent.click(screen.getByRole('button', { name: /texto → morse/i }));

    for (let attempt = 1; attempt <= 10; attempt++) {
      fireEvent.click(await screen.findByRole('button', { name: '.-' }));
      http.expectOne('/api/practice/history').flush(record({}), {
        status: 201,
        statusText: 'Created',
      });
      if (attempt < 10) {
        fireEvent.click(await screen.findByRole('button', { name: /next/i }));
      }
    }

    expect(await screen.findByText('Sessão concluída')).toBeVisible();
    expect(screen.getByText('100%')).toBeVisible();
    // 10 tentativas de 1500 ms → 10 × 60000 / 15000 = 40 cpm (fórmula do backend).
    expect(screen.getByText('40.0 cpm')).toBeVisible();
    expect(screen.getByText('Characters · 10')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(await screen.findByText(/qual é o código\?/i)).toBeVisible();
    expect(screen.getByText('0/10')).toBeVisible();
  });

  it('sessão por tempo só conta a partir do primeiro input e expira no resumo', async () => {
    const { http, detectChanges } = await setup();
    useTimers();

    fireEvent.click(screen.getByRole('button', { name: /texto → morse/i }));
    fireEvent.click(screen.getByRole('button', { name: /^time$/i }));
    expect(screen.getByText(/tempo: 01:00/i)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '15' }));

    // Sem input do usuário, o relógio não anda: segue mostrando a meta cheia.
    now += 5_000;
    await vi.advanceTimersByTimeAsync(5_000);
    detectChanges();
    expect(screen.getByText(/tempo: 00:15/i)).toBeVisible();

    // Primeiro input (resposta) dispara a contagem regressiva.
    fireEvent.click(screen.getByRole('button', { name: '.-' }));
    http.expectOne('/api/practice/history').flush(record({}), {
      status: 201,
      statusText: 'Created',
    });
    detectChanges();

    now += 15_000;
    await vi.advanceTimersByTimeAsync(500);
    detectChanges();

    expect(screen.getByText('Sessão concluída')).toBeVisible();
    expect(screen.getByText('100%')).toBeVisible();
    expect(screen.getByText('1/1')).toBeVisible();
    expect(screen.getByText('Time · 15s')).toBeVisible();
    expect(screen.getByText('00:15')).toBeVisible();
    expect(screen.getByText('40.0 cpm')).toBeVisible();

    // Enter no resumo aciona o Restart.
    fireEvent(window, new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    detectChanges();
    expect(screen.getByText(/qual é o código\?/i)).toBeVisible();
    expect(screen.getByText(/tempo: 00:15/i)).toBeVisible();
  });

  it('exibe a seleção de modos com os quatro modos do produto', async () => {
    await setup();

    expect(screen.getByRole('button', { name: /key capture/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /texto → morse/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /morse → texto/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /listening/i })).toBeVisible();
  });
});
