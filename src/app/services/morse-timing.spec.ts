import { classifyPress, dashThresholdMs, maxPressMs, unitMs } from './morse-timing';

describe('morse-timing', () => {
  it('deriva a unidade base do speed_wpm (padrão PARIS)', () => {
    expect(unitMs(20)).toBe(60);
    expect(unitMs(40)).toBe(30);
    expect(unitMs(5)).toBe(240);
  });

  it('deriva limiar de traço (2 unidades) e limite máximo (6 unidades) como o backend', () => {
    expect(dashThresholdMs(20)).toBe(120);
    expect(maxPressMs(20)).toBe(360);
    expect(dashThresholdMs(40)).toBe(60);
    expect(maxPressMs(40)).toBe(180);
  });

  // Mesma tabela de verdade de classify_press + limite do serializer no
  // backend (apps/practice/services.py).
  it.each([
    { wpm: 20, durationMs: 100, expected: '.' },
    { wpm: 20, durationMs: 119, expected: '.' },
    { wpm: 20, durationMs: 120, expected: '-' },
    { wpm: 20, durationMs: 359, expected: '-' },
    { wpm: 20, durationMs: 360, expected: null },
    { wpm: 20, durationMs: 0, expected: null },
    // A mesma duração muda de classe conforme a velocidade configurada.
    { wpm: 40, durationMs: 100, expected: '-' },
    { wpm: 40, durationMs: 59, expected: '.' },
    { wpm: 40, durationMs: 180, expected: null },
    { wpm: 5, durationMs: 400, expected: '.' },
    { wpm: 5, durationMs: 500, expected: '-' },
  ])('classifica $durationMs ms a $wpm WPM como $expected', ({ wpm, durationMs, expected }) => {
    expect(classifyPress(durationMs, wpm)).toBe(expected);
  });
});
