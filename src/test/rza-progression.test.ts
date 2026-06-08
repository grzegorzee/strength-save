import { describe, expect, it } from 'vitest';
import {
  getRzaIncrement,
  getRzaProgression,
  getLastSessionMetrics,
  getRzaAdvice,
} from '@/lib/rza-progression';
import type { WorkoutSession } from '@/types';

describe('getRzaIncrement', () => {
  it('zwraca inkrement z arkusza dla ćwiczeń RZA', () => {
    expect(getRzaIncrement('Przysiad tylny')).toBe(5);
    expect(getRzaIncrement('Machine/cable lateral raise')).toBe(1);
  });
  it('finisher/core mają inkrement 0', () => {
    expect(getRzaIncrement('Air bike / farmer walk')).toBe(0);
    expect(getRzaIncrement('Core: dead bug / plank RKC')).toBe(0);
  });
  it('domyślny inkrement dla ćwiczeń spoza RZA', () => {
    expect(getRzaIncrement('Jakieś nowe ćwiczenie')).toBe(2.5);
  });
});

describe('getRzaProgression — reguła RZA', () => {
  const base = { exerciseName: 'Przysiad tylny', bestKg: 100 };

  it('OK + RPE<=8.5 + ból<=2 + jakość>=3 → progress (+inkrement)', () => {
    const a = getRzaProgression({ ...base, rpe: 8, pain: 1, quality: 4 });
    expect(a?.decision).toBe('progress');
    expect(a?.nextKg).toBe(105);
  });

  it('RPE>=9.5 → deload (-inkrement)', () => {
    const a = getRzaProgression({ ...base, rpe: 9.5, pain: 0, quality: 5 });
    expect(a?.decision).toBe('deload');
    expect(a?.nextKg).toBe(95);
  });

  it('ból>=4 → deload nawet przy niskim RPE', () => {
    const a = getRzaProgression({ ...base, rpe: 7, pain: 4, quality: 5 });
    expect(a?.decision).toBe('deload');
  });

  it('RPE 9 (między 8.5 a 9.5) → repeat', () => {
    const a = getRzaProgression({ ...base, rpe: 9, pain: 1, quality: 4 });
    expect(a?.decision).toBe('repeat');
    expect(a?.nextKg).toBe(100);
  });

  it('niska jakość → repeat (nie progresuje)', () => {
    const a = getRzaProgression({ ...base, rpe: 8, pain: 1, quality: 2 });
    expect(a?.decision).toBe('repeat');
  });

  it('brak RPE → null (fallback do innych porad)', () => {
    expect(getRzaProgression({ ...base, pain: 1, quality: 5 })).toBeNull();
  });

  it('brak bólu/jakości traktowany optymistycznie (progress przy dobrym RPE)', () => {
    const a = getRzaProgression({ ...base, rpe: 8 });
    expect(a?.decision).toBe('progress');
  });

  it('ćwiczenie bez progresji ciężarem (inkrement 0) → null', () => {
    expect(getRzaProgression({ exerciseName: 'Air bike / farmer walk', bestKg: 0, rpe: 7 })).toBeNull();
  });

  it('deload nie schodzi poniżej zera', () => {
    const a = getRzaProgression({ exerciseName: 'Machine/cable lateral raise', bestKg: 0.5, rpe: 10 });
    expect(a?.nextKg).toBe(0);
  });
});

const mkSession = (
  date: string,
  completed: boolean,
  ex: { exerciseId: string; sets: { weight: number; reps: number; completed?: boolean; isWarmup?: boolean }[]; rpe?: number; pain?: number; quality?: number },
): WorkoutSession => ({
  id: `w-${date}`,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed,
  exercises: [{
    exerciseId: ex.exerciseId,
    sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps, completed: s.completed ?? true, ...(s.isWarmup && { isWarmup: true }) })),
    ...(ex.rpe !== undefined && { rpe: ex.rpe }),
    ...(ex.pain !== undefined && { pain: ex.pain }),
    ...(ex.quality !== undefined && { quality: ex.quality }),
  }],
});

describe('getLastSessionMetrics', () => {
  it('bierze najświeższą ukończoną sesję z ćwiczeniem + jej metryki', () => {
    const workouts = [
      mkSession('2026-06-01', true, { exerciseId: 'sq', sets: [{ weight: 90, reps: 5 }], rpe: 7 }),
      mkSession('2026-06-05', true, { exerciseId: 'sq', sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 4 }], rpe: 8, pain: 1, quality: 4 }),
    ];
    const last = getLastSessionMetrics(workouts, 'sq');
    expect(last?.date).toBe('2026-06-05');
    expect(last?.bestKg).toBe(100);
    expect(last?.rpe).toBe(8);
  });

  it('pomija sesje nieukończone i rozgrzewkowe serie', () => {
    const workouts = [
      mkSession('2026-06-05', false, { exerciseId: 'sq', sets: [{ weight: 120, reps: 5 }], rpe: 9 }),
      mkSession('2026-06-04', true, { exerciseId: 'sq', sets: [{ weight: 50, reps: 5, isWarmup: true }, { weight: 95, reps: 5 }], rpe: 8 }),
    ];
    const last = getLastSessionMetrics(workouts, 'sq');
    expect(last?.date).toBe('2026-06-04');
    expect(last?.bestKg).toBe(95);
  });

  it('null gdy brak danych', () => {
    expect(getLastSessionMetrics([], 'sq')).toBeNull();
  });
});

describe('getRzaAdvice — integracja z historią', () => {
  it('liczy rekomendację z ostatniej sesji', () => {
    const workouts = [
      mkSession('2026-06-05', true, { exerciseId: 'sq', sets: [{ weight: 100, reps: 5 }], rpe: 8, pain: 1, quality: 5 }),
    ];
    const a = getRzaAdvice(workouts, 'sq', 'Przysiad tylny');
    expect(a?.decision).toBe('progress');
    expect(a?.nextKg).toBe(105);
  });
});
