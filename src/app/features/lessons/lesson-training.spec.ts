import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen } from '@testing-library/angular';

import { Lesson } from '../../services/lessons.service';
import { MorseAudioService } from '../../services/morse-audio.service';
import { MorseSettingsService } from '../../services/morse-settings.service';
import { PracticeRecord } from '../../services/practice.service';
import { LessonTraining } from './lesson-training';

const LESSON: Lesson = {
  id: 1,
  title: 'Introdução',
  description: 'Primeiros passos.',
  difficulty: 1,
  order: 1,
  characters: [{ id: 1, character: 'A', code: '.-', type: 'letter' }],
  created_at: '2026-07-01T00:00:00Z',
};

function record(overrides: Partial<PracticeRecord>): PracticeRecord {
  return {
    id: 1,
    exercise_type: 'multiple_choice',
    input_method: null,
    question: 'A',
    expected_answer: '.-',
    user_answer: '.-',
    correct: true,
    response_time: 1000,
    created_at: '2026-07-12T00:00:00Z',
    ...overrides,
  };
}

describe('LessonTraining', () => {
  let now: number;

  /** Fake timers sem tocar em performance.now (controlado via spy manual). */
  function useTimers(): void {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  }

  async function setup(lesson: Lesson = LESSON) {
    const view = await render(LessonTraining, {
      inputs: { id: '1' },
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const detectChanges = (): void => view.detectChanges();

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
    http.expectOne('/api/lessons/1').flush(lesson);
    detectChanges();

    return { http, detectChanges };
  }

  function press(durationMs: number): void {
    fireEvent(window, new KeyboardEvent('keydown', { code: 'Space', cancelable: true }));
    now += durationMs;
    fireEvent(window, new KeyboardEvent('keyup', { code: 'Space', cancelable: true }));
  }

  function enter(): void {
    fireEvent(window, new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('fluxo guiado completo: estudo → 4 modos com o conteúdo da lição → resumo', async () => {
    const { http, detectChanges } = await setup();
    const playSequence = vi
      .spyOn(TestBed.inject(MorseAudioService), 'playSequence')
      .mockResolvedValue(undefined);
    useTimers();

    // Estudo: caracteres da lição com áudio.
    expect(screen.getByText('Treino guiado')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir A' }));
    expect(playSequence).toHaveBeenCalledWith('.-', expect.objectContaining({ speed_wpm: 20 }));

    fireEvent.click(screen.getByRole('button', { name: /começar/i }));

    // Etapa 1 — texto → Morse.
    expect(screen.getByText('Etapa: 1/4')).toBeVisible();
    expect(screen.getByText('Qual é o código?')).toBeVisible();
    now += 1000;
    fireEvent.click(screen.getByRole('button', { name: '.-' }));
    let post = http.expectOne('/api/practice/history');
    expect(post.request.body).toEqual({
      exercise_type: 'multiple_choice',
      question: 'A',
      expected_answer: '.-',
      user_answer: '.-',
      response_time: 1000,
    });
    post.flush(record({}), { status: 201, statusText: 'Created' });
    detectChanges();
    expect(screen.getByText('Correto')).toBeVisible();
    enter();

    // Etapa 2 — Morse → texto.
    expect(screen.getByText('Etapa: 2/4')).toBeVisible();
    expect(screen.getByText('Qual é o caractere?')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    post = http.expectOne('/api/practice/history');
    expect(post.request.body).toMatchObject({
      exercise_type: 'multiple_choice',
      question: '.-',
      expected_answer: 'A',
      user_answer: 'A',
    });
    post.flush(record({ question: '.-', expected_answer: 'A', user_answer: 'A' }), {
      status: 201,
      statusText: 'Created',
    });
    detectChanges();
    enter();

    // Etapa 3 — listening.
    expect(screen.getByText('Etapa: 3/4')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /play code/i }));
    expect(playSequence).toHaveBeenLastCalledWith('.-', expect.objectContaining({ speed_wpm: 20 }));
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    post = http.expectOne('/api/practice/history');
    expect(post.request.body).toMatchObject({ exercise_type: 'listening', question: '.-' });
    post.flush(
      record({
        exercise_type: 'listening',
        question: '.-',
        expected_answer: 'A',
        user_answer: 'A',
      }),
      { status: 201, statusText: 'Created' },
    );
    detectChanges();
    enter();

    // Etapa 4 — key capture.
    expect(screen.getByText('Etapa: 4/4')).toBeVisible();
    expect(screen.getByText('Transmita o caractere')).toBeVisible();
    press(100);
    now += 200;
    press(200);
    await vi.advanceTimersByTimeAsync(700);
    post = http.expectOne('/api/practice/history');
    expect(post.request.body).toMatchObject({
      exercise_type: 'key_capture',
      input_method: 'Space',
      question: 'A',
      expected_answer: '.-',
      press_durations: [100, 200],
    });
    post.flush(record({ exercise_type: 'key_capture', input_method: 'Space' }), {
      status: 201,
      statusText: 'Created',
    });
    detectChanges();
    enter();

    // Resumo do treino.
    expect(screen.getByText('Treino concluído')).toBeVisible();
    expect(screen.getByText('100%')).toBeVisible();
    expect(screen.getByText(/corretas/)).toHaveTextContent('4 de 4 corretas');
    expect(screen.getByRole('button', { name: /repetir/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /voltar à lição/i })).toHaveAttribute(
      'href',
      '/lessons/1',
    );
  });

  it('lição sem conteúdo mostra aviso e caminho de volta', async () => {
    await setup({ ...LESSON, characters: [] });

    expect(screen.getByText('Esta lição ainda não tem conteúdo de treino.')).toBeVisible();
    expect(screen.getByRole('link', { name: /voltar à lição/i })).toHaveAttribute(
      'href',
      '/lessons/1',
    );
  });
});
