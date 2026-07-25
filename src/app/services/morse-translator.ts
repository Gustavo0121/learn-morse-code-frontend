import { CHAR_TO_CODE, CODE_TO_CHAR } from './morse-alphabet';

/** Marca, no código Morse, um caractere de texto sem correspondência no alfabeto ITU. */
export const UNSUPPORTED_MARK = '#';
/** Marca, no texto, um token Morse que não corresponde a nenhum caractere. */
export const INVALID_MARK = '?';

export interface TextToMorseResult {
  /** Pronto para `MorseAudioService.playSequence`: espaço entre letras, `/` entre palavras. */
  code: string;
  /** Caracteres sem código Morse, deduplicados, na ordem em que aparecem. */
  unsupported: string[];
}

export interface MorseToTextResult {
  text: string;
  /** Tokens que não correspondem a nenhum código Morse válido, deduplicados. */
  invalidTokens: string[];
}

/**
 * Traduz texto para Morse usando o alfabeto ITU local. Caracteres sem código
 * (fora do alfabeto) viram `UNSUPPORTED_MARK` no resultado e são listados em
 * `unsupported`, sem interromper o restante da tradução.
 */
export function textToMorse(input: string): TextToMorseResult {
  const unsupported: string[] = [];
  const words = input.trim().split(/\s+/).filter(Boolean);

  const code = words
    .map((word) =>
      [...word.toUpperCase()]
        .map((character) => {
          const mapped = CHAR_TO_CODE.get(character);
          if (mapped) {
            return mapped;
          }
          if (!unsupported.includes(character)) {
            unsupported.push(character);
          }
          return UNSUPPORTED_MARK;
        })
        .join(' '),
    )
    .join(' / ');

  return { code, unsupported };
}

/**
 * Traduz Morse para texto: `.`/`-` por símbolo, espaço entre letras, `/`
 * entre palavras. Tokens que não decodificam viram `INVALID_MARK` no
 * resultado e são listados em `invalidTokens`, sem interromper o resto.
 */
export function morseToText(input: string): MorseToTextResult {
  const invalidTokens: string[] = [];
  const words = input
    .trim()
    .split('/')
    .map((word) => word.trim())
    .filter(Boolean);

  const text = words
    .map((word) =>
      word
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => {
          const mapped = CODE_TO_CHAR.get(token);
          if (mapped) {
            return mapped;
          }
          if (!invalidTokens.includes(token)) {
            invalidTokens.push(token);
          }
          return INVALID_MARK;
        })
        .join(''),
    )
    .join(' ');

  return { text, invalidTokens };
}
