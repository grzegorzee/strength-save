import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { getExerciseBest1RM, calculate1RM, formatPRValue } from '@/lib/pr-utils';
import {
  buildRecordBadges,
  formatEst1RMBadge,
  formatMaxLiftBadge,
} from '@/lib/record-labels';

const workoutWith = (sets: WorkoutSession['exercises'][number]['sets']): WorkoutSession[] => [{
  id: 'w1', userId: 'u1', dayId: 'd1', date: '2026-08-10', completed: true,
  exercises: [{ exerciseId: 'bench', sets }],
}];

const kg = (v: number) => `${Math.round(v)} kg`;
const lb = (v: number) => `${Math.round(v * 2.20462)} lb`;

describe('B-T2: rekord ciężaru kontra szacowane 1RM', () => {
  it('wysokie powtórzenia: estymacja z widocznym źródłem 60×12, max osobno', () => {
    const best = getExerciseBest1RM(workoutWith([
      { reps: 12, weight: 60, completed: true },
    ]), 'bench');
    const badges = buildRecordBadges(best);
    expect(badges.est1RM).toMatchObject({ sourceWeightKg: 60, sourceReps: 12 });
    expect(badges.est1RM?.valueKg).toBeCloseTo(calculate1RM(60, 12), 5);
    expect(badges.maxLift).toEqual({ weightKg: 60 });
    expect(formatEst1RMBadge(badges.est1RM!, 'Szac. 1RM', kg))
      .toBe(`Szac. 1RM ${Math.round(calculate1RM(60, 12))} kg · 60 kg×12`);
  });

  it('bodyweight (weight 0): brak estymacji i brak max', () => {
    const best = getExerciseBest1RM(workoutWith([
      { reps: 10, weight: 0, completed: true },
    ]), 'bench');
    const badges = buildRecordBadges(best);
    expect(badges.est1RM).toBeNull();
    expect(badges.maxLift).toBeNull();
  });

  it('rozgrzewka nie tworzy ani estymacji, ani rekordu ciężaru', () => {
    const best = getExerciseBest1RM(workoutWith([
      { reps: 10, weight: 40, completed: true, isWarmup: true },
    ]), 'bench');
    const badges = buildRecordBadges(best);
    expect(badges.est1RM).toBeNull();
    expect(badges.maxLift).toBeNull();
  });

  it('brak źródła: estymacja bez serii źródłowej nie jest pokazywana, max zostaje', () => {
    const badges = buildRecordBadges({
      exerciseId: 'bench', maxWeight: 100, best1RM: 110,
      best1RMWeight: 0, best1RMReps: 0, bestDate: '2026-08-01',
    });
    expect(badges.est1RM).toBeNull();
    expect(badges.maxLift).toEqual({ weightKg: 100 });
    expect(formatMaxLiftBadge(badges.maxLift!, 'Max', kg)).toBe('Max 100 kg');
  });

  it('jednostki lb: wartości przechodzą przez formatter, kg zostaje surowe', () => {
    const best = getExerciseBest1RM(workoutWith([
      { reps: 5, weight: 100, completed: true },
    ]), 'bench');
    const badges = buildRecordBadges(best);
    expect(badges.maxLift?.weightKg).toBe(100);
    expect(formatMaxLiftBadge(badges.maxLift!, 'Max', lb)).toBe('Max 220 lb');
    expect(formatEst1RMBadge(badges.est1RM!, 'Est. 1RM', lb)).toContain('220 lb×5');
  });

  it('formatPRValue: PR typu 1rm jest podpisany jako estymacja, weight zostaje faktem', () => {
    const fmt = {
      prReps: (n: number) => `${n} reps`,
      weight: kg,
      duration: (s: number) => `${s}s`,
      est1RM: (v: number) => `Szac. 1RM: ${kg(v)}`,
    };
    const est = formatPRValue(
      { exerciseId: 'e', exerciseName: 'Bench', type: '1rm', newValue: 110, oldValue: 100 },
      fmt,
    );
    expect(est).toBe('Szac. 1RM: 110 kg');
    const fact = formatPRValue(
      { exerciseId: 'e', exerciseName: 'Bench', type: 'weight', newValue: 105, oldValue: 100 },
      fmt,
    );
    expect(fact).toBe('105 kg');
  });
});
