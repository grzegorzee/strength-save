import { describe, expect, it } from 'vitest';
import { formatDecimalInput, parseDecimalInput } from '@/lib/decimal-input';

// Z178: klawiatura PL podaje PRZECINEK, a input type="number" + parseFloat robił
// z "47,3" tekst nie do nadpisania przez Reacta, wariant WebKit sanitize→"" dawał
// ZAPIS 0 kg (cicha utrata). Kontrakt utila: null = "nie zmieniaj stanu" — NIGDY
// nie zamieniaj nieparsowalnego wejścia na 0.

describe('parseDecimalInput (Z178)', () => {
  it('akceptuje przecinek i kropkę', () => {
    expect(parseDecimalInput('47,3')).toBe(47.3);
    expect(parseDecimalInput('47.3')).toBe(47.3);
    expect(parseDecimalInput('47')).toBe(47);
  });

  it('stany nieparsowalne i pośrednie → null (nie 0!)', () => {
    expect(parseDecimalInput('')).toBeNull();
    expect(parseDecimalInput('abc')).toBeNull();
    expect(parseDecimalInput('47,')).toBeNull();
    expect(parseDecimalInput('.')).toBeNull();
    expect(parseDecimalInput('1,2,3')).toBeNull();
  });

  it('separatory tysięcy (spacja, U+00A0, U+202F) są ignorowane', () => {
    expect(parseDecimalInput('1 234,5')).toBe(1234.5);
    expect(parseDecimalInput('1 234,5')).toBe(1234.5);
    expect(parseDecimalInput('1 234,5')).toBe(1234.5);
  });
});

describe('formatDecimalInput (Z178)', () => {
  it('wyświetla z kropką, bez ogona zer', () => {
    expect(formatDecimalInput(47.3)).toBe('47.3');
    expect(formatDecimalInput(47)).toBe('47');
    expect(formatDecimalInput(47.35)).toBe('47.4');
    expect(formatDecimalInput(8.5, 1)).toBe('8.5');
  });
});
