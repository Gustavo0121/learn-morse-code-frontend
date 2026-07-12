import { TestBed } from '@angular/core/testing';

import { MorseAudioService, MorsePlaybackSettings } from './morse-audio.service';

interface FakeOscillator {
  type: string;
  frequency: { value: number };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

function stubAudioContext(state: 'running' | 'suspended' = 'running') {
  const oscillators: FakeOscillator[] = [];
  const instances: object[] = [];
  const resume = vi.fn().mockResolvedValue(undefined);
  const gainParam = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };

  class FakeAudioContext {
    state = state;
    currentTime = 0;
    destination = {};
    resume = resume;
    createGain = vi.fn(() => ({ gain: gainParam, connect: vi.fn((node: unknown) => node) }));
    createOscillator = vi.fn(() => {
      const oscillator: FakeOscillator = {
        type: 'sine',
        frequency: { value: 0 },
        connect: vi.fn((node: unknown) => node),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(oscillator);
      return oscillator;
    });

    constructor() {
      instances.push(this);
    }
  }

  vi.stubGlobal('AudioContext', FakeAudioContext);
  return { oscillators, instances, resume, gainParam };
}

// 20 WPM → unidade (ponto) de 60 ms.
const SETTINGS: MorsePlaybackSettings = {
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
  speed_wpm: 20,
};

describe('MorseAudioService', () => {
  let service: MorseAudioService;

  beforeEach(() => {
    service = TestBed.inject(MorseAudioService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('não cria o AudioContext no carregamento — apenas na primeira reprodução', async () => {
    const { instances } = stubAudioContext();

    expect(instances).toHaveLength(0);

    await service.playTone(SETTINGS);
    expect(instances).toHaveLength(1);
  });

  it('reutiliza o mesmo AudioContext nas chamadas seguintes', async () => {
    const { instances } = stubAudioContext();

    await service.playTone(SETTINGS);
    await service.playTone({ ...SETTINGS, frequency: 400, wave_type: 'square' });

    expect(instances).toHaveLength(1);
  });

  it('retoma o contexto quando suspenso pelo navegador', async () => {
    const { resume } = stubAudioContext('suspended');

    await service.playTone(SETTINGS);

    expect(resume).toHaveBeenCalled();
  });

  it('playTone aplica frequência, tipo de onda e volume configurados', async () => {
    const { oscillators, gainParam } = stubAudioContext();

    await service.playTone({ frequency: 1000, volume: 0.4, wave_type: 'sawtooth' }, 200);

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0].type).toBe('sawtooth');
    expect(oscillators[0].frequency.value).toBe(1000);
    expect(gainParam.linearRampToValueAtTime).toHaveBeenCalledWith(0.4, expect.any(Number));
    expect(oscillators[0].stop).toHaveBeenCalledWith(0.2);
  });

  it('playSequence agenda ponto e traço com o timing PARIS do speed_wpm', async () => {
    const { oscillators } = stubAudioContext();
    vi.useFakeTimers();

    const done = service.playSequence('.-', SETTINGS);
    await vi.advanceTimersByTimeAsync(0);

    // Lead-in de 0.05s; unidade de 0.06s: ponto [0.05, 0.11], gap de 1
    // unidade, traço (3 unidades) [0.17, 0.35].
    expect(oscillators).toHaveLength(2);
    const [dot, dash] = oscillators;
    expect(dot.start.mock.calls[0][0]).toBeCloseTo(0.05, 5);
    expect(dot.stop.mock.calls[0][0]).toBeCloseTo(0.11, 5);
    expect(dash.start.mock.calls[0][0]).toBeCloseTo(0.17, 5);
    expect(dash.stop.mock.calls[0][0]).toBeCloseTo(0.35, 5);

    await vi.advanceTimersByTimeAsync(1000);
    await done;
  });

  it('playSequence aplica pausas de 3 unidades entre letras e 7 entre palavras', async () => {
    const { oscillators } = stubAudioContext();
    vi.useFakeTimers();

    const done = service.playSequence('. ./.', SETTINGS);
    await vi.advanceTimersByTimeAsync(0);

    expect(oscillators).toHaveLength(3);
    expect(oscillators[1].start.mock.calls[0][0]).toBeCloseTo(0.29, 5); // 0.05 + (1+3)·0.06
    expect(oscillators[2].start.mock.calls[0][0]).toBeCloseTo(0.77, 5); // 0.29 + (1+7)·0.06

    await vi.advanceTimersByTimeAsync(2000);
    await done;
  });

  it('expõe o estado de reprodução e o encerra ao fim da sequência', async () => {
    stubAudioContext();
    vi.useFakeTimers();

    const done = service.playSequence('.-', SETTINGS);
    await vi.advanceTimersByTimeAsync(0);
    expect(service.playing()).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    await done;
    expect(service.playing()).toBe(false);
  });

  it('stop interrompe os tons agendados e resolve a reprodução pendente', async () => {
    const { oscillators } = stubAudioContext();
    vi.useFakeTimers();

    const done = service.playSequence('---', SETTINGS);
    await vi.advanceTimersByTimeAsync(0);
    expect(service.playing()).toBe(true);

    service.stop();

    expect(service.playing()).toBe(false);
    for (const oscillator of oscillators) {
      // 1ª chamada: agendamento do fim do tom; 2ª: interrupção imediata.
      expect(oscillator.stop).toHaveBeenCalledTimes(2);
    }
    await done;
  });

  it('tocar de novo com configurações diferentes interrompe a anterior sem erros', async () => {
    const { oscillators } = stubAudioContext();
    vi.useFakeTimers();

    const first = service.playSequence('.', SETTINGS);
    await vi.advanceTimersByTimeAsync(0);

    const second = service.playSequence('.', {
      frequency: 400,
      volume: 0.5,
      wave_type: 'square',
      speed_wpm: 40,
    });
    await vi.advanceTimersByTimeAsync(0);
    await first; // resolvida pela interrupção

    expect(oscillators).toHaveLength(2);
    expect(oscillators[1].type).toBe('square');
    expect(oscillators[1].frequency.value).toBe(400);

    await vi.advanceTimersByTimeAsync(1000);
    await second;
    expect(service.playing()).toBe(false);
  });

  it('ignora caracteres desconhecidos e resolve sem tocar nada', async () => {
    const { oscillators } = stubAudioContext();

    await service.playSequence('x y z', SETTINGS);

    expect(oscillators).toHaveLength(0);
    expect(service.playing()).toBe(false);
  });
});
