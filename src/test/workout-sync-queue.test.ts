import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const baseDraft: ActiveWorkoutDraft = {
  sessionId: 'workout-user-1-day-1-2026-04-03',
  userId: 'user-1',
  dayId: 'day-1',
  date: '2026-04-03',
  cycleId: 'cycle-1',
  sessionOrigin: 'remote',
  remoteSessionId: 'workout-user-1-day-1-2026-04-03',
  exerciseSets: { 'ex-1': [{ reps: 6, weight: 40, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1,
  updatedAt: 2,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: true,
  finalSyncPending: true,
  version: 1,
};

describe('workoutSyncQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores multiple queued sessions per user', () => {
    workoutSyncQueue.upsertFromDraft(baseDraft);
    workoutSyncQueue.upsertFromDraft({
      ...baseDraft,
      sessionId: 'workout-user-1-day-2-2026-04-04',
      dayId: 'day-2',
      date: '2026-04-04',
      remoteSessionId: 'workout-user-1-day-2-2026-04-04',
    });

    expect(workoutSyncQueue.pendingCount('user-1')).toBe(2);
    expect(workoutSyncQueue.findByDayDate('user-1', 'day-2', '2026-04-04')?.sessionId).toBe('workout-user-1-day-2-2026-04-04');
  });

  it('upsert updates an existing queued session', () => {
    workoutSyncQueue.upsertFromDraft(baseDraft);
    workoutSyncQueue.upsertFromDraft({
      ...baseDraft,
      dayNotes: 'updated',
      version: 2,
    });

    const queue = workoutSyncQueue.list('user-1');
    expect(queue).toHaveLength(1);
    expect(queue[0].dayNotes).toBe('updated');
    expect(queue[0].version).toBe(2);
  });

  it('marks retry count and stores last error', () => {
    workoutSyncQueue.upsertFromDraft(baseDraft);
    const updated = workoutSyncQueue.markRetry('user-1', baseDraft.sessionId, 'SYNC_FAILED');

    expect(updated?.retryCount).toBe(1);
    expect(updated?.lastError).toBe('SYNC_FAILED');
  });

  it('removes queued session by session id', () => {
    workoutSyncQueue.upsertFromDraft(baseDraft);
    workoutSyncQueue.remove('user-1', baseDraft.sessionId);
    expect(workoutSyncQueue.pendingCount('user-1')).toBe(0);
  });

  it('does not throw when localStorage rejects queue writes', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => workoutSyncQueue.upsertFromDraft(baseDraft)).not.toThrow();
  });
});
