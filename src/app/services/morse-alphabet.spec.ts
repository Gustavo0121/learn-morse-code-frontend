import { CHAR_TO_CODE, CODE_TO_CHAR, ITU_MORSE_ALPHABET } from './morse-alphabet';

describe('morse-alphabet', () => {
  it('contém as 26 letras, 10 números e 18 sinais de pontuação do seed do backend', () => {
    const byType = (type: 'letter' | 'number' | 'punctuation') =>
      ITU_MORSE_ALPHABET.filter((entry) => entry.type === type);

    expect(byType('letter')).toHaveLength(26);
    expect(byType('number')).toHaveLength(10);
    expect(byType('punctuation')).toHaveLength(18);
    expect(ITU_MORSE_ALPHABET).toHaveLength(54);
  });

  it('não tem caractere nem código duplicado', () => {
    const characters = ITU_MORSE_ALPHABET.map((entry) => entry.character);
    const codes = ITU_MORSE_ALPHABET.map((entry) => entry.code);

    expect(new Set(characters).size).toBe(characters.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('CHAR_TO_CODE e CODE_TO_CHAR são inversos exatos', () => {
    expect(CHAR_TO_CODE.size).toBe(ITU_MORSE_ALPHABET.length);
    expect(CODE_TO_CHAR.size).toBe(ITU_MORSE_ALPHABET.length);

    for (const { character, code } of ITU_MORSE_ALPHABET) {
      expect(CHAR_TO_CODE.get(character)).toBe(code);
      expect(CODE_TO_CHAR.get(code)).toBe(character);
    }
  });

  it.each([
    ['A', '.-'],
    ['5', '.....'],
    ['?', '..--..'],
  ])('mapeia %s para %s', (character, code) => {
    expect(CHAR_TO_CODE.get(character)).toBe(code);
    expect(CODE_TO_CHAR.get(code)).toBe(character);
  });
});
