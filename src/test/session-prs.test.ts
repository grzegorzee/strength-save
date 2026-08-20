import { describe, expect, it } from 'vitest';
import { computeSessionPRs, type SessionPRContext } from '@/lib/session-prs';
import type { WorkoutSession } from '@/types';

// E-T1 (bug z buildu 107): PR-y liczone z danych — remount ekranu ukończonego
// treningu (albo restart appki) daje te same PR-y co moment zakończenia.

const workout = (id: string, date: string, weight: number, over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 5, weight, completed: true }] }],
  ...over,
});

const baseCtx = (over: Partial<SessionPRContext> = {}): SessionPRContext => ({
  sessionId: 'current',
  exerciseSets: { 'ex-1': [{ reps: 5, weight: 105, completed: true }] },
  workouts: [
    workout('prev', '2026-08-10', 100),
    workout('current', '2026-08-20', 105),
  ],
  dayExercises: [{ id: 'ex-1', name: 'Wyciskanie sztangi' }],
  resolveIsBodyweight: () => false,
  resolveTracking: () => 'weight_reps',
  bodyWeightKg: null,
  backfillWeightOf: () => 0,
  ...over,
});

describe('computeSessionPRs (E-T1)', () => {
  it('wykrywa PR ciężaru względem wcześniejszych treningów (dane, nie stan)', () => {
    const prs = computeSessionPRs(baseCtx());
    expect(prs.length).toBeGreaterThan(0);
    const weightPR = prs.find(pr => ['weight', 'both', '1rm'].includes(pr.type));
    expect(weightPR?.exerciseId).toBe('ex-1');
    expect(weightPR?.newValue).toBe(105);
  });

  it('wynik nie zmienia się po dopisaniu PÓŹNIEJSZYCH cięższych treningów', () => {
    const prs = computeSessionPRs(baseCtx({
      workouts: [
        workout('prev', '2026-08-10', 100),
        workout('current', '2026-08-20', 105),
        workout('later', '2026-08-25', 120),
      ],
    }));
    expect(prs.find(pr => ['weight', 'both', '1rm'].includes(pr.type))?.newValue).toBe(105);
  });

  it('brak poprawy = brak PR-ów', () => {
    const prs = computeSessionPRs(baseCtx({
      exerciseSets: { 'ex-1': [{ reps: 5, weight: 95, completed: true }] },
      workouts: [
        workout('prev', '2026-08-10', 100),
        workout('current', '2026-08-20', 95),
      ],
    }));
    expect(prs).toEqual([]);
  });

  it('backfill wyższy niż wynik odfiltrowuje PR (niezmiennik B-T5)', () => {
    const prs = computeSessionPRs(baseCtx({ backfillWeightOf: () => 110 }));
    expect(prs.find(pr => ['weight', 'both', '1rm'].includes(pr.type))).toBeUndefined();
  });

  it('ten sam dzień: wcześniejszy completedAt liczy się jako poprzedni, bez znaczników nie', () => {
    const withMarkers = computeSessionPRs(baseCtx({
      workouts: [
        workout('quick', '2026-08-20', 100, { completedAt: 1000 }),
        workout('current', '2026-08-20', 105, { completedAt: 2000 }),
      ],
    }));
    expect(withMarkers.find(pr => ['weight', 'both', '1rm'].includes(pr.type))?.newValue).toBe(105);

    // Bez znaczników czasu drugi trening dnia nie jest "wcześniejszy" —
    // sesja porównuje się tylko z poprzednimi datami (tu: brak = pierwszy zapis).
    const withoutMarkers = computeSessionPRs(baseCtx({
      workouts: [
        workout('quick', '2026-08-20', 100),
        workout('current', '2026-08-20', 105),
      ],
    }));
    expect(withoutMarkers.some(pr => ['weight', 'both', '1rm'].includes(pr.type) && pr.oldValue === 100)).toBe(false);
  });

  it('sesja nieznaleziona w danych = pusta lista (bez wybuchu)', () => {
    expect(computeSessionPRs(baseCtx({ sessionId: 'ghost' }))).toEqual([]);
  });
});
