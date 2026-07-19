import { describe, expect, it } from 'vitest';
import { generateWarmupSets } from '@/lib/warmup-generator';

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
