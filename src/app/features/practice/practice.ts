import { Component, computed, inject, signal } from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { MessageKey } from '../../core/i18n/messages';
import { KeyCaptureService } from '../../services/key-capture.service';
import { MorseAudioService, MorsePlaybackSettings } from '../../services/morse-audio.service';
import { MorseCharactersService } from '../../services/morse-characters.service';
import { MorseSettingsService } from '../../services/morse-settings.service';
import { PracticeMode, PracticeSessionService } from '../../services/practice-session.service';
import { Button } from '../../shared/ui/button/button';
import { Divider } from '../../shared/ui/divider/divider';
import { Heading } from '../../shared/ui/heading/heading';
import { KeyCapture } from '../../shared/ui/key-capture/key-capture';

interface ModeInfo {
  id: PracticeMode;
  title: MessageKey;
  description: MessageKey;
}

const MODES: readonly ModeInfo[] = [
  {
    id: 'key_capture',
    title: 'practice.modeKeyCapture',
    description: 'practice.modeKeyCaptureDesc',
  },
  {
    id: 'text_to_morse',
    title: 'practice.modeTextToMorse',
    description: 'practice.modeTextToMorseDesc',
  },
  {
    id: 'morse_to_text',
    title: 'practice.modeMorseToText',
    description: 'practice.modeMorseToTextDesc',
  },
  {
    id: 'listening',
    title: 'practice.modeListening',
    description: 'practice.modeListeningDesc',
  },
];

const DEFAULT_PLAYBACK: MorsePlaybackSettings = {
  speed_wpm: 20,
  frequency: 700,
  volume: 0.8,
  wave_type: 'sine',
};

/**
 * Tela de prática livre: seleção de modo, barras de configuração e o round
 * corrente. As regras da sessão vivem no `PracticeSessionService`; aqui fica
 * só a orquestração de UI (carga do alfabeto, rótulos, áudio e atalho Enter).
 */
@Component({
  selector: 'app-practice',
  imports: [Button, Divider, Heading, KeyCapture],
  providers: [KeyCaptureService, PracticeSessionService],
  templateUrl: './practice.html',
  host: {
    class: 'flex flex-1 flex-col',
    '(window:keydown.enter)': 'advanceOnEnter($event)',
  },
})
export class Practice {
  readonly #charactersService = inject(MorseCharactersService);
  readonly #settings = inject(MorseSettingsService);
  readonly #audio = inject(MorseAudioService);
  protected readonly session = inject(PracticeSessionService);
  protected readonly i18n = inject(I18nService);

  protected readonly modes = MODES;
  protected readonly charactersError = signal(false);

  protected readonly modeTitle = computed(() => {
    const info = MODES.find((candidate) => candidate.id === this.session.mode());
    return info ? this.i18n.t(info.title) : '';
  });

  constructor() {
    this.loadCharacters();
  }

  protected loadCharacters(): void {
    this.charactersError.set(false);
    this.session.setCharacters(null);
    this.#charactersService.list().subscribe({
      next: (characters) => this.session.setCharacters(characters),
      error: () => this.charactersError.set(true),
    });
  }

  /** Enter aciona o Next na tela de resultado e o Restart no resumo da sessão. */
  protected advanceOnEnter(event: Event): void {
    if (this.session.finished()) {
      event.preventDefault();
      this.session.restart();
      return;
    }
    if (this.session.result() && !this.session.submitting()) {
      event.preventDefault();
      this.session.nextRound();
    }
  }

  /** Reproduz o código do round atual (modo listening e replays). */
  protected playCode(): void {
    const round = this.session.round();
    if (round) {
      void this.#audio.playSequence(
        round.character.code,
        this.#settings.settings() ?? DEFAULT_PLAYBACK,
      );
    }
  }

  /** Relógio do topo: regressivo na sessão por tempo, corrido na por caracteres. */
  protected clock(): string {
    const totalS =
      this.session.sessionKind() === 'time'
        ? Math.max(0, this.session.sessionGoal() - this.session.elapsedS())
        : this.session.elapsedS();
    return this.#formatClock(totalS);
  }

  /** Tempo decorrido da sessão (exibido no resumo final). */
  protected elapsedClock(): string {
    return this.#formatClock(this.session.elapsedS());
  }

  protected cpmLabel(): string {
    const cpm = this.session.cpm();
    return cpm === null ? '—' : `${cpm.toFixed(1)} cpm`;
  }

  /** Configuração da sessão exibida no resumo (ex.: "Characters · 10"). */
  protected sessionLabel(): string {
    const goal = this.session.sessionGoal();
    return this.session.sessionKind() === 'time' ? `Time · ${goal}s` : `Characters · ${goal}`;
  }

  #formatClock(totalS: number): string {
    const minutes = String(Math.floor(totalS / 60)).padStart(2, '0');
    const seconds = String(totalS % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}
