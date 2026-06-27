import { describe, expect, it } from 'vitest';
import {
  classifyWorkoutSyncError,
  summarizeCloudWorkout,
  summarizeLocalDraft,
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
