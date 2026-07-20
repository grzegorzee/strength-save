import { describe, expect, it } from 'vitest';
import { generateWarmupSets } from '@/lib/warmup-generator';
import { computePlates } from '@/lib/plate-calculator';

describe('generateWarmupSets (Z108)', () => {
  it('schemat: pusty gryf x10, 50% x8, 70% x5, 90% x2 (zaokrąglanie do 2.5)', () => {
    const sets = generateWarmupSets(100, 'weight_reps', 20)!;
    expect(sets).toEqual([
      { reps: 10, weight: 20, completed: false, isWarmup: true },
      { reps: 8, weight: 50, completed: false, isWarmup: true },
      { reps: 5, weight: 70, completed: false, isWarmup: true },
      { reps: 2, weight: 90, completed: false, isWarmup: true },
    ]);
  });

  it('zaokrągla do 2.5 kg', () => {
    const sets = generateWarmupSets(87.5, 'weight_reps', 20)!;
    // 50% z 87.5 = 43.75 -> 42.5 (najbliższe 2.5); 70% = 61.25 -> 60; 90% = 78.75 -> 77.5
    expect(sets.map((s) => s.weight)).toEqual([20, 42.5, 60, 77.5]);
  });

  it('pomija serie z ciężarem nie większym niż gryf', () => {
    // 50% z 30 = 15 <= 20 (gryf) -> pominięte; 70% = 21 -> 20 (floor) pominięte; 90% = 27 -> 25.
    const sets = generateWarmupSets(30, 'weight_reps', 20)!;
    expect(sets).toEqual([
      { reps: 10, weight: 20, completed: false, isWarmup: true },
      { reps: 2, weight: 25, completed: false, isWarmup: true },
    ]);
  });

  it('bodyweight/duration => null (rozgrzewka procentowa nie ma sensu)', () => {
    expect(generateWarmupSets(0, 'bodyweight_reps', 20)).toBeNull();
    expect(generateWarmupSets(0, 'duration', 20)).toBeNull();
    expect(generateWarmupSets(80, 'assisted_bodyweight', 20)).toBeNull();
  });

  it('ciężar roboczy nie większy niż gryf => tylko pusty gryf', () => {
    const sets = generateWarmupSets(20, 'weight_reps', 20)!;
    expect(sets).toEqual([{ reps: 10, weight: 20, completed: false, isWarmup: true }]);
  });

  it('zero/ujemny ciężar roboczy => null', () => {
    expect(generateWarmupSets(0, 'weight_reps', 20)).toBeNull();
    expect(generateWarmupSets(-10, 'weight_reps', 20)).toBeNull();
  });
});

// X17B Z134.2: rozgrzewka zaokrąglana do REALNIE dostępnych talerzy, nie do
// abstrakcyjnych 2,5 kg. Wzorzec Hevy: nie proponuj ciężaru, którego user nie złoży.
describe('generateWarmupSets — zaokrąglanie do inwentarza (Z134.2)', () => {
  const inv = (...items: Array<[number, number]>) => items.map(([weightKg, count]) => ({ weightKg, count }));

  it('bez inwentarza zachowuje dotychczasowe zaokrąglanie do 2.5', () => {
    const sets = generateWarmupSets(87.5, 'weight_reps', 20)!;
    expect(sets.map((s) => s.weight)).toEqual([20, 42.5, 60, 77.5]);
  });

  it('KAŻDY zaproponowany ciężar da się złożyć z posiadanych talerzy', () => {
    // Siłownia z samymi 20 kg (bar 20): składalne wyłącznie 20, 60, 100, 140...
    // Stare zaokrąglanie do 2,5 dawało 60/84/108 — 84 i 108 nie do złożenia.
    const inventory = inv([20, 8]);
    const sets = generateWarmupSets(120, 'weight_reps', 20, inventory)!;
    for (const s of sets) {
      expect(computePlates(s.weight, 20, inventory).exact).toBe(true);
    }
  });

  it('nietypowe talerze też są respektowane (12.5 kg)', () => {
    // Bar 20 + talerze 12.5 => składalne 20, 45, 70, 95...
    const inventory = inv([12.5, 8]);
    const sets = generateWarmupSets(95, 'weight_reps', 20, inventory)!;
    for (const s of sets) {
      expect(computePlates(s.weight, 20, inventory).exact).toBe(true);
    }
  });

  it('nigdy nie proponuje ciężaru równego lub większego od roboczego', () => {
    const sets = generateWarmupSets(60, 'weight_reps', 20, inv([25, 8], [20, 8]))!;
    for (const s of sets.slice(1)) expect(s.weight).toBeLessThan(60);
  });

  it('ubogi inwentarz nie generuje duplikatów serii', () => {
    // Tylko 25 kg: składalne 20 i 70. Zaokrąglenie w dół zbiłoby 50→20 i 90→70,
    // więc bez deduplikacji powstałyby powtórzone wiersze.
    const sets = generateWarmupSets(100, 'weight_reps', 20, inv([25, 2]))!;
    const weights = sets.map((s) => s.weight);
    expect(new Set(weights).size).toBe(weights.length);
  });
});
