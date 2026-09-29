import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { computeWeeklyTargets, decideNextSet, DEFAULT_PROGRESSION } from '@/lib/progression-engine';
import { detectPlateau, getExerciseHistory } from '@/lib/exercise-progression';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import { detectNewPRs } from '@/lib/pr-utils';
import { buildHistoryRowMeta } from '@/lib/history-stats';
import { buildLegacyBodyweightHistory } from '@/test/canonical-states';
import { buildBodyWeightTimeline, normalizeBodyweightLoadedWorkouts } from '@/lib/bodyweight-load';
import { isBodyweightLoadedExercise } from '@/data/exerciseLibrary';

// F6: progresja i PR dla bodyweight_loaded (weight = dociążenie):
// najpierw powtórzenia do górnej granicy, potem +2,5 kg dociążenia i powrót na dół
// zakresu; deload z dociążeniem obniża kg, bez dociążenia obniża powtórzenia.

const PULL = 'Podciąganie na drążku';
const range = { min: 6, max: 8 };

const session = (date: string, sets: Array<[number, number]>, name = PULL, exerciseId = 'ex-pull'): WorkoutSession => ({
  id: `w-${date}-${exerciseId}`,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [{ exerciseId, name, sets: sets.map(([reps, weight]) => ({ reps, weight, completed: true })) }],
});

describe('getExerciseHistory — bodyweight_loaded', () => {
  it('serie bez dociążenia NIE odpadają; dzień = max dociążenie i powtórzenia przy nim', () => {
    const history = getExerciseHistory(
      [session('2026-10-01', [[8, 0], [7, 0]]), session('2026-10-08', [[6, 2.5], [8, 0]])],
      'ex-pull', false, PULL, { bodyweightLoaded: true },
    );
    expect(history.map((h) => [h.date, h.maxWeight, h.bestReps])).toEqual([
      ['2026-10-01', 0, 8],
      ['2026-10-08', 2.5, 6],
    ]);
  });

  it('plateau liczone po (dociążenie, powtórzenia): rosnące powtórzenia na MC to postęp', () => {
    const history = getExerciseHistory(
      ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22'].map((d, i) => session(d, [[5 + i, 0]])),
      'ex-pull', false, PULL, { bodyweightLoaded: true },
    );
    expect(detectPlateau(history, 4, false, true).isPlateau).toBe(false);
    const flat = getExerciseHistory(
      ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22'].map((d) => session(d, [[6, 0]])),
      'ex-pull', false, PULL, { bodyweightLoaded: true },
    );
    expect(detectPlateau(flat, 4, false, true).isPlateau).toBe(true);
  });
});

describe('decideNextSet — bodyweight_loaded', () => {
  const base = { repRange: range, isBodyweight: false, bodyweightLoaded: true, increment: 2.5, isPlateau: false };

  it('w zakresie: ta sama MC, +1 powtórzenie', () => {
    expect(decideNextSet({ ...base, lastWeight: 0, lastReps: 7 }))
      .toMatchObject({ kind: 'hold', targetWeight: 0, targetReps: 8 });
  });

  it('górna granica: +2,5 kg dociążenia i powrót na dół zakresu', () => {
    expect(decideNextSet({ ...base, lastWeight: 0, lastReps: 8 }))
      .toMatchObject({ kind: 'progress', targetWeight: 2.5, targetReps: 6, reasonKey: 'loaded.progress' });
    expect(decideNextSet({ ...base, lastWeight: 10, lastReps: 8 }))
      .toMatchObject({ kind: 'progress', targetWeight: 12.5, targetReps: 6 });
  });

  it('deload z dociążeniem obniża kg (realnie, także przy małym dociążeniu)', () => {
    expect(decideNextSet({ ...base, isPlateau: true, lastWeight: 10, lastReps: 6 }))
      .toMatchObject({ kind: 'deload', targetWeight: 9, targetReps: 8 });
    expect(decideNextSet({ ...base, isPlateau: true, lastWeight: 2.5, lastReps: 6 }).targetWeight).toBe(2);
  });

  it('deload bez dociążenia obniża powtórzenia (MC)', () => {
    const d = decideNextSet({ ...base, isPlateau: true, lastWeight: 0, lastReps: 8 });
    expect(d).toMatchObject({ kind: 'deload', targetWeight: 0, reasonKey: 'loaded.deload.reps' });
    expect(d.targetReps).toBeLessThan(8);
    expect(d.targetReps).toBeGreaterThan(0);
  });

  it('powrót po przerwie na samej MC nie proponuje „0 kg”: zwykła progresja powtórzeń', () => {
    expect(decideNextSet({ ...base, longBreak: true, lastWeight: 0, lastReps: 7 }))
      .toMatchObject({ kind: 'hold', targetWeight: 0, targetReps: 8 });
  });
});

describe('getNextSetAdvice — bodyweight_loaded', () => {
  it('po 8 powt. na MC: cel MC +2,5 kg × 6 (nie +2,5 kg do masy ciała)', () => {
    const advice = getNextSetAdvice(
      [session('2026-09-20', [[8, 0], [8, 0]])], 'ex-pull', '3 x 6-8', 0,
      { isBodyweight: false, bodyweightLoaded: true, exerciseName: PULL, todayISO: '2026-09-25' }, 'pl', 'kg',
    )!;
    expect(advice).toMatchObject({ kind: 'progress', targetWeight: 2.5, targetReps: 6, isBodyweight: false, isBodyweightLoaded: true });
    expect(advice.reason).toContain('dociążenia');
  });
});

const pullDay = (sets = '3 x 6-8'): TrainingDay => ({
  id: 'day-1', dayName: 'Pon', weekday: 'monday', focus: 'Plecy',
  exercises: [{ id: 'ex-pull', name: PULL, sets, instructions: [] }],
});

describe('computeWeeklyTargets — bodyweight_loaded i asysta', () => {
  const cfg = { ...DEFAULT_PROGRESSION, enabled: true };

  it('typ z biblioteki bez trackingByName: MC 8 powt. → +2,5 kg × 6', () => {
    const t = computeWeeklyTargets([pullDay()], [session('2026-09-20', [[8, 0], [8, 0]])], 2, cfg)['day-1']['ex-pull'];
    expect(t).toMatchObject({ kind: 'progress', targetWeight: 2.5, targetReps: 6 });
  });

  it('w zakresie na MC: cel bez kg (null = sama masa ciała), +1 powtórzenie', () => {
    const t = computeWeeklyTargets([pullDay()], [session('2026-09-20', [[7, 0]])], 2, cfg)['day-1']['ex-pull'];
    expect(t).toMatchObject({ kind: 'hold', targetWeight: null, targetReps: 8 });
  });

  it('regresja :402 — asysta bez trackingByName nie gubi historii (weight 0)', () => {
    const day: TrainingDay = {
      id: 'day-1', dayName: 'Pon', weekday: 'monday', focus: 'Plecy',
      exercises: [{ id: 'ex-ass', name: 'Podciąganie wspomagane na maszynie', sets: '3 x 6-8', instructions: [] }],
    };
    const assisted: WorkoutSession = {
      id: 'w-a', userId: 'u1', dayId: 'day-1', date: '2026-09-20', completed: true,
      exercises: [{ exerciseId: 'ex-ass', name: 'Podciąganie wspomagane na maszynie', sets: [{ reps: 7, weight: 0, assistWeight: 30, completed: true }] }],
    };
    const t = computeWeeklyTargets([day], [assisted], 2, cfg)['day-1']['ex-ass'];
    expect(t.kind).not.toBe('start');
    expect(t.targetReps).toBe(8);
    expect(t.targetWeight).toBeNull();
  });
});

describe('PR — bodyweight_loaded', () => {
  const names = new Map([['ex-pull', PULL]]);
  const tracking = { trackingByExerciseId: new Map([['ex-pull', 'bodyweight_loaded' as const]]) };
  const prev = [session('2026-10-01', [[8, 0], [6, 0]])];

  it('więcej dociążenia przy powtórzeniach >= rekordowych = PR', () => {
    const prs = detectNewPRs(session('2026-10-08', [[8, 2.5]]), prev, names, new Set(['ex-pull']), tracking);
    expect(prs).toEqual([expect.objectContaining({ type: 'weight', newValue: 2.5, oldValue: 0 })]);
  });

  it('równe dociążenie, więcej powtórzeń = PR powtórzeń', () => {
    const prs = detectNewPRs(session('2026-10-08', [[9, 0]]), prev, names, new Set(['ex-pull']), tracking);
    expect(prs).toEqual([expect.objectContaining({ type: 'reps', newValue: 9, oldValue: 8 })]);
  });

  it('więcej dociążenia, ale mniej powtórzeń niż rekord = brak PR', () => {
    expect(detectNewPRs(session('2026-10-08', [[5, 2.5]]), prev, names, new Set(['ex-pull']), tracking)).toEqual([]);
  });

  it('historia legacy właściciela: zero fałszywych PR ciężaru, PR tylko za realne powtórzenia', () => {
    const legacy = buildLegacyBodyweightHistory();
    const normalized = normalizeBodyweightLoadedWorkouts(
      legacy.workouts, buildBodyWeightTimeline(legacy.measurements), isBodyweightLoadedExercise,
    );
    const meta = buildHistoryRowMeta(normalized);
    // Podciąganie: 6 → 7 → 8 → 8 powt. na MC (06-25 i 08-13 to realne rekordy powtórzeń),
    // wiosłowanie: 60 → 62,5 → 65 → 65 kg. Sesja 09-28 (MC 72 kg zapisane jako ciężar) bez PR.
    expect(normalized.map((w) => meta.get(w.id)?.prCount)).toEqual([0, 0, 2, 2, 0]);
    // Ta sama liczba sesji w Historii co w surowych danych.
    expect(meta.size).toBe(legacy.workouts.length);
  });
});
