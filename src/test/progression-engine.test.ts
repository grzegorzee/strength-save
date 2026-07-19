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
import { computeWeeklyTargets, suggestEarlyDeload, computeWeekReport } from '@/lib/progression-engine';
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

  it('Z121: suggestEarlyDeload — 2 ćwiczenia w plateau => propozycja wcześniejszego deloadu', () => {
    const twoExDay: TrainingDay = {
      ...planDay(),
      exercises: [
        { id: 'ex-1', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 6-8', instructions: [] },
        { id: 'ex-3', name: 'Martwy ciąg', sets: '3 x 5-6', instructions: [] },
      ],
    };
    const ws = [1, 2, 3, 4, 5].flatMap((i) => [
      historyW(`a${i}`, `2026-06-${10 + i}`, 'ex-1', 60, 7),
      historyW(`b${i}`, `2026-06-${10 + i}`, 'ex-3', 120, 5),
    ]);
    const s = suggestEarlyDeload([twoExDay], ws, 3, cfg);
    expect(s.suggest).toBe(true);
    expect(s.reason).toBe('plateau');
    expect(s.exercises).toHaveLength(2);
  });

  it('Z121: suggestEarlyDeload — 1 plateau to za mało', () => {
    const ws = [1, 2, 3, 4, 5].map((i) => historyW(`w${i}`, `2026-06-${10 + i}`, 'ex-1', 60, 7));
    expect(suggestEarlyDeload([planDay()], ws, 3, cfg).suggest).toBe(false);
  });

  it('Z121: suggestEarlyDeload — powtarzalny ból (>=4 w 2 ostatnich sesjach) => propozycja', () => {
    const ws = [historyW('w1', '2026-07-06', 'ex-1', 60, 7), historyW('w2', '2026-07-13', 'ex-1', 60, 7)];
    ws[0].exercises[0].pain = 4;
    ws[1].exercises[0].pain = 5;
    const s = suggestEarlyDeload([planDay()], ws, 3, cfg);
    expect(s.suggest).toBe(true);
    expect(s.reason).toBe('pain');
  });

  it('Z121: suggestEarlyDeload — cooldown 3 tygodnie od zastosowanego deloadu', () => {
    const ws = [1, 2, 3, 4, 5].flatMap((i) => [
      historyW(`a${i}`, `2026-06-${10 + i}`, 'ex-1', 60, 7),
      historyW(`b${i}`, `2026-06-${10 + i}`, 'ex-2', 40, 7),
    ]);
    const twoExDay: TrainingDay = {
      ...planDay(),
      exercises: [
        { id: 'ex-1', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 6-8', instructions: [] },
        { id: 'ex-2', name: 'Wiosłowanie sztangą', sets: '3 x 6-8', instructions: [] },
      ],
    };
    const withDecision = { ...cfg, deloadDecisions: { '4': 'applied' as const } };
    expect(suggestEarlyDeload([twoExDay], ws, 6, withDecision).suggest).toBe(false);
    expect(suggestEarlyDeload([twoExDay], ws, 7, withDecision).suggest).toBe(true);
  });

  it('Z121: suggestEarlyDeload — nie sugeruje w tygodniu programowego deloadu', () => {
    const ws = [1, 2, 3, 4, 5].flatMap((i) => [
      historyW(`a${i}`, `2026-06-${10 + i}`, 'ex-1', 60, 7),
      historyW(`b${i}`, `2026-06-${10 + i}`, 'ex-2', 40, 7),
    ]);
    const twoExDay: TrainingDay = {
      ...planDay(),
      exercises: [
        { id: 'ex-1', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 6-8', instructions: [] },
        { id: 'ex-2', name: 'Wiosłowanie sztangą', sets: '3 x 6-8', instructions: [] },
      ],
    };
    expect(suggestEarlyDeload([twoExDay], ws, 5, cfg).suggest).toBe(false);
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

// ===== Z121: raport target vs actual =====
describe('computeWeekReport (Z121)', () => {
  const targets = {
    'day-1': {
      'ex-1': {
        exerciseId: 'ex-1', exerciseName: 'Wyciskanie', kind: 'progress' as const,
        targetWeight: 62.5, targetReps: 6, targetSets: null, targetDurationSec: null,
        reasonKey: 'progression.reason.progress',
      },
      'ex-2': {
        exerciseId: 'ex-2', exerciseName: 'Plank', kind: 'progress' as const,
        targetWeight: null, targetReps: null, targetSets: null, targetDurationSec: 65,
        reasonKey: 'progression.reason.duration',
      },
      'ex-9': {
        exerciseId: 'ex-9', exerciseName: 'Nowe', kind: 'start' as const,
        targetWeight: null, targetReps: null, targetSets: null, targetDurationSec: null,
        reasonKey: 'progression.reason.start',
      },
    },
  };

  const doneW = (id: string, date: string, exerciseId: string, set: Record<string, unknown>): WorkoutSession => ({
    id, userId: 'u1', dayId: 'day-1', date, completed: true,
    exercises: [{ exerciseId, sets: [{ reps: 0, weight: 0, completed: true, ...set }] }],
  });

  it('cel osiągnięty (waga i powtórzenia >= celu) => 100% dla tego celu', () => {
    const ws = [
      doneW('w1', '2026-07-14', 'ex-1', { weight: 62.5, reps: 6 }),
      doneW('w2', '2026-07-15', 'ex-2', { durationSec: 70 }),
    ];
    const r = computeWeekReport(targets, ws, '2026-07-13', '2026-07-19');
    expect(r.total).toBe(2); // 'start' nie liczy się do celów
    expect(r.achieved).toBe(2);
    expect(r.percent).toBe(100);
    expect(r.misses).toHaveLength(0);
  });

  it('rozjazd: wykonane mniej niż cel => miss z faktycznym wynikiem', () => {
    const ws = [doneW('w1', '2026-07-14', 'ex-1', { weight: 60, reps: 8 })];
    const r = computeWeekReport(targets, ws, '2026-07-13', '2026-07-19');
    expect(r.achieved).toBe(0);
    const miss = r.misses.find((m) => m.exerciseId === 'ex-1');
    expect(miss?.actualWeight).toBe(60);
    expect(miss?.actualReps).toBe(8);
  });

  it('trening spoza zakresu tygodnia nie liczy się', () => {
    const ws = [doneW('w1', '2026-07-06', 'ex-1', { weight: 65, reps: 8 })];
    const r = computeWeekReport(targets, ws, '2026-07-13', '2026-07-19');
    expect(r.achieved).toBe(0);
    // Rozjazd bez wykonania: actual = null (ćwiczenie pominięte w tym tygodniu).
    expect(r.misses.find((m) => m.exerciseId === 'ex-1')?.actualWeight).toBeNull();
  });
});
