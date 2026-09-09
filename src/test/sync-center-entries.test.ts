import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSyncQueueEntry } from '@/lib/workout-sync-queue';

let mockDrafts: ActiveWorkoutDraft[] = [];
let mockQueue: WorkoutSyncQueueEntry[] = [];

vi.mock('@/lib/workout-draft-db', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/workout-draft-db')>();
  return {
    ...original,
    workoutDraftDb: {
      ...original.workoutDraftDb,
      listDrafts: vi.fn(async () => mockDrafts),
    },
  };
});

vi.mock('@/lib/workout-sync-queue', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/workout-sync-queue')>();
  return {
    ...original,
    workoutSyncQueue: {
      ...original.workoutSyncQueue,
      list: vi.fn(() => mockQueue),
    },
  };
});

import { useSyncCenterEntries } from '@/hooks/useSyncCenterEntries';
import { workoutDraftDb } from '@/lib/workout-draft-db';

const makeDraft = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 's1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-07-03',
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: 's1',
  exerciseSets: {},
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1,
  updatedAt: 2,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 1,
  ...over,
});

const makeQueueEntry = (over: Partial<WorkoutSyncQueueEntry> = {}): WorkoutSyncQueueEntry => ({
  sessionId: 'q1',
  dayId: 'day-2',
  date: '2026-07-02',
  sessionOrigin: 'remote',
  dirty: true,
  finalSyncPending: true,
  updatedAt: 3,
  retryCount: 1,
  lastError: 'SYNC_FAILED',
  lastErrorAt: 4,
  ...over,
} as WorkoutSyncQueueEntry);

describe('useSyncCenterEntries (Z52)', () => {
  beforeEach(() => {
    mockDrafts = [];
    mockQueue = [];
  });

  it('zwraca wpisy z draftów i kolejki z dedupem po sessionId', async () => {
    mockDrafts = [makeDraft({ sessionId: 's1' })];
    mockQueue = [
      makeQueueEntry({ sessionId: 's1' }), // duplikat draftu — ma zniknąć
      makeQueueEntry({ sessionId: 'q2' }),
    ];

    const { result } = renderHook(() => useSyncCenterEntries('u1'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.listedEntries.map(e => e.sessionId)).toEqual(['s1', 'q2']);
  });

  it('pusty stan: isLoaded true i zero wpisów', async () => {
    const { result } = renderHook(() => useSyncCenterEntries('u1'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.listedEntries).toEqual([]);
  });

  it('does not expose A entries or publish a late A scan after changing to B', async () => {
    let finishA!: (value: ActiveWorkoutDraft[]) => void;
    vi.mocked(workoutDraftDb.listDrafts).mockImplementationOnce(() => new Promise(resolve => { finishA = resolve; }));
    const { result, rerender } = renderHook(({ uid }) => useSyncCenterEntries(uid), { initialProps: { uid: 'u1' } });
    mockDrafts = [makeDraft({ sessionId: 'b', userId: 'u2' })];
    rerender({ uid: 'u2' });
    await waitFor(() => expect(result.current.listedEntries.map(e => e.sessionId)).toEqual(['b']));
    await act(async () => { finishA([makeDraft({ sessionId: 'a' })]); });
    expect(result.current.listedEntries.map(e => e.sessionId)).toEqual(['b']);
  });

  it('a slow older scan cannot restore a banner after a newer scan confirms no pending draft', async () => {
    mockDrafts = [makeDraft()];
    const { result } = renderHook(() => useSyncCenterEntries('u1'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    let finishOld!: (value: ActiveWorkoutDraft[]) => void;
    vi.mocked(workoutDraftDb.listDrafts).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    let oldScan!: Promise<void>;
    act(() => { oldScan = result.current.reload(); });
    mockDrafts = [];
    await act(async () => { await result.current.reload(); });
    await act(async () => { finishOld([makeDraft()]); await oldScan; });
    expect(result.current.listedEntries).toEqual([]);
  });

  // WP-C (X38): Sync Center w Profilu tylko dla wpisów trwałych/konfliktów;
  // zwykłe "czeka na sieć" zostaje w listedEntries, ale nie w attentionEntries.
  it('attentionEntries: tylko permanent i konflikt rewizji, zwykłe pending poza', async () => {
    mockDrafts = [makeDraft({ sessionId: 's-pending' }), makeDraft({ sessionId: 's-perm' })];
    mockQueue = [
      makeQueueEntry({ sessionId: 's-pending', lastError: 'OFFLINE' }),
      makeQueueEntry({ sessionId: 's-perm', lastError: 'permission-denied', permanent: true }),
      makeQueueEntry({ sessionId: 'q-conflict', lastError: 'WORKOUT_CONFLICT' }),
    ];

    const { result } = renderHook(() => useSyncCenterEntries('u1'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.listedEntries.map(e => e.sessionId)).toEqual(['s-pending', 's-perm', 'q-conflict']);
    expect(result.current.attentionEntries.map(e => e.sessionId)).toEqual(['s-perm', 'q-conflict']);
  });
});
