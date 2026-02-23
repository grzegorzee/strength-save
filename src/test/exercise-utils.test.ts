import { describe, it, expect } from 'vitest';
import {
  parseSetCount,
  createEmptySets,
  sanitizeSets,
  parseRepRange,
  getProgressionAdvice,
  isIsolationExercise,
  getRestDuration,
} from '@/lib/exercise-utils';

describe('parseSetCount', () => {
  it('extracts number from "3 x 6-8"', () => {
    expect(parseSetCount('3 x 6-8')).toBe(3);
  });

  it('extracts number from "3 x 10-12"', () => {
    expect(parseSetCount('3 x 10-12')).toBe(3);
  });

  it('extracts number from "3 x 10/noga"', () => {
    expect(parseSetCount('3 x 10/noga')).toBe(3);
  });

  it('extracts number from "3 x MAX"', () => {
    expect(parseSetCount('3 x MAX')).toBe(3);
  });

  it('defaults to 3 for unparseable string', () => {
    expect(parseSetCount('abc')).toBe(3);
  });

  it('defaults to 3 for empty string', () => {
    expect(parseSetCount('')).toBe(3);
  });

  it('handles "4 x 8-10"', () => {
    expect(parseSetCount('4 x 8-10')).toBe(4);
  });
});

describe('createEmptySets', () => {
  it('creates warmup + working sets', () => {
    const sets = createEmptySets(3);
    expect(sets).toHaveLength(4); // 1 warmup + 3 working
    expect(sets[0].isWarmup).toBe(true);
    expect(sets[1].isWarmup).toBeUndefined();
    expect(sets[2].isWarmup).toBeUndefined();
    expect(sets[3].isWarmup).toBeUndefined();
  });

  it('all sets start at 0 reps, 0 weight, not completed', () => {
    const sets = createEmptySets(2);
    sets.forEach(s => {
      expect(s.reps).toBe(0);
      expect(s.weight).toBe(0);
      expect(s.completed).toBe(false);
    });
  });

  it('creates at least warmup set even with 0 count', () => {
    const sets = createEmptySets(0);
    expect(sets).toHaveLength(1);
    expect(sets[0].isWarmup).toBe(true);
  });
});

describe('sanitizeSets', () => {
  it('returns empty sets when undefined', () => {
    const sets = sanitizeSets(undefined, 3);
    expect(sets).toHaveLength(4); // 1 warmup + 3 working
    expect(sets[0].isWarmup).toBe(true);
  });

  it('returns empty sets when empty array', () => {
    const sets = sanitizeSets([], 3);
    expect(sets).toHaveLength(4);
  });

  it('adds warmup if missing', () => {
    const input = [
      { reps: 8, weight: 40, completed: true },
      { reps: 8, weight: 40, completed: true },
    ];
    const sets = sanitizeSets(input, 3);
    expect(sets[0].isWarmup).toBe(true);
    expect(sets[0].reps).toBe(0);
    expect(sets[1].reps).toBe(8);
    expect(sets[1].weight).toBe(40);
  });

  it('preserves warmup if already present', () => {
    const input = [
      { reps: 5, weight: 20, completed: true, isWarmup: true },
      { reps: 8, weight: 40, completed: true },
    ];
    const sets = sanitizeSets(input, 3);
    expect(sets).toHaveLength(2);
    expect(sets[0].isWarmup).toBe(true);
    expect(sets[0].reps).toBe(5);
  });

  it('replaces undefined values with 0/false', () => {
    const input = [
      { reps: undefined as unknown as number, weight: undefined as unknown as number, completed: undefined as unknown as boolean, isWarmup: true },
    ];
    const sets = sanitizeSets(input, 1);
    expect(sets[0].reps).toBe(0);
    expect(sets[0].weight).toBe(0);
    expect(sets[0].completed).toBe(false);
  });
});

// --- parseRepRange tests ---

describe('parseRepRange', () => {
  it('parses "3 x 6-8" to range', () => {
    const result = parseRepRange('3 x 6-8');
    expect(result).toEqual({ min: 6, max: 8 });
  });

  it('parses "3 x 10-12" to range', () => {
    const result = parseRepRange('3 x 10-12');
    expect(result).toEqual({ min: 10, max: 12 });
  });

  it('parses "3 x 10/noga" as fixed', () => {
    const result = parseRepRange('3 x 10/noga');
    expect(result).toEqual({ min: 10, max: 10, isFixed: true });
  });

  it('parses "3 x 10-15" to range', () => {
    const result = parseRepRange('3 x 10-15');
    expect(result).toEqual({ min: 10, max: 15 });
  });

  it('parses "3 x MAX" as isMax', () => {
    const result = parseRepRange('3 x MAX');
    expect(result).toEqual({ min: 0, max: 0, isMax: true });
  });
});

// --- isIsolationExercise tests ---

describe('isIsolationExercise', () => {
  it('index 0-2 without superset = compound', () => {
    expect(isIsolationExercise(0)).toBe(false);
    expect(isIsolationExercise(1)).toBe(false);
    expect(isIsolationExercise(2)).toBe(false);
  });

  it('index >= 3 = isolation', () => {
    expect(isIsolationExercise(3)).toBe(true);
    expect(isIsolationExercise(4)).toBe(true);
  });

  it('superset = isolation regardless of index', () => {
    expect(isIsolationExercise(0, true)).toBe(true);
    expect(isIsolationExercise(1, true)).toBe(true);
  });
});

// --- getProgressionAdvice tests ---

describe('getProgressionAdvice', () => {
  it('returns increase when all sets at max reps (compound)', () => {
    const advice = getProgressionAdvice(
      { min: 6, max: 8 },
      [
        { reps: 8, weight: 40, completed: true },
        { reps: 8, weight: 40, completed: true },
        { reps: 8, weight: 40, completed: true },
      ],
      0,
    );
    expect(advice).toEqual({ type: 'increase', label: '↑ +2.5kg', increment: 2.5 });
  });

  it('returns increase with +1kg for isolation', () => {
    const advice = getProgressionAdvice(
      { min: 10, max: 12 },
      [
        { reps: 12, weight: 15, completed: true },
        { reps: 12, weight: 15, completed: true },
      ],
      4,
      true,
    );
    expect(advice).toEqual({ type: 'increase', label: '↑ +1kg', increment: 1 });
  });

  it('returns maintain when below min', () => {
    const advice = getProgressionAdvice(
      { min: 6, max: 8 },
      [
        { reps: 5, weight: 40, completed: true },
        { reps: 6, weight: 40, completed: true },
      ],
      0,
    );
    expect(advice).toEqual({ type: 'maintain', label: 'Utrzymaj ciężar', increment: 0 });
  });

  it('returns repeat when in range but not all at max', () => {
    const advice = getProgressionAdvice(
      { min: 6, max: 8 },
      [
        { reps: 7, weight: 40, completed: true },
        { reps: 6, weight: 40, completed: true },
        { reps: 7, weight: 40, completed: true },
      ],
      0,
    );
    expect(advice).toEqual({ type: 'repeat', label: 'Powtórz', increment: 0 });
  });

  it('returns null for MAX exercises', () => {
    const advice = getProgressionAdvice(
      { min: 0, max: 0, isMax: true },
      [{ reps: 15, weight: 0, completed: true }],
      4,
    );
    expect(advice).toBeNull();
  });

  it('returns null when no previous sets', () => {
    const advice = getProgressionAdvice(
      { min: 6, max: 8 },
      [],
      0,
    );
    expect(advice).toBeNull();
  });
});

// --- getRestDuration tests ---

describe('getRestDuration', () => {
  it('returns 150s for compound exercises', () => {
    expect(getRestDuration({ exerciseIndex: 0, isSuperset: false, isFirstInSuperset: false })).toBe(150);
    expect(getRestDuration({ exerciseIndex: 1, isSuperset: false, isFirstInSuperset: false })).toBe(150);
    expect(getRestDuration({ exerciseIndex: 2, isSuperset: false, isFirstInSuperset: false })).toBe(150);
  });

  it('returns 75s for isolation exercises', () => {
    expect(getRestDuration({ exerciseIndex: 3, isSuperset: false, isFirstInSuperset: false })).toBe(75);
    expect(getRestDuration({ exerciseIndex: 4, isSuperset: false, isFirstInSuperset: false })).toBe(75);
  });

  it('returns 15s for first exercise in superset (A→B transition)', () => {
    expect(getRestDuration({ exerciseIndex: 4, isSuperset: true, isFirstInSuperset: true })).toBe(15);
  });

  it('returns 90s after completing superset B', () => {
    expect(getRestDuration({ exerciseIndex: 4, isSuperset: true, isFirstInSuperset: false })).toBe(90);
  });
});
