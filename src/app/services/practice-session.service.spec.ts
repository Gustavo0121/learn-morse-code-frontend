import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { KeyCaptureService } from './key-capture.service';
import { MorseCharacter } from './morse-characters.service';
import { MorseSettingsService, UserMorseSettings } from './morse-settings.service';
import { PracticeSessionService } from './practice-session.service';
import { PracticeRecord } from './practice.service';

const CHARACTERS: MorseCharacter[] = [
  { id: 1, character: 'A', code: '.-', type: 'letter' },
  { id: 2, character: 'E', code: '.', type: 'letter' },
  { id: 3, character: 'T', code: '-', type: 'letter' },
  { id: 4, character: 'N', code: '-.', type: 'letter' },
  { id: 5, character: '5', code: '.....', type: 'number' },
  { id: 6, character: '?', code: '..--..', type: 'punctuation' },
];

const SETTINGS: UserMorseSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
  input_key: 'Space',
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
    response_time: 1500,
    created_at: '2026-07-19T00:00:00Z',
    ...overrides,
  };
}

describe('PracticeSessionService', () => {
  let service: PracticeSessionService;
  let http: HttpTestingController;
  let now: number;

  beforeEach(() => {
    // Fake timers sem tocar em performance.now (controlado via spy manual).
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

    TestBed.configureTestingModule({
      providers: [
        PracticeSessionService,
        KeyCaptureService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);

    const settings = TestBed.inject(MorseSettingsService);
    settings.load();
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);

    // Math.random = 0 → sempre sorteia o primeiro caractere do pool ('A').
    vi.spyOn(Math, 'random').mockReturnValue(0);
    now = 10_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    service = TestBed.inject(PracticeSessionService);
    service.setCharacters(CHARACTERS);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /** Responde o round corrente e confirma o registro no backend. */
  function answerAndFlush(overrides: Partial<PracticeRecord> = {}): void {
    service.answer(service.round()?.expected ?? '');
    http
      .expectOne('/api/practice/history')
      .flush(record(overrides), { status: 201, statusText: 'Created' });
  }

  function press(durationMs: number): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', cancelable: true }));
    now += durationMs;
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', cancelable: true }));
  }

  describe('pool de caracteres', () => {
    it('sorteia só letras por padrão; os toggles ampliam para números e pontuação', () => {
      expect(service.pool()?.map((c) => c.character)).toEqual(['A', 'E', 'T', 'N']);

      service.toggleNumbers();
      expect(service.pool()?.map((c) => c.character)).toEqual(['A', 'E', 'T', 'N', '5']);

      service.togglePunctuation();
      expect(service.pool()?.map((c) => c.character)).toEqual(['A', 'E', 'T', 'N', '5', '?']);
    });

    it('cai para o alfabeto completo quando o filtro esvazia o pool', () => {
      const symbolsOnly = CHARACTERS.filter((c) => c.type !== 'letter');
      service.setCharacters(symbolsOnly);

      expect(service.pool()).toEqual(symbolsOnly);
    });

    it('é null enquanto o alfabeto não carrega', () => {
      service.setCharacters(null);
      expect(service.pool()).toBeNull();
    });
  });

  describe('montagem do round', () => {
    it('monta question/expected conforme o modo, espelhando o contrato do backend', () => {
      service.selectMode('text_to_morse');
      expect(service.round()).toMatchObject({ question: 'A', expected: '.-' });

      service.selectMode('morse_to_text');
      expect(service.round()).toMatchObject({ question: '.-', expected: 'A' });

      service.selectMode('listening');
      expect(service.round()).toMatchObject({ question: '.-', expected: 'A' });

      service.selectMode('key_capture');
      expect(service.round()).toMatchObject({ question: 'A', expected: '.-', options: null });
    });

    it('gera 4 alternativas únicas do mesmo tipo, incluindo a correta', () => {
      service.selectMode('morse_to_text');

      const options = service.round()?.options ?? [];
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain('A');
      for (const option of options) {
        expect(['A', 'E', 'T', 'N']).toContain(option);
      }
    });

    it('completa as alternativas com outros tipos quando o tipo do alvo não basta', () => {
      service.toggleNumbers();
      // random = 0.9 → sorteia o último do pool ('5'), único número do alfabeto.
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      service.selectMode('morse_to_text');

      const options = service.round()?.options ?? [];
      expect(options).toHaveLength(4);
      expect(options).toContain('5');
    });

    it('não sorteia round sem modo ou sem alfabeto carregado', () => {
      service.nextRound();
      expect(service.round()).toBeNull();

      service.setCharacters(null);
      service.selectMode('text_to_morse');
      expect(service.round()).toBeNull();
    });
  });

  describe('envio e contadores', () => {
    it('answer envia multiple_choice com o contrato exato e atualiza os contadores', () => {
      service.selectMode('text_to_morse');
      now += 2500;
      service.answer('.-');

      const post = http.expectOne('/api/practice/history');
      expect(post.request.body).toEqual({
        exercise_type: 'multiple_choice',
        question: 'A',
        expected_answer: '.-',
        user_answer: '.-',
        response_time: 2500,
      });
      post.flush(record({}), { status: 201, statusText: 'Created' });

      expect(service.sessionTotal()).toBe(1);
      expect(service.sessionCorrect()).toBe(1);
      expect(service.accuracy()).toBe(100);
      expect(service.result()?.correct).toBe(true);
    });

    it('listening envia exercise_type listening', () => {
      service.selectMode('listening');
      service.answer('A');

      const post = http.expectOne('/api/practice/history');
      expect(post.request.body).toMatchObject({ exercise_type: 'listening', question: '.-' });
      post.flush(record({}), { status: 201, statusText: 'Created' });
    });

    it('ignora respostas com resultado na tela ou envio em andamento', () => {
      service.selectMode('text_to_morse');
      service.answer('.-');
      service.answer('.-'); // envio em voo: ignorada

      http.expectOne('/api/practice/history').flush(record({}), {
        status: 201,
        statusText: 'Created',
      });
      service.answer('.-'); // resultado na tela: ignorada

      expect(service.sessionTotal()).toBe(1);
    });

    it('calcula precisão e cpm com a fórmula do agregado do backend', () => {
      service.selectMode('text_to_morse');
      answerAndFlush({ response_time: 1500 });
      service.nextRound();
      answerAndFlush({ correct: false, response_time: 1500 });

      expect(service.accuracy()).toBe(50);
      // 2 tentativas em 3000 ms → 2 × 60000 / 3000 = 40 cpm.
      expect(service.cpm()).toBe(40);
    });

    it('erro de rede sinaliza submitError e retrySubmit reenvia o mesmo payload', () => {
      service.selectMode('text_to_morse');
      service.answer('.-');

      http
        .expectOne('/api/practice/history')
        .flush({ detail: 'boom' }, { status: 500, statusText: 'Server Error' });
      expect(service.submitError()).toBe(true);
      expect(service.sessionTotal()).toBe(0);

      service.retrySubmit();
      const retry = http.expectOne('/api/practice/history');
      expect(retry.request.body).toMatchObject({ question: 'A', user_answer: '.-' });
      retry.flush(record({}), { status: 201, statusText: 'Created' });

      expect(service.submitError()).toBe(false);
      expect(service.sessionTotal()).toBe(1);
    });

    it('retrySubmit sem envio pendente não faz nada', () => {
      service.selectMode('text_to_morse');
      service.retrySubmit();
      http.expectNone('/api/practice/history');
    });
  });

  describe('key_capture', () => {
    it('arma a captura no round e envia press_durations + input_method após a pausa', () => {
      service.selectMode('key_capture');

      press(100); // "."
      now += 200;
      press(200); // "-"
      vi.advanceTimersByTime(600); // gap de auto-envio

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

      expect(service.sessionTotal()).toBe(1);
    });
  });

  describe('relógio e fim da sessão', () => {
    it('só começa a contar no primeiro input do usuário', () => {
      service.selectMode('text_to_morse');

      now += 5_000;
      vi.advanceTimersByTime(5_000);
      expect(service.elapsedS()).toBe(0);

      answerAndFlush();
      now += 3_000;
      vi.advanceTimersByTime(3_000);
      expect(service.elapsedS()).toBe(3);
    });

    it('sessão por caracteres termina ao alcançar a meta', () => {
      service.selectMode('text_to_morse');

      for (let attempt = 1; attempt <= 10; attempt++) {
        answerAndFlush();
        if (attempt < 10) {
          expect(service.finished()).toBe(false);
          service.nextRound();
        }
      }

      expect(service.finished()).toBe(true);
      expect(service.round()).toBeNull();
      expect(service.sessionTotal()).toBe(10);
    });

    it('sessão por tempo expira no relógio; envio em voo conta sem sair do resumo', () => {
      service.selectMode('text_to_morse');
      service.setSessionKind('time');
      service.setSessionGoal(15);

      service.answer('.-'); // primeiro input dispara o relógio; envio fica em voo
      now += 15_000;
      vi.advanceTimersByTime(500);

      expect(service.finished()).toBe(true);
      expect(service.round()).toBeNull();

      http.expectOne('/api/practice/history').flush(record({}), {
        status: 201,
        statusText: 'Created',
      });

      expect(service.sessionTotal()).toBe(1);
      expect(service.finished()).toBe(true);
      expect(service.result()).toBeNull();
    });
  });

  describe('configuração da sessão', () => {
    it('mudar filtros de conteúdo reinicia a sessão com os contadores zerados', () => {
      service.selectMode('text_to_morse');
      answerAndFlush();
      expect(service.sessionTotal()).toBe(1);

      service.togglePunctuation();

      expect(service.sessionTotal()).toBe(0);
      expect(service.accuracy()).toBeNull();
      expect(service.result()).toBeNull();
      expect(service.round()).not.toBeNull();
    });

    it('selecionar o tipo ou a meta já ativos não reinicia a sessão', () => {
      service.selectMode('text_to_morse');
      answerAndFlush();

      service.setSessionKind('characters');
      service.setSessionGoal(10);

      expect(service.sessionTotal()).toBe(1);
    });

    it('a meta e os valores selecionáveis acompanham o tipo de sessão', () => {
      expect(service.sessionValues()).toEqual([10, 15, 20, 25]);
      expect(service.sessionGoal()).toBe(10);

      service.setSessionKind('time');
      expect(service.sessionValues()).toEqual([15, 30, 60, 120]);
      expect(service.sessionGoal()).toBe(60);

      service.setSessionGoal(120);
      expect(service.sessionGoal()).toBe(120);
    });

    it('exitMode volta à seleção de modos limpando o estado da sessão', () => {
      service.selectMode('text_to_morse');
      answerAndFlush();

      service.exitMode();

      expect(service.mode()).toBeNull();
      expect(service.round()).toBeNull();
      expect(service.result()).toBeNull();
      expect(service.finished()).toBe(false);
    });
  });
});
