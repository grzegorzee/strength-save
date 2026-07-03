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
      updatedAt: 500,
    });

    const queue = workoutSyncQueue.list('user-1');
    expect(queue).toHaveLength(1);
    expect(queue[0].updatedAt).toBe(500);
  });

  it('kolejka jest referencyjna: nie przechowuje treści draftu', () => {
    workoutSyncQueue.upsertFromDraft(baseDraft);

    const raw = JSON.parse(localStorage.getItem('fittracker_workout_sync_queue_v1_user-1') ?? '[]');
    expect(raw).toHaveLength(1);
    expect(raw[0].exerciseSets).toBeUndefined();
    expect(raw[0].dayNotes).toBeUndefined();
    expect(raw[0].sessionId).toBe(baseDraft.sessionId);
    expect(raw[0].finalSyncPending).toBe(true);
  });

  it('migruje stare wpisy z treścią do referencji przy odczycie', () => {
    localStorage.setItem('fittracker_workout_sync_queue_v1_user-1', JSON.stringify([{
      ...baseDraft,
      queueId: baseDraft.sessionId,
      enqueuedAt: 3,
      retryCount: 2,
      lastError: 'SYNC_FAILED',
      lastErrorAt: 4,
    }]));

    const entries = workoutSyncQueue.list('user-1');
    expect(entries).toHaveLength(1);
    expect(entries[0].sessionId).toBe(baseDraft.sessionId);
    expect(entries[0].retryCount).toBe(2);
    expect(entries[0].finalSyncPending).toBe(true);
    expect('exerciseSets' in entries[0]).toBe(false);
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

describe('permanent (R2-17)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('markRetry z WORKOUT_NOT_FOUND oznacza wpis jako permanent', () => {
    workoutSyncQueue.upsertFromDraft(baseDraft);
    const updated = workoutSyncQueue.markRetry('user-1', baseDraft.sessionId, 'WORKOUT_NOT_FOUND');
    expect(updated?.permanent).toBe(true);
  });

  it('markRetry z permission-denied oznacza wpis jako permanent', () => {
    workoutSyncQueue.upsertFromDraft(baseDraft);
    const updated = workoutSyncQueue.markRetry('user-1', baseDraft.sessionId, 'Missing or insufficient permissions (permission-denied)');
    expect(updated?.permanent).toBe(true);
  });

  it('markRetry z konfliktem/offline NIE oznacza permanent', () => {
    workoutSyncQueue.upsertFromDraft(baseDraft);
    expect(workoutSyncQueue.markRetry('user-1', baseDraft.sessionId, 'WORKOUT_CONFLICT')?.permanent).toBeFalsy();
    expect(workoutSyncQueue.markRetry('user-1', baseDraft.sessionId, 'OFFLINE')?.permanent).toBeFalsy();
  });

  it('flaga permanent przezywa roundtrip localStorage', () => {
    workoutSyncQueue.upsertFromDraft(baseDraft);
    workoutSyncQueue.markRetry('user-1', baseDraft.sessionId, 'WORKOUT_NOT_FOUND');
    const listed = workoutSyncQueue.list('user-1');
    expect(listed[0].permanent).toBe(true);
  });
});
