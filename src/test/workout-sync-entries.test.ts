import { describe, expect, it, vi } from 'vitest';
import { collectRetryableSyncEntries, recordWorkoutSyncFailure } from '@/lib/workout-sync-entries';
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
  lastErrorAt: null,
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

describe('permanent wpisy poza auto-retry (R2-17)', () => {
  it('pomija wpis kolejki oznaczony permanent', () => {
    expect(collectRetryableSyncEntries([], [queueEntry({ permanent: true })])).toEqual([]);
  });

  it('pomija draft, ktorego sesja ma wpis permanent w kolejce', () => {
    expect(collectRetryableSyncEntries([draft()], [queueEntry({ permanent: true })])).toEqual([]);
  });
});

describe('recordWorkoutSyncFailure (R2-16)', () => {
  it('istniejacy wpis dostaje markRetry bez odczytu draftu', async () => {
    const queue = {
      markRetry: vi.fn(() => queueEntry()),
      upsertFromDraft: vi.fn(),
    };
    const loadDraft = vi.fn();

    await recordWorkoutSyncFailure('user-1', { sessionId: 's-remote' }, 'WORKOUT_CONFLICT', { queue, loadDraft });

    expect(queue.markRetry).toHaveBeenCalledWith('user-1', 's-remote', 'WORKOUT_CONFLICT');
    expect(loadDraft).not.toHaveBeenCalled();
    expect(queue.upsertFromDraft).not.toHaveBeenCalled();
  });

  it('po promocji (brak wpisu nowego id) adoptuje draft do kolejki z lastError', async () => {
    // Silnik usunal wpis starego provisional id przy promocji; final na NOWYM id padl
    // konfliktem. Bez adopcji lastError nigdzie nie trafia i AutoSync ponawia final
    // z konfliktem w nieskonczonosc (R2-16).
    const markRetry = vi.fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(queueEntry({ sessionId: 's-remote' }));
    const queue = { markRetry, upsertFromDraft: vi.fn() };
    const loadDraft = vi.fn(async () => draft({ sessionId: 's-remote' }));

    await recordWorkoutSyncFailure('user-1', { sessionId: 's-remote' }, 'WORKOUT_CONFLICT', { queue, loadDraft });

    expect(loadDraft).toHaveBeenCalledWith('user-1', 's-remote');
    expect(queue.upsertFromDraft).toHaveBeenCalledTimes(1);
    expect(queue.markRetry).toHaveBeenCalledTimes(2);
  });

  it('brak wpisu i brak draftu = nic do zapisania (sesja domknieta)', async () => {
    const queue = { markRetry: vi.fn(() => null), upsertFromDraft: vi.fn() };
    const loadDraft = vi.fn(async () => null);

    await recordWorkoutSyncFailure('user-1', { sessionId: 's-x' }, 'ERR', { queue, loadDraft });

    expect(queue.upsertFromDraft).not.toHaveBeenCalled();
  });
});
