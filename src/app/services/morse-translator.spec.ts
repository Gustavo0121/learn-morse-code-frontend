import { morseToText, textToMorse } from './morse-translator';

describe('morse-translator', () => {
  describe('textToMorse', () => {
    it('traduz uma única palavra', () => {
      expect(textToMorse('SOS')).toEqual({ code: '... --- ...', unsupported: [] });
    });

    it('separa palavras com " / "', () => {
      expect(textToMorse('HI THERE')).toEqual({
        code: '.... .. / - .... . .-. .',
        unsupported: [],
      });
    });

    it('normaliza para maiúsculas', () => {
      expect(textToMorse('sos')).toEqual({ code: '... --- ...', unsupported: [] });
    });

    it('marca caracteres sem código com # e lista os não suportados sem interromper o resto', () => {
      expect(textToMorse('A~B~A')).toEqual({
        code: '.- # -... # .-',
        unsupported: ['~'],
      });
    });

    it('traduz pontuação do alfabeto ITU', () => {
      expect(textToMorse('?')).toEqual({ code: '..--..', unsupported: [] });
    });

    it('entrada vazia ou só espaços retorna resultado vazio', () => {
      expect(textToMorse('')).toEqual({ code: '', unsupported: [] });
      expect(textToMorse('   ')).toEqual({ code: '', unsupported: [] });
    });
  });

  describe('morseToText', () => {
    it('traduz uma única palavra', () => {
      expect(morseToText('... --- ...')).toEqual({ text: 'SOS', invalidTokens: [] });
    });

    it('separa palavras com /', () => {
      expect(morseToText('.... .. / - .... . .-. .')).toEqual({
        text: 'HI THERE',
        invalidTokens: [],
      });
    });

    it('tolera espaços irregulares entre símbolos e letras', () => {
      expect(morseToText('  ...   ---  ...  ')).toEqual({ text: 'SOS', invalidTokens: [] });
    });

    it('marca token inválido com ? e lista os inválidos sem interromper o resto', () => {
      expect(morseToText('... .-.-.-.-.- ---')).toEqual({
        text: 'S?O',
        invalidTokens: ['.-.-.-.-.-'],
      });
    });

    it('trata "?" literal como token inválido', () => {
      expect(morseToText('?')).toEqual({ text: '?', invalidTokens: ['?'] });
    });

    it('entrada vazia ou só espaços retorna resultado vazio', () => {
      expect(morseToText('')).toEqual({ text: '', invalidTokens: [] });
      expect(morseToText('   ')).toEqual({ text: '', invalidTokens: [] });
    });
  });

  it('round-trip: morseToText(textToMorse(X).code).text === X em maiúsculas para chars suportados', () => {
    const input = 'HELLO WORLD 123';
    expect(morseToText(textToMorse(input).code).text).toBe(input.toUpperCase());
  });
});
