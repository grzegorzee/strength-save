import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRESSION,
  isDeloadWeek,
  sanitizeProgressionConfig,
} from '@/lib/progression-engine';

describe('sanitizeProgressionConfig (Z119)', () => {
  it('poprawny config przechodzi', () => {
    expect(sanitizeProgressionConfig({ enabled: true, deloadEveryWeeks: 4 }))
      .toEqual({ enabled: true, deloadEveryWeeks: 4 });
  });

  it('brak/śmieci => null (stare plany bez pola = silnik wyłączony)', () => {
    expect(sanitizeProgressionConfig(undefined)).toBeNull();
    expect(sanitizeProgressionConfig(null)).toBeNull();
    expect(sanitizeProgressionConfig('tak')).toBeNull();
    expect(sanitizeProgressionConfig({ enabled: 'yes' })).toBeNull();
  });

  it('deloadEveryWeeks clamp 2-12, default 5', () => {
    expect(sanitizeProgressionConfig({ enabled: true })!.deloadEveryWeeks).toBe(5);
    expect(sanitizeProgressionConfig({ enabled: true, deloadEveryWeeks: 1 })!.deloadEveryWeeks).toBe(2);
    expect(sanitizeProgressionConfig({ enabled: true, deloadEveryWeeks: 99 })!.deloadEveryWeeks).toBe(12);
  });

  it('deloadDecisions przenoszone tylko z poprawnymi wartościami', () => {
    const out = sanitizeProgressionConfig({
      enabled: true,
      deloadDecisions: { '5': 'applied', '10': 'skipped', '3': 'meh' },
    })!;
    expect(out.deloadDecisions).toEqual({ '5': 'applied', '10': 'skipped' });
  });
});

describe('isDeloadWeek (Z119)', () => {
  it('co N tygodni (1-based): tydzień 5 i 10 przy default 5', () => {
    expect(isDeloadWeek(5, DEFAULT_PROGRESSION)).toBe(true);
    expect(isDeloadWeek(10, DEFAULT_PROGRESSION)).toBe(true);
    expect(isDeloadWeek(4, DEFAULT_PROGRESSION)).toBe(false);
    expect(isDeloadWeek(1, DEFAULT_PROGRESSION)).toBe(false);
  });

  it('wyłączony silnik => nigdy', () => {
    expect(isDeloadWeek(5, { ...DEFAULT_PROGRESSION, enabled: false })).toBe(false);
  });
});

// ===== Z120: silnik celów tygodniowych =====
import { computeWeeklyTargets } from '@/lib/progression-engine';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';

const planDay = (): TrainingDay => ({
  id: 'day-1', dayName: 'Poniedziałek', weekday: 'monday', focus: 'Klatka',
  exercises: [
    { id: 'ex-1', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 6-8', instructions: [] },
    { id: 'ex-2', name: 'Plank', sets: '3 x 60s', instructions: [] },
  ],
});

const historyW = (id: string, date: string, exerciseId: string, weight: number, reps: number): WorkoutSession => ({
  id, userId: 'u1', dayId: 'day-1', date, completed: true,
  exercises: [{ exerciseId, sets: [{ reps, weight, completed: true }] }],
});

describe('computeWeeklyTargets (Z120)', () => {
  const cfg = { enabled: true, deloadEveryWeeks: 5 };

  it('bez historii => cel startowy bez liczb (zachęta), kind=start', () => {
    const targets = computeWeeklyTargets([planDay()], [], 1, cfg);
    const t1 = targets['day-1']['ex-1'];
    expect(t1.kind).toBe('start');
    expect(t1.targetWeight).toBeNull();
  });

  it('double progression: dowiózł górę zakresu => ciężar +2.5 (compound), reps do dołu', () => {
    const ws = [historyW('w1', '2026-07-13', 'ex-1', 60, 8)];
    const t = computeWeeklyTargets([planDay()], ws, 2, cfg)['day-1']['ex-1'];
    expect(t.kind).toBe('progress');
    expect(t.targetWeight).toBe(62.5);
    expect(t.targetReps).toBe(6);
    expect(t.reasonKey).toBeTruthy();
  });

  it('w zakresie => hold: ten sam ciężar, +1 powtórzenie', () => {
    const ws = [historyW('w1', '2026-07-13', 'ex-1', 60, 7)];
    const t = computeWeeklyTargets([planDay()], ws, 2, cfg)['day-1']['ex-1'];
    expect(t.kind).toBe('hold');
    expect(t.targetWeight).toBe(60);
    expect(t.targetReps).toBe(8);
  });

  it('plateau (>=4 sesje bez progresu) => sygnał plateau z utrzymaniem', () => {
    const ws = [1, 2, 3, 4, 5].map((i) => historyW(`w${i}`, `2026-06-${10 + i}`, 'ex-1', 60, 7));
    const t = computeWeeklyTargets([planDay()], ws, 3, cfg)['day-1']['ex-1'];
    expect(t.kind).toBe('deload');
  });

  it('ból >=4 w ostatniej sesji => cel obniżony', () => {
    const ws = [historyW('w1', '2026-07-13', 'ex-1', 60, 7)];
    ws[0].exercises[0].pain = 5;
    const t = computeWeeklyTargets([planDay()], ws, 2, cfg)['day-1']['ex-1'];
    expect(t.kind).toBe('pain');
    expect(t.targetWeight).toBeLessThan(60);
  });

  it('tydzień deloadowy => serie -40% (min 1), ciężar -10% do 2.5', () => {
    const ws = [historyW('w1', '2026-07-13', 'ex-1', 100, 7)];
    const t = computeWeeklyTargets([planDay()], ws, 5, cfg, { deloadApplied: true })['day-1']['ex-1'];
    expect(t.kind).toBe('deload-week');
    expect(t.targetWeight).toBe(90);
    expect(t.targetSets).toBe(2); // 3 serie -40% => ceil(1.8) = 2
  });

  it('typ duration: cel czasu = best +10% zaokrąglony do 5 s', () => {
    const ws: WorkoutSession[] = [{
      id: 'w1', userId: 'u1', dayId: 'day-1', date: '2026-07-13', completed: true,
      exercises: [{ exerciseId: 'ex-2', sets: [{ reps: 0, weight: 0, completed: true, durationSec: 60 }] }],
    }];
    const t = computeWeeklyTargets([planDay()], ws, 2, cfg, {
      trackingByName: { Plank: 'duration' },
    })['day-1']['ex-2'];
    expect(t.kind).toBe('progress');
    expect(t.targetDurationSec).toBe(65);
  });
});
