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

// Bug 37 (X30): auto-retry bez backoffu melil trwale bledy (validation/unknown)
// przy kazdym flapie sieci i kazdym onSnapshot — retryCount byl tylko Badge w UI.
// Backoff dziala WYLACZNIE gdy caller poda `now` (AutoSyncOnReconnect); reczne
// "Ponow" w Sync Center wola bez `now` i ma zawsze pelna pule.
describe('backoff auto-retry z retryCount + lastErrorAt (bug 37)', () => {
  const NOW = 1_700_000_000_000;

  it('wpis tuz po porazce jest wstrzymany (2^1 * 30s = 60s)', () => {
    const entry = queueEntry({ finalSyncPending: true, retryCount: 1, lastErrorAt: NOW - 30_000 });
    expect(collectRetryableSyncEntries([], [entry], { now: NOW })).toEqual([]);
  });

  it('po uplywie okna backoffu wpis wraca do puli', () => {
    const entry = queueEntry({ finalSyncPending: true, retryCount: 1, lastErrorAt: NOW - 61_000 });
    expect(collectRetryableSyncEntries([], [entry], { now: NOW })).toHaveLength(1);
  });

  it('okno rosnie wykladniczo z retryCount (2^4 * 30s = 8 min)', () => {
    const inWindow = queueEntry({ finalSyncPending: true, retryCount: 4, lastErrorAt: NOW - 5 * 60_000 });
    expect(collectRetryableSyncEntries([], [inWindow], { now: NOW })).toEqual([]);
    const pastWindow = queueEntry({ finalSyncPending: true, retryCount: 4, lastErrorAt: NOW - 9 * 60_000 });
    expect(collectRetryableSyncEntries([], [pastWindow], { now: NOW })).toHaveLength(1);
  });

  it('sufit 1h: melacy wpis wraca najpozniej po godzinie', () => {
    const inWindow = queueEntry({ finalSyncPending: true, retryCount: 20, lastErrorAt: NOW - 59 * 60_000 });
    expect(collectRetryableSyncEntries([], [inWindow], { now: NOW })).toEqual([]);
    const pastCap = queueEntry({ finalSyncPending: true, retryCount: 20, lastErrorAt: NOW - 61 * 60_000 });
    expect(collectRetryableSyncEntries([], [pastCap], { now: NOW })).toHaveLength(1);
  });

  it('backoff wstrzymuje tez aktywny draft tej samej sesji (jak permanent)', () => {
    const entry = queueEntry({ retryCount: 2, lastErrorAt: NOW - 10_000 });
    expect(collectRetryableSyncEntries([draft()], [entry], { now: NOW })).toEqual([]);
  });

  it('swiezy wpis (retryCount 0) idzie od razu', () => {
    expect(collectRetryableSyncEntries([], [queueEntry({ finalSyncPending: true })], { now: NOW })).toHaveLength(1);
  });

  it('niezmiennik recznego Ponow: bez `now` backoff nie filtruje (Sync Center)', () => {
    const entry = queueEntry({ finalSyncPending: true, retryCount: 5, lastErrorAt: NOW - 1000 });
    expect(collectRetryableSyncEntries([], [entry])).toHaveLength(1);
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
