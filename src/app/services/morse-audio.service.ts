import { Injectable } from '@angular/core';

import { UserMorseSettings } from './morse-settings.service';

export type ToneSettings = Pick<UserMorseSettings, 'frequency' | 'volume' | 'wave_type'>;

/** Rampa de ganho anti-click nas bordas do tom (segundos). */
const RAMP_S = 0.01;

/**
 * Geração de som Morse via Web Audio API — inteiramente no navegador.
 *
 * O `AudioContext` é criado de forma lazy, na primeira chamada de `playTone`,
 * que deve sempre acontecer em resposta a um gesto do usuário (clique/tecla):
 * navegadores bloqueiam áudio iniciado no carregamento da página. A
 * reprodução de sequências Morse completas (com timing por `speed_wpm`) é
 * escopo da Fase 3.
 */
@Injectable({ providedIn: 'root' })
export class MorseAudioService {
  #context: AudioContext | null = null;

  async playTone(settings: ToneSettings, durationMs = 300): Promise<void> {
    const context = (this.#context ??= new AudioContext());
    if (context.state === 'suspended') {
      await context.resume();
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = settings.wave_type;
    oscillator.frequency.value = settings.frequency;

    const start = context.currentTime;
    const stop = start + durationMs / 1000;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(settings.volume, start + RAMP_S);
    gain.gain.setValueAtTime(settings.volume, stop - RAMP_S);
    gain.gain.linearRampToValueAtTime(0, stop);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(stop);
  }
}
