import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLegacySyncLeftovers, type LegacyCleanupDeps } from '@/lib/workout-sync-cleanup';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSyncQueueEntry } from '@/lib/workout-sync-queue';
import type { WorkoutSession } from '@/types';

const UID = 'u1';

const makeDraft = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 'provisional-old',
  userId: UID,
  dayId: 'day-1',
  date: '2026-06-20',
  cycleId: null,
  sessionOrigin: 'provisional',
  remoteSessionId: null,
  exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1,
  updatedAt: 2,
  lastFirebaseSyncAt: null,
  dirty: false,
  completedLocally: false,
  finalSyncPending: false,
  version: 4,
  ...over,
});

const makeQueueEntry = (over: Partial<WorkoutSyncQueueEntry> = {}): WorkoutSyncQueueEntry => ({
  queueId: 'q',
  userId: UID,
  sessionId: 'orphan-queue',
  dayId: 'day-2',
  date: '2026-06-19',
  sessionOrigin: 'remote',
  dirty: true,
  finalSyncPending: false,
  updatedAt: 3,
  enqueuedAt: 3,
  retryCount: 0,
  lastError: null,
  lastErrorAt: null,
  ...over,
});

const makeCompletedWorkout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'w1',
  dayId: 'day-1',
  date: '2026-06-20',
  completed: true,
  exercises: [],
  ...over,
} as WorkoutSession);

const makeDeps = (over: Partial<LegacyCleanupDeps> = {}): LegacyCleanupDeps => ({
  listDrafts: vi.fn(async () => []),
  clearDraftIfVersion: vi.fn(async () => true),
  queue: {
    list: vi.fn(() => []),
    remove: vi.fn(),
  },
  ...over,
});

describe('cleanupLegacySyncLeftovers (Z53)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('wpis kolejki bez draftu w IDB znika', async () => {
    const deps = makeDeps({
      queue: { list: vi.fn(() => [makeQueueEntry({ sessionId: 'orphan-queue' })]), remove: vi.fn() },
    });

    await cleanupLegacySyncLeftovers(UID, [], deps);

    expect(deps.queue.remove).toHaveBeenCalledWith(UID, 'orphan-queue');
  });

  it('czysty provisional draft z ukończonym odpowiednikiem w chmurze znika', async () => {
    const draft = makeDraft();
    const deps = makeDeps({ listDrafts: vi.fn(async () => [draft]) });

    await cleanupLegacySyncLeftovers(UID, [makeCompletedWorkout()], deps);

    expect(deps.clearDraftIfVersion).toHaveBeenCalledWith(UID, draft.sessionId, draft.version);
  });

  it('dirty draft ZOSTAJE', async () => {
    const deps = makeDeps({ listDrafts: vi.fn(async () => [makeDraft({ dirty: true })]) });

    await cleanupLegacySyncLeftovers(UID, [makeCompletedWorkout()], deps);

    expect(deps.clearDraftIfVersion).not.toHaveBeenCalled();
  });

  it('finalSyncPending draft ZOSTAJE', async () => {
    const deps = makeDeps({
      listDrafts: vi.fn(async () => [makeDraft({ finalSyncPending: true })]),
    });

    await cleanupLegacySyncLeftovers(UID, [makeCompletedWorkout()], deps);

    expect(deps.clearDraftIfVersion).not.toHaveBeenCalled();
  });

  it('guard jednorazowości: drugie wywołanie to no-op', async () => {
    const deps = makeDeps({
      queue: { list: vi.fn(() => [makeQueueEntry()]), remove: vi.fn() },
    });

    await cleanupLegacySyncLeftovers(UID, [], deps);
    await cleanupLegacySyncLeftovers(UID, [], deps);

    expect(deps.queue.list).toHaveBeenCalledTimes(1);
  });

  it('porażka czyszczenia nie ustawia guardu (retry przy kolejnym wywołaniu)', async () => {
    const failing = makeDeps({
      listDrafts: vi.fn(async () => { throw new Error('IDB_DOWN'); }),
    });

    await expect(cleanupLegacySyncLeftovers(UID, [], failing)).rejects.toThrow('IDB_DOWN');

    const deps = makeDeps({
      queue: { list: vi.fn(() => [makeQueueEntry()]), remove: vi.fn() },
    });
    await cleanupLegacySyncLeftovers(UID, [], deps);
    expect(deps.queue.remove).toHaveBeenCalled();
  });
});
