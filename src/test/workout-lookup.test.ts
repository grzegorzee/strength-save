import { describe, expect, it } from 'vitest';
import { buildWorkoutRoute, findWorkoutForRoute } from '@/lib/workout-lookup';
import type { WorkoutSession } from '@/types';

const workout = (overrides: Partial<WorkoutSession>): WorkoutSession => ({
  id: 'w',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-05-29',
  completed: true,
  exercises: [],
  ...overrides,
});

describe('workout-lookup', () => {
  it('finds a completed historical workout by date when route dayId belongs to a newer plan', () => {
    const saved = workout({
      id: 'workout-u1-day-3-2026-05-29',
      dayId: 'day-3',
      exercises: [
        { exerciseId: 'ex-3-1', sets: [{ reps: 8, weight: 80, completed: true }] },
      ],
    });

    const result = findWorkoutForRoute([saved], {
      dayId: 'upper-lower-friday',
      date: '2026-05-29',
      allowDateFallback: true,
    });

    expect(result?.id).toBe(saved.id);
  });

  it('prefers the explicit session query param over dayId/date guesses', () => {
    const emptyExact = workout({ id: 'empty-current', dayId: 'current-day', completed: false });
    const completedSaved = workout({ id: 'saved-history', dayId: 'day-3' });

    const result = findWorkoutForRoute([emptyExact, completedSaved], {
      dayId: 'current-day',
      date: '2026-05-29',
      sessionId: 'saved-history',
      allowDateFallback: true,
    });

    expect(result?.id).toBe('saved-history');
  });

  it('builds a route to the persisted workout id and dayId', () => {
    expect(buildWorkoutRoute(workout({ id: 'saved', dayId: 'day-3' })))
      .toBe('/workout/day-3?date=2026-05-29&session=saved');
  });
});
