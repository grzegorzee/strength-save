import { describe, expect, it } from 'vitest';
import {
  STRENGTH_TO_TRIMP_CALIBRATION,
  computeDailyLoads,
  computeStrengthLoad,
  computeWeeklyBalance,
  detectInterference,
} from '@/lib/hybrid-load';
import type { WorkoutSession } from '@/types';
import type { UnifiedActivity } from '@/types/strava';

const strengthWorkout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'w1', userId: 'u1', dayId: 'd1', date: '2026-07-13', completed: true,
  durationSec: 3600,
  exercises: [
    {
      exerciseId: 'ex-1', name: 'Przysiad ze sztangą (High Bar)', rpe: 8,
      sets: [
        { reps: 5, weight: 100, completed: true },
        { reps: 5, weight: 100, completed: true },
        { reps: 5, weight: 100, completed: true },
        { reps: 5, weight: 100, completed: true },
      ],
    },
    {
      exerciseId: 'ex-2', name: 'Wyciskanie sztangi na ławce płaskiej', rpe: 6,
      sets: [
        { reps: 8, weight: 80, completed: true },
        { reps: 8, weight: 80, completed: true },
      ],
    },
  ],
  ...over,
});

const cardio = (over: Partial<UnifiedActivity> = {}): UnifiedActivity => ({
  id: 'a1', userId: 'u1', stravaId: 0, name: '', type: 'Run', date: '2026-07-14',
  movingTime: 3600, stravaUrl: '', syncedAt: '', source: 'manual',
  perceivedIntensity: 'moderate',
  ...over,
});

describe('computeStrengthLoad (Z114) — sTRIMP Foster session-RPE', () => {
  it('load = minuty x RPE sesji (średnia ważona liczbą serii)', () => {
    // RPE sesji: (8*4 + 6*2) / 6 = 44/6 ≈ 7.333; 60 min * 7.333 ≈ 440
    expect(computeStrengthLoad(strengthWorkout())).toBeCloseTo(60 * (44 / 6), 0);
  });

  it('brak RPE => fallback 6.0', () => {
    const w = strengthWorkout();
    w.exercises = w.exercises.map((e) => ({ ...e, rpe: undefined }));
    expect(computeStrengthLoad(w)).toBeCloseTo(60 * 6, 0);
  });

  it('brak durationSec => szacunek liczba ukończonych serii x 3 min', () => {
    const w = strengthWorkout({ durationSec: undefined });
    // 6 serii * 3 min = 18 min; RPE 7.333 => ~132
    expect(computeStrengthLoad(w)).toBeCloseTo(18 * (44 / 6), 0);
  });

  it('nieukończony trening => 0', () => {
    expect(computeStrengthLoad(strengthWorkout({ completed: false }))).toBe(0);
  });
});

describe('computeDailyLoads (Z114) — kalibracja siła vs cardio', () => {
  it('godzinna sesja siłowa RPE 6 ~ godzinny bieg moderate (ratio 0.8-1.2)', () => {
    const w = strengthWorkout({ date: '2026-07-13' });
    w.exercises = w.exercises.map((e) => ({ ...e, rpe: 6 }));
    const run = cardio({ date: '2026-07-14' });
    const loads = computeDailyLoads([w], [run]);
    const strengthDay = loads.find((d) => d.date === '2026-07-13')!;
    const cardioDay = loads.find((d) => d.date === '2026-07-14')!;
    expect(strengthDay.strengthLoad).toBeGreaterThan(0);
    expect(cardioDay.cardioLoad).toBeGreaterThan(0);
    const ratio = strengthDay.strengthLoad / cardioDay.cardioLoad;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.2);
  });

  it('stała kalibracji przybita testem (zmiana = świadoma decyzja)', () => {
    expect(STRENGTH_TO_TRIMP_CALIBRATION).toBeCloseTo(0.23, 2);
  });

  it('totalLoad = strength + cardio tego samego dnia', () => {
    const w = strengthWorkout({ date: '2026-07-14' });
    const run = cardio({ date: '2026-07-14' });
    const loads = computeDailyLoads([w], [run]);
    const day = loads.find((d) => d.date === '2026-07-14')!;
    expect(day.totalLoad).toBeCloseTo(day.strengthLoad + day.cardioLoad, 6);
  });
});

describe('computeWeeklyBalance (Z114)', () => {
  it('udział % siła/cardio per tydzień (poniedziałek start)', () => {
    const loads = [
      { date: '2026-07-13', strengthLoad: 300, cardioLoad: 100, totalLoad: 400 },
      { date: '2026-07-15', strengthLoad: 100, cardioLoad: 100, totalLoad: 200 },
      { date: '2026-07-20', strengthLoad: 0, cardioLoad: 100, totalLoad: 100 },
    ];
    const weeks = computeWeeklyBalance(loads);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].weekStart).toBe('2026-07-13');
    expect(weeks[0].strengthLoad).toBe(400);
    expect(weeks[0].cardioLoad).toBe(200);
    expect(weeks[0].strengthPct).toBe(67);
    expect(weeks[1].weekStart).toBe('2026-07-20');
    expect(weeks[1].cardioPct).toBe(100);
  });
});

describe('detectInterference (Z114) — nogi + intensywne cardio <24h', () => {
  const legsDay = strengthWorkout({ id: 'legs', date: '2026-07-13' });

  it('ciężkie nogi + bieg moderate następnego dnia => wskazówka', () => {
    const hits = detectInterference([legsDay], [cardio({ date: '2026-07-14' })]);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ strengthDate: '2026-07-13', cardioDate: '2026-07-14', cardioType: 'Run' });
  });

  it('bieg tego samego dnia => wskazówka; dwa dni później => brak', () => {
    expect(detectInterference([legsDay], [cardio({ date: '2026-07-13' })])).toHaveLength(1);
    expect(detectInterference([legsDay], [cardio({ date: '2026-07-15' })])).toHaveLength(0);
  });

  it('cardio easy nie fałszuje', () => {
    expect(detectInterference([legsDay], [cardio({ date: '2026-07-14', perceivedIntensity: 'easy' })])).toHaveLength(0);
  });

  it('trening górnych partii nie fałszuje', () => {
    const upper = strengthWorkout({ id: 'upper', date: '2026-07-13' });
    upper.exercises = [upper.exercises[1]]; // tylko wyciskanie
    expect(detectInterference([upper], [cardio({ date: '2026-07-14' })])).toHaveLength(0);
  });

  it('rower easy/Walk nie fałszuje; HIIT tak', () => {
    expect(detectInterference([legsDay], [cardio({ date: '2026-07-14', type: 'Walk' })])).toHaveLength(0);
    expect(detectInterference([legsDay], [cardio({ date: '2026-07-14', type: 'HIIT', perceivedIntensity: 'hard' })])).toHaveLength(1);
  });
});
