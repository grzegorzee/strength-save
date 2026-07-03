import { describe, expect, it, vi } from 'vitest';
import { syncWorkoutSession, type WorkoutSyncDeps } from '@/lib/workout-sync-engine';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSession } from '@/types';

const makeDraft = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 's1',
  userId: 'u1',
  dayId: 'd1',
  date: '2026-07-03',
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: 's1',
  exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1000,
  updatedAt: 2000,
  cloudRevision: 1,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 3,
  ...over,
});

const makeCloudWorkout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1',
  userId: 'u1',
  dayId: 'd1',
  date: '2026-07-03',
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] }],
  completed: false,
  updatedAt: 500,
  revision: 1,
  ...over,
} as WorkoutSession);

interface FakeDepsOptions {
  draft?: ActiveWorkoutDraft | null;
  serverWorkout?: WorkoutSession | null;
  saveResult?: { success: boolean; error?: string; updatedAt?: number; revision?: number; alreadyApplied?: boolean };
  saveDelayMs?: number;
}

const makeDeps = (options: FakeDepsOptions = {}) => {
  const draft = options.draft === undefined ? makeDraft() : options.draft;
  const saveResult = options.saveResult ?? { success: true, updatedAt: 999, revision: 2 };

  const deps = {
    loadDraft: vi.fn(async (_userId: string, sessionId: string) => (
      draft && draft.sessionId === sessionId ? draft : null
    )),
    saveWorkout: vi.fn(async (
      _sessionId: string,
      _exercises: unknown[],
      _options: { expectedRevision: number | null; writeId: string; completed?: boolean },
    ) => {
      if (options.saveDelayMs) {
        await new Promise(resolve => setTimeout(resolve, options.saveDelayMs));
      }
      return saveResult;
    }),
    getFromServer: vi.fn(async () => options.serverWorkout ?? null),
    createSession: vi.fn(async () => ({ session: null as WorkoutSession | null, error: 'NOT_EXPECTED' })),
    markPromoted: vi.fn(async () => undefined),
    markSynced: vi.fn(async () => undefined),
    setCloudBaseline: vi.fn(async () => undefined),
    setPendingWrite: vi.fn(async () => undefined),
    clearDraft: vi.fn(async () => undefined),
    queue: {
      remove: vi.fn(),
    },
    isOnline: () => true,
    now: () => 5000,
  } satisfies WorkoutSyncDeps;

  return deps;
};

describe('syncWorkoutSession', () => {
  it('dwa równoległe synci tej samej sesji wykonują JEDEN zapis', async () => {
    const deps = makeDeps({ saveDelayMs: 20 });

    const [first, second] = await Promise.all([
      syncWorkoutSession('u1', 's1', 'checkpoint', deps),
      syncWorkoutSession('u1', 's1', 'checkpoint', deps),
    ]);

    expect(deps.saveWorkout).toHaveBeenCalledTimes(1);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
  });

  it('final z już sfinalizowaną treścią w chmurze nie zapisuje (alreadyFinalized)', async () => {
    const draft = makeDraft({ finalSyncPending: true, finalizedAt: 3000, completedLocally: true });
    const deps = makeDeps({
      draft,
      serverWorkout: makeCloudWorkout({
        completed: true,
        revision: 2,
        updatedAt: 800,
        notes: undefined,
      }),
    });

    const outcome = await syncWorkoutSession('u1', 's1', 'final', deps);

    expect(outcome.success).toBe(true);
    expect(outcome.alreadyFinalized).toBe(true);
    expect(deps.saveWorkout).not.toHaveBeenCalled();
    expect(deps.clearDraft).toHaveBeenCalledWith('u1', 's1');
    expect(deps.queue.remove).toHaveBeenCalledWith('u1', 's1');
  });

  it('konflikt z saveWorkout propagowany jako { success: false, conflict: true }', async () => {
    const deps = makeDeps({ saveResult: { success: false, error: 'WORKOUT_CONFLICT' } });

    const outcome = await syncWorkoutSession('u1', 's1', 'checkpoint', deps);

    expect(outcome.success).toBe(false);
    expect(outcome.conflict).toBe(true);
    expect(outcome.error).toBe('WORKOUT_CONFLICT');
    expect(deps.clearDraft).not.toHaveBeenCalled();
    expect(deps.markSynced).not.toHaveBeenCalled();
  });

  it('checkpoint po sukcesie woła markSynced z revision z wyniku', async () => {
    const deps = makeDeps({ saveResult: { success: true, updatedAt: 999, revision: 7 } });

    const outcome = await syncWorkoutSession('u1', 's1', 'checkpoint', deps);

    expect(outcome.success).toBe(true);
    expect(outcome.revision).toBe(7);
    expect(deps.markSynced).toHaveBeenCalledWith('u1', 5000, 3, 's1', { updatedAt: 999, revision: 7 });
    expect(deps.queue.remove).toHaveBeenCalledWith('u1', 's1');
    expect(deps.clearDraft).not.toHaveBeenCalled();
  });

  it('brak draftu = skipped sukces + sprzątnięcie referencji z kolejki', async () => {
    const deps = makeDeps({ draft: null });

    const outcome = await syncWorkoutSession('u1', 's1', 'checkpoint', deps);

    expect(outcome.success).toBe(true);
    expect(outcome.skipped).toBe(true);
    expect(deps.queue.remove).toHaveBeenCalledWith('u1', 's1');
    expect(deps.saveWorkout).not.toHaveBeenCalled();
  });

  it('draft bez cloudRevision dostaje baseline z serwera przed zapisem', async () => {
    const draft = makeDraft({ cloudRevision: undefined });
    const deps = makeDeps({ draft, serverWorkout: makeCloudWorkout({ revision: 4, updatedAt: 700 }) });

    const outcome = await syncWorkoutSession('u1', 's1', 'checkpoint', deps);

    expect(outcome.success).toBe(true);
    expect(deps.setCloudBaseline).toHaveBeenCalledWith('u1', 's1', { revision: 4, updatedAt: 700 });
    const saveOptions = deps.saveWorkout.mock.calls[0][2];
    expect(saveOptions.expectedRevision).toBe(4);
  });

  it('final wymuszony kind=final zapisuje completed nawet bez finalSyncPending na drafcie', async () => {
    const draft = makeDraft({ finalSyncPending: false, finalizedAt: 4000 });
    const deps = makeDeps({
      draft,
      serverWorkout: makeCloudWorkout({ completed: false }),
      saveResult: { success: true, updatedAt: 999, revision: 2 },
    });
    // read-back validation: po zapisie serwer ma finalną treść (z duration/startedAt)
    deps.getFromServer
      .mockResolvedValueOnce(makeCloudWorkout({ completed: false }))
      .mockResolvedValueOnce(makeCloudWorkout({
        completed: true,
        revision: 2,
        durationSec: 3,
        startedAt: 1000,
      }));

    const outcome = await syncWorkoutSession('u1', 's1', 'final', deps);

    expect(outcome.success).toBe(true);
    const saveOptions = deps.saveWorkout.mock.calls[0][2];
    expect(saveOptions.completed).toBe(true);
    expect(deps.clearDraft).toHaveBeenCalledWith('u1', 's1');
  });
});
