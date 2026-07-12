/**
 * Timing Morse — padrão PARIS: em X WPM, a unidade base (duração do ponto)
 * é `1200 / X` ms.
 *
 * Fonte única da fórmula para o frontend: usada pelo áudio (Fase 3) e pela
 * classificação ponto/traço na captura de teclado (Fase 4), garantindo que a
 * classificação exibida ao usuário seja consistente com a validação que o
 * backend faz com base no mesmo `speed_wpm`.
 */

export const DOT_UNITS = 1;
export const DASH_UNITS = 3;
/** Pausa entre símbolos de uma mesma letra. */
export const SYMBOL_GAP_UNITS = 1;
/** Pausa entre letras. */
export const LETTER_GAP_UNITS = 3;
/** Pausa entre palavras. */
export const WORD_GAP_UNITS = 7;

/** Duração da unidade base (ponto) em milissegundos para a velocidade dada. */
export function unitMs(speedWpm: number): number {
  return 1200 / speedWpm;
}

export type MorseSymbol = '.' | '-';

/**
 * Um pressionamento vira traço a partir de 2 unidades — meio caminho entre o
 * ponto (1) e o traço (3). Mesmo valor de `DASH_THRESHOLD_UNITS` no backend.
 */
export const DASH_THRESHOLD_UNITS = 2;

/**
 * Folga aceita sobre a duração nominal do traço antes de o backend rejeitar
 * o pressionamento como incompatível com o `speed_wpm` configurado
 * (`DURATION_TOLERANCE` em `apps/practice/services.py`).
 */
export const PRESS_DURATION_TOLERANCE = 2.0;

/** Duração (ms) a partir da qual um pressionamento é classificado como traço. */
export function dashThresholdMs(speedWpm: number): number {
  return DASH_THRESHOLD_UNITS * unitMs(speedWpm);
}

/** Limite superior (exclusivo, em ms) aceito pelo backend para um pressionamento. */
export function maxPressMs(speedWpm: number): number {
  return DASH_UNITS * unitMs(speedWpm) * PRESS_DURATION_TOLERANCE;
}

/**
 * Classifica a duração de um pressionamento com a mesma regra que o backend
 * aplica ao validar/reclassificar `press_durations`: ponto abaixo de 2
 * unidades, traço a partir daí, e `null` quando a duração está fora da faixa
 * `0 < duração < 6 unidades` que o servidor aceita — o consumidor deve
 * tratar como entrada inválida, não como símbolo.
 */
export function classifyPress(durationMs: number, speedWpm: number): MorseSymbol | null {
  if (durationMs <= 0 || durationMs >= maxPressMs(speedWpm)) {
    return null;
  }
  return durationMs < dashThresholdMs(speedWpm) ? '.' : '-';
}
