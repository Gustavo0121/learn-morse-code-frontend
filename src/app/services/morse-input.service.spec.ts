import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MorseInputService, MorsePressEvent } from './morse-input.service';
import { MorseSettingsService, UserMorseSettings } from './morse-settings.service';

// 20 WPM: unidade 60 ms → limiar do traço 120 ms, limite máximo 360 ms.
const SETTINGS: UserMorseSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
  input_key: 'Space',
};

describe('MorseInputService', () => {
  let service: MorseInputService;
  let http: HttpTestingController;
  let events: MorsePressEvent[];
  let now: number;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);

    const settingsService = TestBed.inject(MorseSettingsService);
    settingsService.load();
    http.expectOne('/api/users/morse-settings').flush(SETTINGS);

    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    service = TestBed.inject(MorseInputService);
    events = [];
    service.onSymbolDetected().subscribe((event) => events.push(event));
  });

  afterEach(() => {
    service.stopCapture();
    vi.restoreAllMocks();
  });

  function press(code: string, durationMs: number): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }));
    now += durationMs;
    window.dispatchEvent(new KeyboardEvent('keyup', { code, cancelable: true }));
  }

  it('classifica pressão curta como ponto e longa como traço', () => {
    service.startCapture();

    press('Space', 100);
    press('Space', 200);

    expect(events).toEqual([
      { symbol: '.', durationMs: 100, source: 'keyboard' },
      { symbol: '-', durationMs: 200, source: 'keyboard' },
    ]);
  });

  it('sinaliza duração acima do limite aceito pelo backend como inválida', () => {
    service.startCapture();

    press('Space', 400); // ≥ 360 ms seria rejeitado pelo servidor a 20 WPM

    expect(events).toEqual([{ symbol: null, durationMs: 400, source: 'keyboard' }]);
  });

  it('reclassifica com o limiar do novo speed_wpm quando as preferências mudam', () => {
    service.startCapture();

    press('Space', 100);

    const settingsService = TestBed.inject(MorseSettingsService);
    settingsService.load();
    http.expectOne('/api/users/morse-settings').flush({ ...SETTINGS, speed_wpm: 40 });

    press('Space', 100); // a 40 WPM o limiar cai para 60 ms

    expect(events.map((event) => event.symbol)).toEqual(['.', '-']);
  });

  it('ignora teclas diferentes da configurada', () => {
    service.startCapture();

    press('KeyX', 100);

    expect(events).toEqual([]);
  });

  it('ignora eventos de repetição da tecla segurada', () => {
    service.startCapture();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', cancelable: true }));
    now += 80;
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Space', repeat: true, cancelable: true }),
    );
    now += 80;
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', cancelable: true }));

    expect(events).toEqual([{ symbol: '-', durationMs: 160, source: 'keyboard' }]);
  });

  it('só captura entre startCapture e stopCapture', () => {
    press('Space', 100);
    expect(events).toEqual([]);

    service.startCapture();
    press('Space', 100);
    expect(events).toHaveLength(1);

    service.stopCapture();
    press('Space', 100);
    expect(events).toHaveLength(1);
  });

  it('setInputKey troca a tecla em tempo de execução e null volta às preferências', () => {
    service.startCapture();

    service.setInputKey('KeyA');
    press('Space', 100);
    press('KeyA', 100);
    expect(events).toHaveLength(1);

    service.setInputKey(null);
    press('Space', 100);
    expect(events).toHaveLength(2);
  });

  it('perda de foco da janela descarta o pressionamento em andamento', () => {
    service.startCapture();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', cancelable: true }));
    window.dispatchEvent(new Event('blur'));
    now += 100;
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', cancelable: true }));

    expect(events).toEqual([]);
  });

  it('previne o comportamento padrão apenas da tecla de captura', () => {
    service.startCapture();

    const spaceDown = new KeyboardEvent('keydown', { code: 'Space', cancelable: true });
    const otherDown = new KeyboardEvent('keydown', { code: 'KeyX', cancelable: true });
    window.dispatchEvent(spaceDown);
    window.dispatchEvent(otherDown);

    expect(spaceDown.defaultPrevented).toBe(true);
    expect(otherDown.defaultPrevented).toBe(false);
  });

  it('expõe o estado de captura em um signal', () => {
    expect(service.capturing()).toBe(false);
    service.startCapture();
    expect(service.capturing()).toBe(true);
    service.stopCapture();
    expect(service.capturing()).toBe(false);
  });

  // ------------------------------------------------------- captura por toque

  function touchPress(durationMs: number): void {
    service.beginTouchPress();
    now += durationMs;
    service.endTouchPress();
  }

  it('classifica pressões por toque com o mesmo limiar do teclado', () => {
    service.startCapture();

    touchPress(100);
    touchPress(200);

    expect(events).toEqual([
      { symbol: '.', durationMs: 100, source: 'touch' },
      { symbol: '-', durationMs: 200, source: 'touch' },
    ]);
  });

  it('ignora toques fora da captura', () => {
    touchPress(100);

    expect(events).toEqual([]);
  });

  it('cancelTouchPress descarta a pressão em andamento', () => {
    service.startCapture();

    service.beginTouchPress();
    now += 100;
    service.cancelTouchPress();
    service.endTouchPress();

    expect(events).toEqual([]);
  });

  it('toque e teclado não se sobrepõem na mesma pressão', () => {
    service.startCapture();

    // Tecla pressionada no meio de um toque não inicia outra medição.
    service.beginTouchPress();
    now += 50;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', cancelable: true }));
    now += 50;
    service.endTouchPress();

    // O keyup órfão (pressão iniciada pelo toque) não emite nada.
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', cancelable: true }));

    expect(events).toEqual([{ symbol: '.', durationMs: 100, source: 'touch' }]);
  });
});
