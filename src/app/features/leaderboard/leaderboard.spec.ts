import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { LeaderboardEntry } from '../../services/leaderboard.service';
import { Leaderboard } from './leaderboard';

const ENTRIES: LeaderboardEntry[] = [
  { position: 1, username: 'gu', accuracy: 0.9, cpm: 50, score: 140 },
  { position: 2, username: 'ana', accuracy: 0.8, cpm: 40, score: 120 },
];

describe('Leaderboard', () => {
  async function setup() {
    await render(Leaderboard, {
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return { http: TestBed.inject(HttpTestingController), user: userEvent.setup() };
  }

  function matchRequest(speed_wpm: string, exercise_type: string, period: string) {
    return (req: { url: string; params: { get: (key: string) => string | null } }) =>
      req.url === '/api/leaderboard' &&
      req.params.get('speed_wpm') === speed_wpm &&
      req.params.get('exercise_type') === exercise_type &&
      req.params.get('period') === period;
  }

  it('carrega o ranking com os filtros default (20 wpm, key capture, geral)', async () => {
    const { http } = await setup();

    http.expectOne(matchRequest('20', 'key_capture', 'general')).flush(ENTRIES);

    expect(await screen.findByText('gu')).toBeVisible();
    expect(screen.getByText('ana')).toBeVisible();
    expect(screen.getByText('90%')).toBeVisible();
    expect(screen.getByText('50.0')).toBeVisible();
    expect(screen.getByText('140.0')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Speed' })).toHaveValue('20');
    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('key_capture');
    expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('general');
  });

  it('trocar a velocidade dispara uma nova busca com o filtro atualizado', async () => {
    const { http, user } = await setup();
    http.expectOne(matchRequest('20', 'key_capture', 'general')).flush(ENTRIES);
    await screen.findByText('gu');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Speed' }), '25');

    http.expectOne(matchRequest('25', 'key_capture', 'general')).flush([]);
    expect(await screen.findByText(/ninguém no ranking/i)).toBeVisible();
  });

  it('trocar o modo dispara uma nova busca com o filtro atualizado', async () => {
    const { http, user } = await setup();
    http.expectOne(matchRequest('20', 'key_capture', 'general')).flush(ENTRIES);
    await screen.findByText('gu');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Mode' }), 'listening');

    http.expectOne(matchRequest('20', 'listening', 'general')).flush([]);
    expect(await screen.findByText(/ninguém no ranking/i)).toBeVisible();
  });

  it('trocar o período dispara uma nova busca com o filtro atualizado', async () => {
    const { http, user } = await setup();
    http.expectOne(matchRequest('20', 'key_capture', 'general')).flush(ENTRIES);
    await screen.findByText('gu');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Period' }), 'weekly');

    http.expectOne(matchRequest('20', 'key_capture', 'weekly')).flush([]);
    expect(await screen.findByText(/ninguém no ranking/i)).toBeVisible();
  });

  it('lista vazia mostra o estado vazio', async () => {
    const { http } = await setup();

    http.expectOne(matchRequest('20', 'key_capture', 'general')).flush([]);

    expect(await screen.findByText(/ninguém no ranking/i)).toBeVisible();
  });

  it('erro na busca oferece retry', async () => {
    const { http, user } = await setup();
    http
      .expectOne(matchRequest('20', 'key_capture', 'general'))
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o ranking.',
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));

    http.expectOne(matchRequest('20', 'key_capture', 'general')).flush(ENTRIES);
    expect(await screen.findByText('gu')).toBeVisible();
  });
});
