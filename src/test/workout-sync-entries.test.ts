import { describe, expect, it } from 'vitest';
import { collectRetryableSyncEntries } from '@/lib/workout-sync-entries';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSyncQueueEntry } from '@/lib/workout-sync-queue';

const draft = (overrides: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 'workout-1',
  userId: 'user-1',
  dayId: 'day-1',
  date: '2026-06-19',
  cycleId: 'cycle-1',
  sessionOrigin: 'remote',
  remoteSessionId: 'workout-1',
  exerciseSets: { 'ex-1': [{ reps: 8, weight: 60, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1,
  updatedAt: 2,
  lastFirebaseSyncAt: null,
  dirty: false,
  completedLocally: true,
  finalSyncPending: true,
  version: 1,
  ...overrides,
});

const queueEntry = (overrides: Partial<WorkoutSyncQueueEntry> = {}): WorkoutSyncQueueEntry => ({
  ...draft(),
  queueId: 'workout-1',
  enqueuedAt: 3,
  retryCount: 0,
  lastError: null,
  ...overrides,
});

describe('collectRetryableSyncEntries', () => {
  it('includes active final-sync drafts so autosync can clear stale dashboard banners', () => {
    expect(collectRetryableSyncEntries([draft()], [])).toEqual([
      { entry: draft(), source: 'active' },
    ]);
  });

  it('dedupes queue entries when an active draft has the same session id', () => {
    const targets = collectRetryableSyncEntries([draft()], [queueEntry()]);
    expect(targets).toHaveLength(1);
    expect(targets[0].source).toBe('active');
  });

  it('skips already clean synced drafts', () => {
    expect(collectRetryableSyncEntries([
      draft({ dirty: false, finalSyncPending: false, completedLocally: false }),
    ], [])).toEqual([]);
  });
});
