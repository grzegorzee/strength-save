import { describe, expect, it, vi } from 'vitest';
import {
  RETRY_BACKOFF_BASE_MS,
  RETRY_BACKOFF_MAX_MS,
  collectRetryableSyncEntries,
  recordWorkoutSyncFailure,
  workoutSyncRetryDelayMs,
} from '@/lib/workout-sync-entries';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
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

// Bug 37 (X30): auto-retry bez backoffu melil trwale bledy (validation/unknown)
// przy kazdym flapie sieci i kazdym onSnapshot — retryCount byl tylko Badge w UI.
// Backoff dziala WYLACZNIE gdy caller poda `now` (AutoSyncOnReconnect); reczne
// "Ponow" w Sync Center wola bez `now` i ma zawsze pelna pule.
// WP-C (X38): full jitter min(60 s, 5 s * 2^n), deterministyczny per sesja.
describe('backoff auto-retry z retryCount + lastErrorAt (bug 37, jitter X38)', () => {
  const NOW = 1_700_000_000_000;

  it('okno backoffu miesci sie w [1 s, min(60 s, 5 s * 2^n)] i jest deterministyczne', () => {
    for (let n = 1; n <= 12; n += 1) {
      const delay = workoutSyncRetryDelayMs(n, 'workout-1');
      expect(delay).toBeGreaterThanOrEqual(1_000);
      expect(delay).toBeLessThanOrEqual(Math.min(RETRY_BACKOFF_MAX_MS, RETRY_BACKOFF_BASE_MS * 2 ** n));
      expect(workoutSyncRetryDelayMs(n, 'workout-1')).toBe(delay);
    }
  });

  it('rozne sesje dostaja rozne okna (jitter rozklada retry w czasie)', () => {
    const windows = new Set(['a', 'b', 'c', 'd', 'e'].map((id) => workoutSyncRetryDelayMs(6, id)));
    expect(windows.size).toBeGreaterThan(1);
  });

  it('wpis tuz po porazce jest wstrzymany (w oknie jittera)', () => {
    const entry = queueEntry({ finalSyncPending: true, retryCount: 1, lastErrorAt: NOW - 500 });
    expect(collectRetryableSyncEntries([], [entry], { now: NOW })).toEqual([]);
  });

  it('po uplywie okna backoffu wpis wraca do puli', () => {
    const entry = queueEntry({ finalSyncPending: true, retryCount: 1, lastErrorAt: NOW - 11_000 });
    expect(collectRetryableSyncEntries([], [entry], { now: NOW })).toHaveLength(1);
  });

  it('sufit 60 s: melacy wpis wraca najpozniej po minucie (nie po godzinie)', () => {
    const pastCap = queueEntry({ finalSyncPending: true, retryCount: 20, lastErrorAt: NOW - 61_000 });
    expect(collectRetryableSyncEntries([], [pastCap], { now: NOW })).toHaveLength(1);
    const fresh = queueEntry({ finalSyncPending: true, retryCount: 20, lastErrorAt: NOW - 200 });
    expect(collectRetryableSyncEntries([], [fresh], { now: NOW })).toEqual([]);
  });

  it('backoff wstrzymuje tez aktywny draft tej samej sesji (jak permanent)', () => {
    const entry = queueEntry({ retryCount: 2, lastErrorAt: NOW - 200 });
    expect(collectRetryableSyncEntries([draft()], [entry], { now: NOW })).toEqual([]);
  });

  it('swiezy wpis (retryCount 0) idzie od razu', () => {
    expect(collectRetryableSyncEntries([], [queueEntry({ finalSyncPending: true })], { now: NOW })).toHaveLength(1);
  });

  it('niezmiennik recznego Ponow: bez `now` backoff nie filtruje (Sync Center)', () => {
    const entry = queueEntry({ finalSyncPending: true, retryCount: 5, lastErrorAt: NOW - 1000 });
    expect(collectRetryableSyncEntries([], [entry])).toHaveLength(1);
  });

  it('reset backoffu (realne zdarzenie): retryCount 0, wpis trwaly nietkniety', () => {
    localStorage.clear();
    const retryable = queueEntry({ sessionId: 'w-retry', queueId: 'w-retry', retryCount: 4, lastErrorAt: NOW, lastError: 'unavailable' });
    const permanent = queueEntry({ sessionId: 'w-perm', queueId: 'w-perm', retryCount: 2, lastErrorAt: NOW, lastError: 'permission-denied', permanent: true });
    localStorage.setItem('fittracker_workout_sync_queue_v1_user-1', JSON.stringify([retryable, permanent]));

    workoutSyncQueue.resetBackoff('user-1');

    const after = workoutSyncQueue.list('user-1');
    expect(after.find((e) => e.sessionId === 'w-retry')).toMatchObject({ retryCount: 0, lastErrorAt: null, lastError: 'unavailable' });
    expect(after.find((e) => e.sessionId === 'w-perm')).toMatchObject({ retryCount: 2, permanent: true });
    expect(collectRetryableSyncEntries([], after, { now: NOW })).toHaveLength(1);
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
