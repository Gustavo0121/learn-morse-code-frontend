import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { AuthService } from '../../core/auth/auth.service';
import { PracticeRecord } from '../../services/practice.service';
import { UserStatistics } from '../../services/statistics.service';
import { Dashboard } from './dashboard';

const STATS: UserStatistics = {
  characters_seen: 40,
  characters_correct: 38,
  accuracy: 0.95,
  average_speed: 12.5,
  training_time: 192_000,
  updated_at: '2026-07-12T00:00:00Z',
};

const EMPTY_STATS: UserStatistics = {
  characters_seen: 0,
  characters_correct: 0,
  accuracy: 0,
  average_speed: 0,
  training_time: 0,
  updated_at: '2026-07-12T00:00:00Z',
};

const HISTORY: PracticeRecord[] = [
  {
    id: 2,
    exercise_type: 'key_capture',
    input_method: 'Space',
    question: 'A',
    expected_answer: '.-',
    user_answer: '.-',
    correct: true,
    response_time: 1500,
    created_at: '2026-07-12T10:30:00Z',
  },
  {
    id: 1,
    exercise_type: 'listening',
    input_method: null,
    question: '-.-.',
    expected_answer: 'C',
    user_answer: 'E',
    correct: false,
    response_time: 2300,
    created_at: '2026-07-11T09:00:00Z',
  },
];

describe('Dashboard', () => {
  async function setup() {
    const view = await render(Dashboard, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return { view, http: TestBed.inject(HttpTestingController), user: userEvent.setup() };
  }

  function flushAll(
    http: HttpTestingController,
    stats: UserStatistics = STATS,
    history: PracticeRecord[] = HISTORY,
  ) {
    http.expectOne('/api/users/statistics').flush(stats);
    http.expectOne('/api/practice/history').flush(history);
  }

  it('exibe o usuário logado quando o perfil é carregado', async () => {
    const { http } = await setup();
    flushAll(http);
    const auth = TestBed.inject(AuthService);

    const done = auth.bootstrap();
    http.expectOne('/api/auth/refresh').flush({ access: 'token' });
    http.expectOne('/api/users/morse-settings').flush({
      speed_wpm: 20,
      frequency: 700,
      volume: 0.8,
      wave_type: 'sine',
      input_key: 'Space',
    });
    http.expectOne('/api/users/profile').flush({
      id: 1,
      username: 'gu',
      email: 'gu@example.com',
      created_at: '2026-07-11T00:00:00Z',
      updated_at: '2026-07-11T00:00:00Z',
    });
    await done;

    expect(await screen.findByRole('heading', { level: 1, name: 'gu' })).toBeVisible();
    expect(screen.getByText('Dashboard')).toBeVisible();
    http.verify();
  });

  it('exibe estatísticas formatadas e os últimos treinamentos', async () => {
    const { http } = await setup();

    expect(screen.getByText('Carregando estatísticas…')).toBeVisible();
    expect(screen.getByText('Carregando histórico…')).toBeVisible();
    flushAll(http);

    expect(await screen.findByText('95%')).toBeVisible();
    expect(screen.getByText('12.5 cpm')).toBeVisible();
    expect(screen.getByText('3min 12s')).toBeVisible();
    expect(screen.getByText('38/40')).toBeVisible();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Acerto');
    expect(items[0]).toHaveTextContent('Key capture · 1.5s');
    expect(items[1]).toHaveTextContent('Erro');
    expect(items[1]).toHaveTextContent('-.-.');
    expect(items[1]).toHaveTextContent('Listening · 2.3s');
    http.verify();
  });

  it('exibe estado vazio com chamada para treinar quando não há histórico', async () => {
    const { http } = await setup();
    flushAll(http, EMPTY_STATS, []);

    expect(await screen.findByText(/nenhum treinamento registrado ainda/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /start training/i })).toHaveAttribute(
      'href',
      '/practice',
    );
    // Sem tentativas, precisão e velocidade não têm valor significativo.
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('0/0')).toBeVisible();
    http.verify();
  });

  it('exibe erro por bloco e refaz cada busca no Try again', async () => {
    const { http, user } = await setup();

    http
      .expectOne('/api/users/statistics')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
    http
      .expectOne('/api/practice/history')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(await screen.findByText('Não foi possível carregar as estatísticas.')).toBeVisible();
    expect(screen.getByText('Não foi possível carregar o histórico.')).toBeVisible();

    const [retryStats, retryHistory] = screen.getAllByRole('button', { name: /try again/i });
    await user.click(retryStats);
    http.expectOne('/api/users/statistics').flush(STATS);
    expect(await screen.findByText('95%')).toBeVisible();

    await user.click(retryHistory);
    http.expectOne('/api/practice/history').flush(HISTORY);
    expect(await screen.findByText('Key capture · 1.5s')).toBeVisible();
    http.verify();
  });
});
