import { describe, expect, it } from 'vitest';
import { computeCompletionSummary } from '@/lib/workout-completion-summary';
import type { SetData, WorkoutSession } from '@/types';

// Runna pakiet 1, krok 2 (spec A1): podsumowanie completion liczone
// DETERMINISTYCZNIE z danych sesji i historii (bez AI, zero kosztów per trening).

const set = (reps: number, weight: number, completed = true, isWarmup = false): SetData => ({
  reps,
  weight,
  completed,
  ...(isWarmup && { isWarmup: true }),
});

const workout = (overrides: Partial<WorkoutSession>): WorkoutSession => ({
  id: 'w-prev',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-05',
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [set(5, 100), set(5, 100)] }],
  ...overrides,
});

describe('computeCompletionSummary', () => {
  it('liczy tonaż i serie tylko z odhaczonych serii roboczych', () => {
    const summary = computeCompletionSummary({
      exerciseSets: {
        'ex-1': [set(8, 100), set(10, 20, true, true), set(8, 100, false)],
      },
      dayExercises: null,
      workouts: [],
      sessionId: 's1',
      dayId: 'day-1',
    });
    expect(summary.volumeKg).toBe(800);
    expect(summary.completedSets).toBe(1);
  });

  it('planowane serie z dnia planu, z pominięciem skipniętych ćwiczeń', () => {
    const summary = computeCompletionSummary({
      exerciseSets: { 'ex-1': [set(8, 100), set(8, 100), set(8, 100)] },
      dayExercises: [
        { id: 'ex-1', sets: '4 x 8' },
        { id: 'ex-2', sets: '3 x 10' },
      ],
      skippedExercises: ['ex-2'],
      workouts: [],
      sessionId: 's1',
      dayId: 'day-1',
    });
    expect(summary.plannedSets).toBe(4);
    expect(summary.planPct).toBe(75);
  });

  it('bez dnia planu plan i procent są null', () => {
    const summary = computeCompletionSummary({
      exerciseSets: { 'ex-1': [set(8, 100)] },
      dayExercises: null,
      workouts: [],
      sessionId: 's1',
      dayId: 'day-1',
    });
    expect(summary.plannedSets).toBeNull();
    expect(summary.planPct).toBeNull();
  });

  it('delta wolumenu vs OSTATNIA ukończona sesja tego samego dnia planu', () => {
    const summary = computeCompletionSummary({
      exerciseSets: { 'ex-1': [set(8, 100)] },
      dayExercises: null,
      workouts: [
        workout({ id: 'w-old', date: '2026-07-29', exercises: [{ exerciseId: 'ex-1', sets: [set(5, 40)] }] }),
        workout({ id: 'w-prev', date: '2026-08-05' }),
        workout({ id: 'w-other-day', dayId: 'day-2', date: '2026-08-10' }),
      ],
      sessionId: 's1',
      dayId: 'day-1',
    });
    expect(summary.prevVolumeKg).toBe(1000);
    expect(summary.volumeDeltaPct).toBe(-20);
  });

  it('bieżąca sesja nie porównuje się sama ze sobą, brak historii = null', () => {
    const summary = computeCompletionSummary({
      exerciseSets: { 'ex-1': [set(8, 100)] },
      dayExercises: null,
      workouts: [workout({ id: 's1' })],
      sessionId: 's1',
      dayId: 'day-1',
    });
    expect(summary.prevVolumeKg).toBeNull();
    expect(summary.volumeDeltaPct).toBeNull();
  });
});
