import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkoutBackupV3,
  collectAllWorkoutBackupPages,
  planWorkoutBackupV3Restore,
} from '@/lib/workout-backup-v3';
import type { WorkoutSession } from '@/types';

const workout = (id: string, rpe?: number): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'd1',
  date: '2026-08-28',
  completed: true,
  exercises: [{
    exerciseId: 'squat',
    sets: [{ reps: 5, weight: 100, completed: true }],
    ...(rpe !== undefined && { rpe, pain: 2, quality: 4 }),
  }],
});

describe('backup JSON schema 3', () => {
  it('oddziela health od bazowego treningu i zachowuje wszystkie trzy metryki', () => {
    const backup = buildWorkoutBackupV3({
      workouts: [workout('w1', 8.5)],
      measurements: [],
      exportedAt: '2026-08-28T10:00:00.000Z',
    });
    expect(backup.schemaVersion).toBe(3);
    expect(backup.workouts[0].exercises[0]).not.toHaveProperty('rpe');
    expect(backup.workoutHealth).toEqual([{
      workoutId: 'w1',
      metrics: [{ exerciseId: 'squat', rpe: 8.5, pain: 2, quality: 4 }],
    }]);
  });

  it('pobiera wszystkie strony, nie kończy eksportu na oknie 500', async () => {
    const pages = [
      { workouts: Array.from({ length: 250 }, (_, index) => workout(`w-${index}`)), nextCursor: { date: '2026-08-01', id: 'c1' } },
      { workouts: Array.from({ length: 250 }, (_, index) => workout(`w-${250 + index}`)), nextCursor: { date: '2026-07-01', id: 'c2' } },
      { workouts: [workout('w-500')], nextCursor: null },
    ];
    const fetchPage = vi.fn(async () => pages.shift()!);

    const result = await collectAllWorkoutBackupPages(fetchPage);

    expect(result).toHaveLength(501);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('przerywa eksport, gdy marker dowodzi brakującego sidecara', async () => {
    const fetchPage = vi.fn(async () => ({
      workouts: [workout('w1')],
      nextCursor: null,
      healthDataIncomplete: true,
    }));
    await expect(collectAllWorkoutBackupPages(fetchPage)).rejects.toThrow('WORKOUT_HEALTH_BACKUP_INCOMPLETE');
  });

  it('preflight restore rozdziela bazę i health bez osadzania metryk w treningu', () => {
    const backup = buildWorkoutBackupV3({
      workouts: [workout('w1', 8.5)],
      measurements: [],
    });

    expect(planWorkoutBackupV3Restore(backup, {
      healthEpoch: 7,
      healthGrantId: 'grant-7',
    }).items).toEqual([{
      workout: backup.workouts[0],
      health: backup.workoutHealth[0],
    }]);
  });

  it('preflight odrzuca osierocony sidecar i duplikaty przed pierwszym zapisem', () => {
    const backup = buildWorkoutBackupV3({ workouts: [workout('w1')], measurements: [] });
    expect(() => planWorkoutBackupV3Restore({
      ...backup,
      workoutHealth: [{ workoutId: 'missing', metrics: [] }],
    }, { healthEpoch: 7, healthGrantId: 'grant-7' })).toThrow('WORKOUT_BACKUP_HEALTH_ORPHAN');
    expect(() => planWorkoutBackupV3Restore({
      ...backup,
      workouts: [backup.workouts[0], backup.workouts[0]],
    }, null)).toThrow('WORKOUT_BACKUP_DUPLICATE_WORKOUT');
  });

  it('preflight odrzuca restore danych zdrowotnych bez aktywnego grantu', () => {
    const backup = buildWorkoutBackupV3({ workouts: [workout('w1', 8)], measurements: [] });
    expect(() => planWorkoutBackupV3Restore(backup, null))
      .toThrow('WORKOUT_BACKUP_HEALTH_CONSENT_REQUIRED');
  });
});
