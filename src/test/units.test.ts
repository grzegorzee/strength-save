import { describe, it, expect } from 'vitest';
import {
  kgToLbs,
  lbsToKg,
  toDisplayWeight,
  fromInputWeight,
  formatWeight,
  formatTonnage,
  cmToInches,
  inchesToCm,
  toDisplayLength,
  fromInputLength,
  formatLength,
  lengthUnitLabel,
  weightUnitLabel,
} from '@/lib/units';
import { clampSet } from '@/lib/workout-sanitizers';

describe('units — konwersja', () => {
  it('kgToLbs / lbsToKg round-trip', () => {
    expect(lbsToKg(kgToLbs(100))).toBeCloseTo(100, 6);
    expect(kgToLbs(lbsToKg(225))).toBeCloseTo(225, 6);
  });

  it('100 kg ≈ 220.46 lbs', () => {
    expect(kgToLbs(100)).toBeCloseTo(220.462, 2);
  });

  it('225 lbs ≈ 102.06 kg', () => {
    expect(lbsToKg(225)).toBeCloseTo(102.058, 2);
  });
});

describe('units — toDisplay / fromInput', () => {
  it('kg jest tożsamością', () => {
    expect(toDisplayWeight(80, 'kg')).toBe(80);
    expect(fromInputWeight(80, 'kg')).toBe(80);
  });

  it('lbs: display = kg→lbs, input = lbs→kg', () => {
    expect(toDisplayWeight(100, 'lbs')).toBeCloseTo(220.462, 2);
    expect(fromInputWeight(220.462, 'lbs')).toBeCloseTo(100, 2);
  });

  it('round-trip input → display zachowuje wpisaną wartość (lbs)', () => {
    const kg = fromInputWeight(185, 'lbs');
    expect(toDisplayWeight(kg, 'lbs')).toBeCloseTo(185, 6);
  });

  it('nie zaokrągla kg przy zapisie (100 lbs)', () => {
    expect(fromInputWeight(100, 'lbs')).toBeCloseTo(45.359, 3);
  });

  it('save sanitization preserves lbs → kg → lbs round-trip', () => {
    const enteredLbs = 185;
    const saved = clampSet({ reps: 5, weight: fromInputWeight(enteredLbs, 'lbs'), completed: true });
    expect(toDisplayWeight(saved.weight, 'lbs')).toBeCloseTo(enteredLbs, 6);
  });
});

describe('units — formatWeight', () => {
  it('liczba całkowita bez miejsc po przecinku', () => {
    expect(formatWeight(80, 'kg')).toBe('80 kg');
  });

  it('ułamek → 1 miejsce', () => {
    expect(formatWeight(92.5, 'kg')).toBe('92.5 kg');
  });

  it('lbs konwertuje i dokleja jednostkę', () => {
    expect(formatWeight(100, 'lbs')).toBe('220.5 lbs');
  });

  it('withUnit:false zwraca samą liczbę', () => {
    expect(formatWeight(80, 'kg', { withUnit: false })).toBe('80');
  });
});

describe('units — formatTonnage', () => {
  it('kg → tony', () => {
    expect(formatTonnage(12345, 'kg')).toBe('12.3 t');
  });

  it('lbs → tysiące funtów', () => {
    // 12345 kg ≈ 27216 lbs → 27.2 k lbs
    expect(formatTonnage(12345, 'lbs')).toBe('27.2 k lbs');
  });
});

describe('units — weightUnitLabel', () => {
  it('zwraca etykietę jednostki', () => {
    expect(weightUnitLabel('kg')).toBe('kg');
    expect(weightUnitLabel('lbs')).toBe('lbs');
  });
});

describe('units — length conversion', () => {
  it('round-trip inches → cm → inches', () => {
    expect(cmToInches(inchesToCm(36))).toBeCloseTo(36, 6);
    expect(toDisplayLength(fromInputLength(42.5, 'lbs'), 'lbs')).toBeCloseTo(42.5, 6);
  });

  it('uses cm for metric and inches for imperial measurement labels', () => {
    expect(lengthUnitLabel('kg')).toBe('cm');
    expect(lengthUnitLabel('lbs')).toBe('in');
    expect(formatLength(100, 'kg')).toBe('100 cm');
    expect(formatLength(100, 'lbs')).toBe('39.4 in');
  });
});
