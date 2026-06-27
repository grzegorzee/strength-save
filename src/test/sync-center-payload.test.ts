import { describe, expect, it } from 'vitest';
import { buildSyncCenterExercisesPayload, buildSyncCenterSaveOptions } from '@/lib/sync-center-payload';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const draft: ActiveWorkoutDraft = {
  sessionId: 'workout-1',
  userId: 'user-1',
  dayId: 'day-1',
  date: '2026-04-03',
  cycleId: 'cycle-1',
  sessionOrigin: 'remote',
  remoteSessionId: 'workout-1',
  exerciseSets: { 'ex-1': [{ reps: 8, weight: 60, completed: true }] },
  exerciseNotes: { 'ex-1': 'stable' },
  exerciseNames: { 'ex-1': 'Bench press' },
  exerciseMetrics: { 'ex-1': { rpe: 8, pain: 1, quality: 5 } },
  dayNotes: 'good session',
  dayName: 'Push',
  dayFocus: 'Chest',
  skippedExercises: ['ex-2'],
  startedAt: 1000,
  finalizedAt: 61_000,
  updatedAt: 2000,
  cloudUpdatedAt: 1500,
  cloudRevision: 2,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: true,
  finalSyncPending: true,
  version: 1,
};

describe('Sync Center retry payload', () => {
  it('preserves metrics and workout snapshots', () => {
    expect(buildSyncCenterExercisesPayload(draft)).toEqual([
      {
        exerciseId: 'ex-1',
        sets: [{ reps: 8, weight: 60, completed: true }],
        notes: 'stable',
        name: 'Bench press',
        rpe: 8,
        pain: 1,
        quality: 5,
      },
    ]);

    expect(buildSyncCenterSaveOptions(draft, 61_000)).toEqual({
      cycleId: 'cycle-1',
      notes: 'good session',
      skippedExercises: ['ex-2'],
      dayName: 'Push',
      dayFocus: 'Chest',
      durationSec: 60,
      startedAt: 1000,
      completedAt: 61_000,
      completed: true,
      expectedRevision: 2,
    });
  });
});
