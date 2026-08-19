import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { preserveFirestoreCrashDraft } from '@/lib/firestore-crash-guard';
import { useFirestoreCrashDraftBackup } from '@/hooks/useFirestoreCrashDraftBackup';
import { workoutDraft } from '@/lib/workout-draft';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const draft: ActiveWorkoutDraft = {
  sessionId: 'workout-crash',
  userId: 'user-crash',
  dayId: 'day-1',
  date: '2026-08-19',
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: 'workout-crash',
  exerciseSets: { bench: [{ reps: 5, weight: 80, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 100,
  updatedAt: 200,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 4,
};

describe('useFirestoreCrashDraftBackup', () => {
  beforeEach(() => localStorage.clear());

  it('zapisuje aktywny snapshot do fallbacku i wyrejestrowuje się po unmount', () => {
    const { unmount } = renderHook(() => useFirestoreCrashDraftBackup(() => draft));

    preserveFirestoreCrashDraft();
    expect(workoutDraft.load('user-crash')?.exerciseSets.bench[0]).toMatchObject({
      reps: 5,
      weight: 80,
      completed: true,
    });

    unmount();
    workoutDraft.clear('user-crash');
    preserveFirestoreCrashDraft();
    expect(workoutDraft.load('user-crash')).toBeNull();
  });
});
