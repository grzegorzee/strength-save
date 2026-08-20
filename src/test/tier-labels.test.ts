import { describe, expect, it } from 'vitest';
import { computeTier } from '@/lib/tier';

// Spec 2026-08-11 (redesign Profilu): słowo "Tier" zarezerwowane dla planu
// subskrypcji; poziomy gamifikacyjne to Newcomer/Rookie/Advanced/Veteran/Elite.
describe('etykiety poziomów gamifikacyjnych', () => {
  it('score 40+ daje "Veteran" (bez słowa Tier) w PL i EN', () => {
    expect(computeTier(40, 0, 'pl').label).toBe('Veteran');
    expect(computeTier(40, 0, 'en').label).toBe('Veteran');
  });

  it('score 80+ daje "Elite" (bez słowa Tier) w PL i EN', () => {
    expect(computeTier(80, 0, 'pl').label).toBe('Elite');
    expect(computeTier(80, 0, 'en').label).toBe('Elite');
  });

  it('próg następnego poziomu też używa nowej etykiety', () => {
    expect(computeTier(20, 0, 'en').next).toBe('Veteran');
    expect(computeTier(40, 0, 'en').next).toBe('Elite');
  });

  it('niższe poziomy bez zmian', () => {
    expect(computeTier(0, 0, 'en').label).toBe('Newcomer');
    expect(computeTier(5, 0, 'en').label).toBe('Rookie');
    expect(computeTier(20, 0, 'en').label).toBe('Advanced');
  });
});

// Fala 2 (redesign Profilu): licznik "N do: {poziom}" w identity liczy z remaining.
describe('computeTier.remaining', () => {
  it('score na progu: pełny dystans do następnego poziomu', () => {
    expect(computeTier(5, 0, 'en').remaining).toBe(15); // rookie(5) -> advanced(20)
  });

  it('score tuż przed progiem: remaining = 1', () => {
    expect(computeTier(19, 0, 'en').remaining).toBe(1);
  });

  it('PR-y wchodzą do score (x2)', () => {
    expect(computeTier(10, 2, 'en').remaining).toBe(6); // score 14 -> advanced(20)
  });

  it('elite (brak następnego poziomu): remaining = null', () => {
    expect(computeTier(80, 0, 'en').remaining).toBeNull();
  });
});
