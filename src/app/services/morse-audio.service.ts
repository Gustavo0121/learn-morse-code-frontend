import { Injectable, signal } from '@angular/core';

import { UserMorseSettings } from './morse-settings.service';
import {
  DASH_UNITS,
  DOT_UNITS,
  LETTER_GAP_UNITS,
  SYMBOL_GAP_UNITS,
  WORD_GAP_UNITS,
  unitMs,
} from './morse-timing';

export type ToneSettings = Pick<UserMorseSettings, 'frequency' | 'volume' | 'wave_type'>;
export type MorsePlaybackSettings = Pick<
  UserMorseSettings,
  'frequency' | 'volume' | 'wave_type' | 'speed_wpm'
>;

/** Rampa de ganho anti-click nas bordas de cada tom (segundos). */
const RAMP_S = 0.01;
/** Pequena folga antes do primeiro tom, para o agendamento não ficar no passado. */
const LEAD_IN_S = 0.05;

/**
 * Geração de som Morse via Web Audio API — inteiramente no navegador.
 *
 * O `AudioContext` é criado de forma lazy, na primeira reprodução, que deve
 * sempre acontecer em resposta a um gesto do usuário (clique/tecla):
 * navegadores bloqueiam áudio iniciado no carregamento da página.
 */
@Injectable({ providedIn: 'root' })
export class MorseAudioService {
  #context: AudioContext | null = null;
  #scheduled: OscillatorNode[] = [];
  #endTimer: ReturnType<typeof setTimeout> | null = null;
  #resolveEnd: (() => void) | null = null;

  readonly #playing = signal(false);
  readonly playing = this.#playing.asReadonly();

  /** Toca um único tom de teste com as configurações dadas. */
  async playTone(settings: ToneSettings, durationMs = 300): Promise<void> {
    const context = await this.#ensureContext();
    this.#scheduleTone(context, settings, context.currentTime, durationMs / 1000);
  }

  /**
   * Reproduz uma sequência Morse com timing derivado de `speed_wpm` (padrão
   * PARIS: ponto = `1200 / wpm` ms; traço = 3 unidades; pausas de 1/3/7
   * unidades entre símbolos/letras/palavras).
   *
   * Formato de `code`: `'.'` e `'-'` para os símbolos, espaço entre letras e
   * `'/'` entre palavras (ex.: `".-.. -- -.-."`). Caracteres desconhecidos
   * são ignorados. Uma reprodução em andamento é interrompida antes de
   * iniciar a nova — trocar configurações em tempo real é seguro.
   */
  async playSequence(code: string, settings: MorsePlaybackSettings): Promise<void> {
    this.stop();
    const context = await this.#ensureContext();

    const unitS = unitMs(settings.speed_wpm) / 1000;
    let cursor = context.currentTime + LEAD_IN_S;

    for (const symbol of code) {
      switch (symbol) {
        case '.':
          this.#scheduled.push(this.#scheduleTone(context, settings, cursor, DOT_UNITS * unitS));
          cursor += (DOT_UNITS + SYMBOL_GAP_UNITS) * unitS;
          break;
        case '-':
          this.#scheduled.push(this.#scheduleTone(context, settings, cursor, DASH_UNITS * unitS));
          cursor += (DASH_UNITS + SYMBOL_GAP_UNITS) * unitS;
          break;
        case ' ':
          // O gap de 1 unidade pós-símbolo já foi somado; completa até 3.
          cursor += (LETTER_GAP_UNITS - SYMBOL_GAP_UNITS) * unitS;
          break;
        case '/':
          cursor += (WORD_GAP_UNITS - SYMBOL_GAP_UNITS) * unitS;
          break;
        default:
          break;
      }
    }

    if (this.#scheduled.length === 0) {
      return;
    }

    this.#playing.set(true);
    const remainingMs = (cursor - context.currentTime) * 1000;
    await new Promise<void>((resolve) => {
      this.#resolveEnd = resolve;
      this.#endTimer = setTimeout(() => this.#finish(), remainingMs);
    });
  }

  /** Interrompe a reprodução em andamento (se houver) imediatamente. */
  stop(): void {
    if (this.#endTimer !== null) {
      clearTimeout(this.#endTimer);
    }
    for (const oscillator of this.#scheduled) {
      try {
        oscillator.stop();
      } catch {
        // Oscilador ainda não iniciado ou já parado — nada a fazer.
      }
    }
    this.#finish();
  }

  async #ensureContext(): Promise<AudioContext> {
    const context = (this.#context ??= new AudioContext());
    if (context.state === 'suspended') {
      await context.resume();
    }
    return context;
  }

  #scheduleTone(
    context: AudioContext,
    settings: ToneSettings,
    startS: number,
    durationS: number,
  ): OscillatorNode {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = settings.wave_type;
    oscillator.frequency.value = settings.frequency;

    const stopS = startS + durationS;
    gain.gain.setValueAtTime(0, startS);
    gain.gain.linearRampToValueAtTime(settings.volume, startS + RAMP_S);
    gain.gain.setValueAtTime(settings.volume, stopS - RAMP_S);
    gain.gain.linearRampToValueAtTime(0, stopS);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startS);
    oscillator.stop(stopS);
    return oscillator;
  }

  #finish(): void {
    this.#scheduled = [];
    this.#endTimer = null;
    this.#playing.set(false);
    this.#resolveEnd?.();
    this.#resolveEnd = null;
  }
}
