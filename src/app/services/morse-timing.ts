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
