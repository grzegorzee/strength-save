import { describe, expect, it } from 'vitest';
import { clampSet, isExerciseFullyCompleted } from '@/lib/workout-sanitizers';

describe('clampSet — nowe pola typów serii (Z105)', () => {
  it('przenosi durationSec/distanceM/assistWeight z clampem', () => {
    const out = clampSet({
      reps: 8, weight: 60, completed: true,
      durationSec: 90.7, distanceM: 400.5, assistWeight: 25.5,
    });
    expect(out.durationSec).toBe(91);
    expect(out.distanceM).toBe(400.5);
    expect(out.assistWeight).toBe(25.5);
  });

  it('clampuje wartości ujemne i absurdalne', () => {
    const out = clampSet({
      reps: 5, weight: 100, completed: false,
      durationSec: -10, distanceM: 99999999, assistWeight: 5000,
    });
    expect(out.durationSec).toBe(0);
    expect(out.distanceM).toBe(1000000);
    expect(out.assistWeight).toBe(999);
  });

  it('brak nowych pól = brak kluczy w wyniku (Firestore nie znosi undefined)', () => {
    const out = clampSet({ reps: 8, weight: 60, completed: true });
    expect(Object.keys(out)).toEqual(['reps', 'weight', 'completed']);
    expect(Object.values(out).every((v) => v !== undefined)).toBe(true);
  });

  it('zachowuje dotychczasowe zachowanie dla reps/weight/isWarmup (regresja)', () => {
    expect(clampSet({ reps: 8.6, weight: 60.25, completed: true, isWarmup: true }))
      .toEqual({ reps: 9, weight: 60.25, completed: true, isWarmup: true });
    expect(clampSet({ reps: -5, weight: 5000, completed: false }))
      .toEqual({ reps: 0, weight: 999, completed: false });
  });
});

describe('isExerciseFullyCompleted', () => {
  it('allows skipping an incomplete exercise', () => {
    expect(isExerciseFullyCompleted([
      { reps: 8, weight: 60, completed: true },
      { reps: 8, weight: 60, completed: false },
    ])).toBe(false);
  });

  it('blocks skipping when every working set is complete', () => {
    expect(isExerciseFullyCompleted([
      { reps: 10, weight: 20, completed: true, isWarmup: true },
      { reps: 8, weight: 60, completed: true },
      { reps: 8, weight: 60, completed: true },
    ])).toBe(true);
  });

  it('does not treat warm-up-only data as a completed exercise', () => {
    expect(isExerciseFullyCompleted([
      { reps: 10, weight: 20, completed: true, isWarmup: true },
    ])).toBe(false);
  });
});
