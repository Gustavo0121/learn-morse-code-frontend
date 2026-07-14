import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render } from '@testing-library/angular';

import { MorseInputService, MorsePressEvent } from '../../../services/morse-input.service';
import { MorseSettingsService, UserMorseSettings } from '../../../services/morse-settings.service';
import { TapPad } from './tap-pad';

// 20 WPM: unidade 60 ms → limiar do traço 120 ms.
const SETTINGS: UserMorseSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
  input_key: 'Space',
};

describe('TapPad', () => {
  let events: MorsePressEvent[];
  let now: number;
  let pad: HTMLElement;

  beforeEach(async () => {
    const { container } = await render('<app-tap-pad />', {
      imports: [TapPad],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    pad = container.querySelector('app-tap-pad') as HTMLElement;

    const settingsService = TestBed.inject(MorseSettingsService);
    settingsService.load();
    TestBed.inject(HttpTestingController).expectOne('/api/users/morse-settings').flush(SETTINGS);

    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    events = [];
    TestBed.inject(MorseInputService)
      .onSymbolDetected()
      .subscribe((event) => events.push(event));
  });

  afterEach(() => {
    TestBed.inject(MorseInputService).stopCapture();
    vi.restoreAllMocks();
  });

  it('exibe a instrução de toque', () => {
    expect(pad).toHaveTextContent('Toque e segure para transmitir');
  });

  it('pressionar e soltar emite o símbolo com origem touch', () => {
    TestBed.inject(MorseInputService).startCapture();

    fireEvent.pointerDown(pad, { isPrimary: true });
    now += 100;
    fireEvent.pointerUp(pad);

    fireEvent.pointerDown(pad, { isPrimary: true });
    now += 200;
    fireEvent.pointerUp(pad);

    expect(events).toEqual([
      { symbol: '.', durationMs: 100, source: 'touch' },
      { symbol: '-', durationMs: 200, source: 'touch' },
    ]);
  });

  it('pointercancel descarta a pressão em andamento', () => {
    TestBed.inject(MorseInputService).startCapture();

    fireEvent.pointerDown(pad, { isPrimary: true });
    now += 100;
    fireEvent.pointerCancel(pad);
    fireEvent.pointerUp(pad);

    expect(events).toEqual([]);
  });

  it('não emite nada fora da captura', () => {
    fireEvent.pointerDown(pad, { isPrimary: true });
    now += 100;
    fireEvent.pointerUp(pad);

    expect(events).toEqual([]);
  });

  it('ignora ponteiros não primários (multi-toque)', () => {
    TestBed.inject(MorseInputService).startCapture();

    fireEvent.pointerDown(pad, { isPrimary: false });
    now += 100;
    fireEvent.pointerUp(pad);

    expect(events).toEqual([]);
  });
});
