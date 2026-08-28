import { describe, expect, it } from 'vitest';
import {
  joinWorkoutHealth,
  sanitizeWorkoutHealthDoc,
} from '@/lib/workout-health-read';
import type { WorkoutSession } from '@/types';

const baseWorkout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'w1',
  userId: 'u1',
  dayId: 'd1',
  date: '2026-08-28',
  completed: true,
  revision: 3,
  exercises: [{
    exerciseId: 'squat',
    sets: [{ reps: 5, weight: 100, completed: true }],
    rpe: 6,
    pain: 1,
  }],
  ...over,
});

const sidecar = {
  userId: 'u1',
  workoutId: 'w1',
  healthEpoch: 7,
  healthGrantId: 'grant-7',
  sourceWriteId: 'write-7',
  baseRevision: 3,
  metrics: [{ exerciseId: 'squat', rpe: 8.5, quality: 4 }],
  updatedAt: 100,
};

describe('workout health read boundary', () => {
  it('base mode zawsze usuwa legacy i nie przetwarza sidecara', () => {
    const result = joinWorkoutHealth(baseWorkout(), sidecar, { mode: 'base' });
    expect(result.workout.exercises[0]).not.toHaveProperty('rpe');
    expect(result.workout.exercises[0]).not.toHaveProperty('pain');
    expect(result.state).toBe('base');
  });

  it('active mode łączy wyłącznie sidecar z dokładnym bieżącym grantem', () => {
    const result = joinWorkoutHealth(baseWorkout({
      healthSidecarPresent: true,
      healthSidecarRevision: 3,
    }), sidecar, {
      mode: 'active',
      activeGrant: { healthEpoch: 7, healthGrantId: 'grant-7' },
    });
    expect(result.workout.exercises[0]).toMatchObject({ rpe: 8.5, quality: 4 });
    expect(result.workout.exercises[0]).not.toHaveProperty('pain');
    expect(result.state).toBe('joined');
  });

  it('withdraw/regrant nie odsłania starego sidecara ani legacy', () => {
    const result = joinWorkoutHealth(baseWorkout({
      healthSidecarPresent: true,
      healthSidecarRevision: 3,
    }), sidecar, {
      mode: 'active',
      activeGrant: { healthEpoch: 8, healthGrantId: 'grant-8' },
    });
    expect(result.workout.exercises[0]).not.toHaveProperty('rpe');
    expect(result.state).toBe('hidden');
  });

  it('marker obecności bez sidecara raportuje partial zamiast udawać brak danych', () => {
    const result = joinWorkoutHealth(baseWorkout({
      healthSidecarPresent: true,
      healthSidecarRevision: 3,
    }), null, {
      mode: 'owner',
    });
    expect(result.state).toBe('partial');
    expect(result.workout.exercises[0]).not.toHaveProperty('rpe');
  });

  it('jawny clear marker usuwa również zachowane legacy metryki', () => {
    const result = joinWorkoutHealth(baseWorkout({
      healthSidecarPresent: false,
      healthSidecarRevision: 3,
    }), null, { mode: 'owner' });
    expect(result.state).toBe('cleared');
    expect(result.workout.exercises[0]).not.toHaveProperty('rpe');
  });

  it('owner widzi legacy tylko przed migracją, gdy brak markera v2', () => {
    const result = joinWorkoutHealth(baseWorkout(), null, { mode: 'owner' });
    expect(result.workout.exercises[0]).toMatchObject({ rpe: 6, pain: 1 });
    expect(result.state).toBe('legacy');
  });

  it('sanitizer odrzuca obcy, niespójny i niepoprawny sidecar', () => {
    expect(sanitizeWorkoutHealthDoc('w1', sidecar, 'u1')).toMatchObject({ workoutId: 'w1' });
    expect(sanitizeWorkoutHealthDoc('w1', { ...sidecar, userId: 'other' }, 'u1')).toBeNull();
    expect(sanitizeWorkoutHealthDoc('w2', sidecar, 'u1')).toBeNull();
    expect(sanitizeWorkoutHealthDoc('w1', { ...sidecar, metrics: [{ exerciseId: 'squat', rpe: 8.3 }] }, 'u1')).toBeNull();
  });
});
