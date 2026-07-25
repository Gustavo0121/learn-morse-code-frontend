import type { MorseCharacter } from './morse-characters.service';

/**
 * Alfabeto Morse ITU-R M.1677-1, cópia local imutável do mesmo conteúdo do
 * seed do backend (`apps/morse/migrations/0004_seed_morse_characters.py`).
 *
 * Existe para permitir uma tela pública (`/translate`) sem depender de rede
 * nem de autenticação — a API inteira exige `IsAuthenticated`, incluindo
 * `GET /morse-characters`. Duplicação consciente: o padrão ITU é estável, o
 * risco de divergência é baixo, mas fica registrado aqui e em
 * `docs/ARCHITECTURE.md`.
 */
export type MorseAlphabetEntry = Omit<MorseCharacter, 'id'>;

const LETTERS: readonly [string, string][] = [
  ['A', '.-'],
  ['B', '-...'],
  ['C', '-.-.'],
  ['D', '-..'],
  ['E', '.'],
  ['F', '..-.'],
  ['G', '--.'],
  ['H', '....'],
  ['I', '..'],
  ['J', '.---'],
  ['K', '-.-'],
  ['L', '.-..'],
  ['M', '--'],
  ['N', '-.'],
  ['O', '---'],
  ['P', '.--.'],
  ['Q', '--.-'],
  ['R', '.-.'],
  ['S', '...'],
  ['T', '-'],
  ['U', '..-'],
  ['V', '...-'],
  ['W', '.--'],
  ['X', '-..-'],
  ['Y', '-.--'],
  ['Z', '--..'],
];

const NUMBERS: readonly [string, string][] = [
  ['0', '-----'],
  ['1', '.----'],
  ['2', '..---'],
  ['3', '...--'],
  ['4', '....-'],
  ['5', '.....'],
  ['6', '-....'],
  ['7', '--...'],
  ['8', '---..'],
  ['9', '----.'],
];

const PUNCTUATION: readonly [string, string][] = [
  ['.', '.-.-.-'],
  [',', '--..--'],
  ['?', '..--..'],
  ["'", '.----.'],
  ['!', '-.-.--'],
  ['/', '-..-.'],
  ['(', '-.--.'],
  [')', '-.--.-'],
  ['&', '.-...'],
  [':', '---...'],
  [';', '-.-.-.'],
  ['=', '-...-'],
  ['+', '.-.-.'],
  ['-', '-....-'],
  ['_', '..--.-'],
  ['"', '.-..-.'],
  ['$', '...-..-'],
  ['@', '.--.-.'],
];

function buildEntries(): MorseAlphabetEntry[] {
  const groups: [MorseCharacter['type'], readonly [string, string][]][] = [
    ['letter', LETTERS],
    ['number', NUMBERS],
    ['punctuation', PUNCTUATION],
  ];
  return groups.flatMap(([type, pairs]) =>
    pairs.map(([character, code]) => ({ character, code, type })),
  );
}

export const ITU_MORSE_ALPHABET: readonly MorseAlphabetEntry[] = buildEntries();

export const CHAR_TO_CODE: ReadonlyMap<string, string> = new Map(
  ITU_MORSE_ALPHABET.map((entry) => [entry.character, entry.code]),
);

export const CODE_TO_CHAR: ReadonlyMap<string, string> = new Map(
  ITU_MORSE_ALPHABET.map((entry) => [entry.code, entry.character]),
);
