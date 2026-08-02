import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';

import { KeyCaptureService } from '../../../services/key-capture.service';
import { MorseSettingsService, UserMorseSettings } from '../../../services/morse-settings.service';
import { KeyCapture } from './key-capture';

// 20 WPM: unidade 60 ms → limiar do traço 120 ms, limite máximo 360 ms.
const SETTINGS: UserMorseSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
  input_key: 'Space',
};

describe('KeyCapture', () => {
  let service: KeyCaptureService;
  let detectChanges: () => void;
  let container: Element;
  let now: number;

  beforeEach(async () => {
    // Simula a feature hospedeira, que provê o serviço e arma a captura.
    const view = await render('<app-key-capture question="A" />', {
      imports: [KeyCapture],
      providers: [KeyCaptureService, provideHttpClient(), provideHttpClientTesting()],
    });
    detectChanges = () => view.detectChanges();
    container = view.container;

    const settingsService = TestBed.inject(MorseSettingsService);
    settingsService.load();
    TestBed.inject(HttpTestingController).expectOne('/api/users/morse-settings').flush(SETTINGS);

    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    service = TestBed.inject(KeyCaptureService);
  });

  afterEach(() => {
    service.stop();
    vi.restoreAllMocks();
  });

  function press(durationMs: number): void {
    fireEvent(window, new KeyboardEvent('keydown', { code: 'Space', cancelable: true }));
    now += durationMs;
    fireEvent(window, new KeyboardEvent('keyup', { code: 'Space', cancelable: true }));
  }

  it('exibe o caractere alvo, a dica da tecla configurada e a superfície de toque', () => {
    expect(screen.getByText('A')).toBeVisible();
    expect(screen.getByText(/pressione space/i)).toBeVisible();
    expect(container.querySelector('app-tap-pad')).not.toBeNull();
  });

  it('mostra os símbolos capturados conforme são classificados', () => {
    service.start();

    press(100); // "."
    press(200); // "-"
    detectChanges();

    expect(screen.getByText('.-')).toBeVisible();
  });

  it('avisa a pressão inválida com a tecla configurada e limpa na próxima válida', () => {
    service.start();

    press(400); // ≥ 360 ms a 20 WPM: backend rejeitaria
    detectChanges();
    expect(screen.getByRole('alert')).toHaveTextContent('longo demais');

    press(100);
    detectChanges();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('toque na superfície flui pelo serviço compartilhado', () => {
    service.start();
    const pad = container.querySelector('app-tap-pad') as HTMLElement;

    fireEvent.pointerDown(pad, { isPrimary: true });
    now += 100;
    fireEvent.pointerUp(pad);
    detectChanges();

    expect(screen.getByText('.')).toBeVisible();
  });
});

describe('KeyCapture outcome (issue #32)', () => {
  it('destaca os símbolos capturados em verde/vermelho conforme o outcome', async () => {
    const view = await render(KeyCapture, {
      inputs: { question: 'A', outcome: null },
      providers: [KeyCaptureService, provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(MorseSettingsService).load();
    TestBed.inject(HttpTestingController).expectOne('/api/users/morse-settings').flush(SETTINGS);
    const symbols = view.container.querySelector('p.tracking-widest') as HTMLElement;
    const target = screen.getByText('A');

    expect(symbols).toHaveClass('text-ink');
    expect(symbols).not.toHaveClass('text-success');
    expect(symbols).not.toHaveClass('text-error');
    expect(target).toHaveClass('text-ink');

    await view.rerender({ inputs: { question: 'A', outcome: 'correct' } });
    expect(symbols).toHaveClass('text-success');
    expect(target).toHaveClass('text-success');

    await view.rerender({ inputs: { question: 'A', outcome: 'wrong' } });
    expect(symbols).toHaveClass('text-error');
    expect(target).toHaveClass('text-error');
  });
});
