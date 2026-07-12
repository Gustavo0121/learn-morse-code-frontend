import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { Lesson } from '../../services/lessons.service';
import { MorseAudioService } from '../../services/morse-audio.service';
import { MorseCharacter } from '../../services/morse-characters.service';
import { LessonDetail } from './lesson-detail';

const LESSON: Lesson = {
  id: 3,
  title: 'Vogais',
  description: 'A, E, I, O e U em código Morse.',
  difficulty: 2,
  order: 3,
  created_at: '2026-07-01T00:00:00Z',
};

const CHARACTERS: MorseCharacter[] = [
  { id: 1, character: 'A', code: '.-', type: 'letter' },
  { id: 2, character: 'E', code: '.', type: 'letter' },
  { id: 3, character: '5', code: '.....', type: 'number' },
];

describe('LessonDetail', () => {
  async function setup() {
    await render(LessonDetail, {
      inputs: { id: '3' },
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return { http: TestBed.inject(HttpTestingController), user: userEvent.setup() };
  }

  it('carrega a lição da rota e exibe o alfabeto agrupado', async () => {
    const { http } = await setup();

    http.expectOne('/api/lessons/3').flush(LESSON);
    http.expectOne('/api/morse-characters').flush(CHARACTERS);

    expect(await screen.findByRole('heading', { level: 1, name: /vogais/i })).toBeVisible();
    expect(screen.getByText('Lesson 03')).toBeVisible();
    expect(screen.getByText(/a, e, i, o e u/i)).toBeVisible();
    expect(screen.getByText('Nível 2')).toBeVisible();

    expect(screen.getByText('Letras')).toBeVisible();
    expect(screen.getByText('Números')).toBeVisible();
    expect(screen.queryByText('Pontuação')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvir A' })).toBeVisible();

    expect(screen.getByRole('link', { name: /all lessons/i })).toHaveAttribute('href', '/lessons');
  });

  it('clicar em um caractere toca o código dele', async () => {
    const { http, user } = await setup();
    const playSequence = vi
      .spyOn(TestBed.inject(MorseAudioService), 'playSequence')
      .mockResolvedValue(undefined);

    http.expectOne('/api/lessons/3').flush(LESSON);
    http.expectOne('/api/morse-characters').flush(CHARACTERS);

    await user.click(await screen.findByRole('button', { name: 'Ouvir A' }));

    expect(playSequence).toHaveBeenCalledWith('.-', expect.objectContaining({ speed_wpm: 20 }));
  });

  it('exibe erro da lição com Try again refazendo a busca', async () => {
    const { http, user } = await setup();

    http
      .expectOne('/api/lessons/3')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
    http.expectOne('/api/morse-characters').flush(CHARACTERS);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a lição.',
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));
    http.expectOne('/api/lessons/3').flush(LESSON);

    expect(await screen.findByRole('heading', { level: 1, name: /vogais/i })).toBeVisible();
  });

  it('falha no alfabeto não derruba a lição e permite nova tentativa', async () => {
    const { http, user } = await setup();

    http.expectOne('/api/lessons/3').flush(LESSON);
    http
      .expectOne('/api/morse-characters')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(await screen.findByRole('heading', { level: 1, name: /vogais/i })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o alfabeto Morse.',
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));
    http.expectOne('/api/morse-characters').flush(CHARACTERS);

    expect(await screen.findByText('Letras')).toBeVisible();
  });
});
