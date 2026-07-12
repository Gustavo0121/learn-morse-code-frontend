import { TestBed } from '@angular/core/testing';

import { MorseAudioService } from './morse-audio.service';

interface FakeNodes {
  oscillator: {
    type: string;
    frequency: { value: number };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };
  gain: {
    gain: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
  };
}

function stubAudioContext(state: 'running' | 'suspended' = 'running') {
  const nodes: FakeNodes = {
    oscillator: {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn((node: unknown) => node),
      start: vi.fn(),
      stop: vi.fn(),
    },
    gain: {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn((node: unknown) => node),
    },
  };

  const instances: object[] = [];
  const resume = vi.fn().mockResolvedValue(undefined);

  class FakeAudioContext {
    state = state;
    currentTime = 0;
    destination = {};
    resume = resume;
    createOscillator = vi.fn(() => nodes.oscillator);
    createGain = vi.fn(() => nodes.gain);

    constructor() {
      instances.push(this);
    }
  }

  vi.stubGlobal('AudioContext', FakeAudioContext);
  return { nodes, instances, resume };
}

describe('MorseAudioService', () => {
  let service: MorseAudioService;

  beforeEach(() => {
    service = TestBed.inject(MorseAudioService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('não cria o AudioContext no carregamento — apenas no primeiro playTone', async () => {
    const { instances } = stubAudioContext();

    expect(instances).toHaveLength(0);

    await service.playTone({ frequency: 700, volume: 0.8, wave_type: 'sine' });
    expect(instances).toHaveLength(1);
  });

  it('reutiliza o mesmo AudioContext nas chamadas seguintes', async () => {
    const { instances } = stubAudioContext();

    await service.playTone({ frequency: 700, volume: 0.8, wave_type: 'sine' });
    await service.playTone({ frequency: 400, volume: 0.5, wave_type: 'square' });

    expect(instances).toHaveLength(1);
  });

  it('aplica frequência, tipo de onda e volume configurados', async () => {
    const { nodes } = stubAudioContext();

    await service.playTone({ frequency: 1000, volume: 0.4, wave_type: 'sawtooth' }, 200);

    expect(nodes.oscillator.type).toBe('sawtooth');
    expect(nodes.oscillator.frequency.value).toBe(1000);
    expect(nodes.gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.4, expect.any(Number));
    expect(nodes.oscillator.start).toHaveBeenCalled();
    expect(nodes.oscillator.stop).toHaveBeenCalledWith(0.2);
  });

  it('retoma o contexto quando suspenso pelo navegador', async () => {
    const { resume } = stubAudioContext('suspended');

    await service.playTone({ frequency: 700, volume: 0.8, wave_type: 'sine' });

    expect(resume).toHaveBeenCalled();
  });
});
