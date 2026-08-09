import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { KeyCaptureResult, KeyCaptureService } from './key-capture.service';
import { MorseInputService, MorsePressEvent } from './morse-input.service';
import { MorseSettingsService, UserMorseSettings } from './morse-settings.service';

// 20 WPM: unidade 60 ms → limiar do traço 120 ms, limite máximo 360 ms;
// gap de auto-envio = max(600, 7 × 60) = 600 ms (piso).
const SETTINGS: UserMorseSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
  input_key: 'Space',
};

describe('KeyCaptureService', () => {
  let service: KeyCaptureService;
  let http: HttpTestingController;
  let captures: KeyCaptureResult[];
  let presses: MorsePressEvent[];
  let now: number;

  beforeEach(() => {
    // Fake timers sem tocar em performance.now (controlado via spy manual).
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

    TestBed.configureTestingModule({
      providers: [KeyCaptureService, provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);

    const settingsService = TestBed.inject(MorseSettingsService);
    settingsService.load();
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);

    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    service = TestBed.inject(KeyCaptureService);
    captures = [];
    presses = [];
    service.onCapture().subscribe((capture) => captures.push(capture));
    service.onPress().subscribe((press) => presses.push(press));
  });

  afterEach(() => {
    service.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function press(durationMs: number, code = 'Space'): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }));
    now += durationMs;
    window.dispatchEvent(new KeyboardEvent('keyup', { code, cancelable: true }));
  }

  it('acumula símbolos e emite o resultado após o gap de auto-envio (piso de 600 ms)', () => {
    service.start();

    press(100); // "."
    press(200); // "-"
    expect(service.symbols()).toBe('.-');

    vi.advanceTimersByTime(599);
    expect(captures).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(captures).toEqual([{ input_method: 'Space', press_durations: [100, 200] }]);
  });

  it('rearma o gap a cada símbolo: só a pausa sem novos símbolos encerra o caractere', () => {
    service.start();

    press(100);
    vi.advanceTimersByTime(500);
    press(200);

    vi.advanceTimersByTime(599);
    expect(captures).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(captures).toEqual([{ input_method: 'Space', press_durations: [100, 200] }]);
  });

  it('usa o gap de palavra proporcional quando maior que o piso (WPM baixo)', () => {
    const settingsService = TestBed.inject(MorseSettingsService);
    settingsService.load();
    // 10 WPM: unidade 120 ms → gap = 7 × 120 = 840 ms.
    http.expectOne('/api/users/morse-settings').flush({ ...SETTINGS, speed_wpm: 10 });

    service.start();
    press(200); // "." a 10 WPM (limiar do traço 240 ms)

    vi.advanceTimersByTime(839);
    expect(captures).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(captures).toEqual([{ input_method: 'Space', press_durations: [200] }]);
  });

  it('pressão inválida sinaliza o aviso e fica fora do envio; a próxima válida o limpa', () => {
    service.start();

    press(400); // ≥ 360 ms a 20 WPM: backend rejeitaria
    expect(service.invalidPress()).toBe(true);
    expect(service.symbols()).toBe('');

    press(100);
    expect(service.invalidPress()).toBe(false);

    vi.advanceTimersByTime(600);
    expect(captures).toEqual([{ input_method: 'Space', press_durations: [100] }]);
  });

  it('toque na superfície marca o round como Touch, mesmo misturado com teclado', () => {
    const input = TestBed.inject(MorseInputService);
    service.start();

    press(100);
    input.beginTouchPress();
    now += 200;
    input.endTouchPress();

    vi.advanceTimersByTime(600);
    expect(captures).toEqual([{ input_method: 'Touch', press_durations: [100, 200] }]);
  });

  it('input_method reflete a tecla configurada nas preferências', () => {
    const settingsService = TestBed.inject(MorseSettingsService);
    settingsService.load();
    http.expectOne('/api/users/morse-settings').flush({ ...SETTINGS, input_key: 'KeyJ' });

    service.start();
    press(100, 'KeyJ');

    vi.advanceTimersByTime(600);
    expect(captures).toEqual([{ input_method: 'KeyJ', press_durations: [100] }]);
  });

  it('onPress emite todo pressionamento enquanto ativo, inclusive os inválidos', () => {
    service.start();

    press(400);
    press(100);

    expect(presses.map((event) => event.symbol)).toEqual([null, '.']);
  });

  it('start zera o estado do round anterior', () => {
    service.start();
    press(400);
    press(100);
    expect(service.symbols()).toBe('.');

    service.start();
    expect(service.symbols()).toBe('');
    expect(service.invalidPress()).toBe(false);

    press(200);
    vi.advanceTimersByTime(600);
    expect(captures).toEqual([{ input_method: 'Space', press_durations: [200] }]);
  });

  it('stop cancela o auto-envio pendente e nada é emitido', () => {
    service.start();
    press(100);

    service.stop();
    vi.advanceTimersByTime(600);

    expect(captures).toEqual([]);
  });

  it('ignora pressionamentos com a captura de outro consumidor ativa (serviço inativo)', () => {
    // Ex.: a tela de settings arma o MorseInputService para testar a tecla.
    TestBed.inject(MorseInputService).startCapture();

    press(100);

    expect(presses).toEqual([]);
    expect(service.symbols()).toBe('');
  });
});
