import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { Lesson } from '../../services/lessons.service';
import { Lessons } from './lessons';

const LESSONS: Lesson[] = [
  {
    id: 1,
    title: 'Primeiros sinais',
    description: 'E e T — os códigos mais curtos.',
    difficulty: 1,
    order: 1,
    characters: [],
    created_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Vogais',
    description: '',
    difficulty: 2,
    order: 2,
    characters: [],
    created_at: '2026-07-02T00:00:00Z',
  },
];

describe('Lessons', () => {
  async function setup() {
    await render(Lessons, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return { http: TestBed.inject(HttpTestingController), user: userEvent.setup() };
  }

  it('exibe estado de carregamento e depois a trilha ordenada com nível e link', async () => {
    const { http } = await setup();

    expect(screen.getByText('Carregando lições…')).toBeVisible();
    http.expectOne('/api/lessons').flush(LESSONS);

    const first = await screen.findByRole('link', { name: /primeiros sinais/i });
    expect(first).toHaveAttribute('href', '/lessons/1');
    expect(first).toHaveTextContent('01');
    expect(first).toHaveTextContent('Nível 1');
    expect(screen.getByRole('link', { name: /vogais/i })).toHaveAttribute('href', '/lessons/2');
  });

  it('exibe estado vazio quando não há lições', async () => {
    const { http } = await setup();

    http.expectOne('/api/lessons').flush([]);

    expect(await screen.findByText('Nenhuma lição disponível ainda.')).toBeVisible();
  });

  it('exibe erro e refaz a busca no Try again', async () => {
    const { http, user } = await setup();

    http
      .expectOne('/api/lessons')
      .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as lições.',
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));
    http.expectOne('/api/lessons').flush(LESSONS);

    expect(await screen.findByRole('link', { name: /primeiros sinais/i })).toBeVisible();
  });
});
