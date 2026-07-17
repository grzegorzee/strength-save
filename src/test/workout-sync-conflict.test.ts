import { describe, expect, it } from 'vitest';
import {
  MAX_CONFLICT_AUTO_RESOLVES,
  classifyWorkoutSyncError,
  shouldAutoResolveConflict,
  summarizeCloudWorkout,
  summarizeLocalDraft,
  workoutSyncErrorMessageKey,
} from '@/lib/workout-sync-conflict';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSession } from '@/types';

const draft = {
  exerciseSets: {
    first: [{ reps: 5, weight: 100, completed: true }],
    second: [
      { reps: 8, weight: 50, completed: true },
      { reps: 8, weight: 50, completed: false },
    ],
  },
} as unknown as ActiveWorkoutDraft;

describe('workout sync conflicts', () => {
  it.each([
    ['WORKOUT_CONFLICT', 'revision-conflict'],
    ['WORKOUT_REVISION_UNKNOWN', 'revision-conflict'],
    ['WORKOUT_NOT_FOUND', 'not-found'],
    ['cloud validation mismatch', 'validation'],
    ['permission-denied', 'permission'],
    ['network timeout', 'offline'],
    ['unexpected', 'unknown'],
  ] as const)('classifies %s', (message, expected) => {
    expect(classifyWorkoutSyncError(message)).toBe(expected);
  });

  it('maps raw sync errors to i18n keys', () => {
    expect(workoutSyncErrorMessageKey('WORKOUT_CONFLICT')).toBe('workout.err.conflict');
    expect(workoutSyncErrorMessageKey(new Error('permission-denied: Missing or insufficient permissions'))).toBe('workout.err.permission');
    expect(workoutSyncErrorMessageKey('WORKOUT_NOT_FOUND')).toBe('workout.err.notFound');
    expect(workoutSyncErrorMessageKey(new Error('Failed to get document because the client is offline.'))).toBe('workout.err.offline');
    expect(workoutSyncErrorMessageKey('CLOUD_NOT_CONFIRMED: sets mismatch')).toBe('workout.err.validation');
    expect(workoutSyncErrorMessageKey('cokolwiek innego')).toBe('workout.err.unknown');
  });

  it('compares exercise and completed-set counts without changing either version', () => {
    const cloud = {
      exercises: [{
        exerciseId: 'first',
        sets: [
          { reps: 5, weight: 100, completed: true },
          { reps: 4, weight: 100, completed: true },
        ],
      }],
    } as WorkoutSession;

    expect(summarizeLocalDraft(draft)).toEqual({ exercises: 2, completedSets: 2 });
    expect(summarizeCloudWorkout(cloud)).toEqual({ exercises: 1, completedSets: 2 });
    expect(summarizeCloudWorkout(null)).toBeNull();
  });
});

describe('Z87: local-wins auto-resolve', () => {
  it('pozwala na auto-resolve poniżej limitu', () => {
    expect(shouldAutoResolveConflict(0)).toBe(true);
    expect(shouldAutoResolveConflict(MAX_CONFLICT_AUTO_RESOLVES - 1)).toBe(true);
  });
  it('blokuje po wyczerpaniu limitu', () => {
    expect(shouldAutoResolveConflict(MAX_CONFLICT_AUTO_RESOLVES)).toBe(false);
    expect(shouldAutoResolveConflict(MAX_CONFLICT_AUTO_RESOLVES + 5)).toBe(false);
  });
});
