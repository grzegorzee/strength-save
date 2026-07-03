import { describe, expect, it, vi } from 'vitest';
import { syncWorkoutSession, type WorkoutSyncDeps } from '@/lib/workout-sync-engine';
import { buildWorkoutDraftSnapshot } from '@/lib/workout-draft-snapshot';
import { resolveWriteAttempt } from '@/lib/workout-write-attempt';
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
    clearDraftIfVersion: vi.fn(async () => true),
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
    expect(deps.clearDraftIfVersion).toHaveBeenCalledWith('u1', 's1', 3);
    expect(deps.queue.remove).toHaveBeenCalledWith('u1', 's1');
  });

  it('konflikt z saveWorkout propagowany jako { success: false, conflict: true }', async () => {
    const deps = makeDeps({ saveResult: { success: false, error: 'WORKOUT_CONFLICT' } });

    const outcome = await syncWorkoutSession('u1', 's1', 'checkpoint', deps);

    expect(outcome.success).toBe(false);
    expect(outcome.conflict).toBe(true);
    expect(outcome.error).toBe('WORKOUT_CONFLICT');
    expect(deps.clearDraftIfVersion).not.toHaveBeenCalled();
    expect(deps.markSynced).not.toHaveBeenCalled();
  });

  it('checkpoint po sukcesie woła markSynced z revision z wyniku', async () => {
    const deps = makeDeps({ saveResult: { success: true, updatedAt: 999, revision: 7 } });

    const outcome = await syncWorkoutSession('u1', 's1', 'checkpoint', deps);

    expect(outcome.success).toBe(true);
    expect(outcome.revision).toBe(7);
    expect(deps.markSynced).toHaveBeenCalledWith('u1', 5000, 3, 's1', { updatedAt: 999, revision: 7 });
    expect(deps.queue.remove).toHaveBeenCalledWith('u1', 's1');
    expect(deps.clearDraftIfVersion).not.toHaveBeenCalled();
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

  it('final nie kasuje draftu podbitego w trakcie zapisu: draftRetained + kolejka zostaje (R2-03)', async () => {
    // User tapie "Zakończ trening" (draft v4); w trakcie RTT odhacza serię (v5).
    // Silnik zwalidował treść v4 — bezwarunkowy clearDraft skasowałby serię z v5 na zawsze.
    const store: { draft: ActiveWorkoutDraft | null } = {
      draft: makeDraft({ version: 4, cloudRevision: 1, finalizedAt: 3000, completedLocally: true }),
    };

    const deps = {
      loadDraft: vi.fn(async () => store.draft),
      saveWorkout: vi.fn(async () => {
        // Odhaczenie serii w trakcie finalnego RTT.
        store.draft = store.draft && {
          ...store.draft,
          version: 5,
          exerciseSets: {
            'ex-1': [
              ...store.draft.exerciseSets['ex-1'],
              { reps: 6, weight: 100, completed: true },
            ],
          },
          dirty: true,
        };
        return { success: true, updatedAt: 999, revision: 2 };
      }),
      getFromServer: vi.fn(async () => null as WorkoutSession | null),
      createSession: vi.fn(async () => ({ session: null as WorkoutSession | null, error: 'NOT_EXPECTED' })),
      markPromoted: vi.fn(async () => undefined),
      markSynced: vi.fn(async () => undefined),
      setCloudBaseline: vi.fn(async () => undefined),
      setPendingWrite: vi.fn(async () => undefined),
      clearDraftIfVersion: vi.fn(async (_userId: string, _sessionId: string, expectedVersion: number) => {
        if ((store.draft?.version ?? 0) > expectedVersion) return false;
        store.draft = null;
        return true;
      }),
      queue: { remove: vi.fn() },
      isOnline: () => true,
      now: () => 5000,
    } satisfies WorkoutSyncDeps;
    deps.getFromServer
      .mockResolvedValueOnce(makeCloudWorkout({ completed: false }))
      .mockResolvedValueOnce(makeCloudWorkout({
        completed: true,
        revision: 2,
        durationSec: 2,
        startedAt: 1000,
      }));

    const outcome = await syncWorkoutSession('u1', 's1', 'final', deps);

    expect(outcome.success).toBe(true);
    expect(outcome.draftRetained).toBe(true);
    // Draft z serią v5 przeżywa; follow-up checkpoint go dosyła.
    expect(store.draft).not.toBeNull();
    expect(store.draft?.exerciseSets['ex-1']).toHaveLength(2);
    // Wpis kolejki zachowany dla checkpointu follow-up.
    expect(deps.queue.remove).not.toHaveBeenCalled();
    // Fakt serwera trafia na draft (tylko markery — wersja sync-runu jest starsza).
    expect(deps.markSynced).toHaveBeenCalledWith('u1', 5000, 4, 's1', { updatedAt: 999, revision: 2 });
  });

  it('lost-ack checkpointu: flush draftu nie zmienia writeId, retry kończy się already-applied', async () => {
    // Symulacja pełnej pętli R2-01: checkpoint dochodzi do serwera, ack ginie
    // (suspend / słaby zasięg), WorkoutDay flushuje draft przed retry.
    // Po Z29 flush przenosi pendingWriteId i nie podbija version, więc retry
    // idzie z TYM SAMYM writeId i serwer rozpoznaje własny zapis (no-op).
    let storedDraft: ActiveWorkoutDraft | null = makeDraft({ cloudRevision: 1, version: 6 });
    const server = {
      revision: 1,
      lastWriteId: undefined as string | undefined,
    };
    let dropAck = true;
    const seenWriteIds: string[] = [];

    const deps = {
      loadDraft: vi.fn(async () => storedDraft),
      saveWorkout: vi.fn(async (
        _sessionId: string,
        _exercises: unknown[],
        options: { expectedRevision: number | null; writeId: string },
      ) => {
        seenWriteIds.push(options.writeId);
        const resolution = resolveWriteAttempt(server, options.expectedRevision, options.writeId);
        if (resolution === 'conflict') {
          return { success: false, error: 'WORKOUT_CONFLICT' };
        }
        if (resolution === 'ok') {
          server.revision += 1;
          server.lastWriteId = options.writeId;
          if (dropAck) {
            dropAck = false;
            throw new Error('NETWORK_ACK_LOST');
          }
        }
        return { success: true, updatedAt: 999, revision: server.revision, alreadyApplied: resolution === 'already-applied' };
      }),
      getFromServer: vi.fn(async () => null),
      createSession: vi.fn(async () => ({ session: null as WorkoutSession | null, error: 'NOT_EXPECTED' })),
      markPromoted: vi.fn(async () => undefined),
      markSynced: vi.fn(async () => undefined),
      setCloudBaseline: vi.fn(async () => undefined),
      setPendingWrite: vi.fn(async (_userId: string, _sessionId: string, pending: { writeId: string; version: number } | null) => {
        if (storedDraft) {
          storedDraft = {
            ...storedDraft,
            pendingWriteId: pending ? pending.writeId : null,
            pendingWriteVersion: pending ? pending.version : null,
          };
        }
      }),
      clearDraftIfVersion: vi.fn(async () => true),
      queue: { remove: vi.fn() },
      isOnline: () => true,
      now: () => 5000,
    } satisfies WorkoutSyncDeps;

    const first = await syncWorkoutSession('u1', 's1', 'checkpoint', deps);
    expect(first.success).toBe(false);

    // Flush stanu React do IDB przed retry (identyczna treść) — ścieżka WorkoutDay.
    const flushed = buildWorkoutDraftSnapshot({
      userId: 'u1',
      sessionId: 's1',
      dayId: 'd1',
      date: '2026-07-03',
      previousDraft: storedDraft,
      exerciseSets: storedDraft!.exerciseSets,
      exerciseNotes: storedDraft!.exerciseNotes,
      exerciseMetrics: storedDraft!.exerciseMetrics,
      dayNotes: storedDraft!.dayNotes,
      skippedExercises: storedDraft!.skippedExercises,
      dayNames: {},
      cloudMeta: null,
      now: 6000,
    });
    expect(flushed).not.toBeNull();
    storedDraft = flushed;

    const retry = await syncWorkoutSession('u1', 's1', 'checkpoint', deps);

    expect(retry.success).toBe(true);
    expect(retry.conflict).toBeUndefined();
    expect(seenWriteIds).toHaveLength(2);
    expect(seenWriteIds[0]).toBe(seenWriteIds[1]);
    expect(server.revision).toBe(2);
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
    expect(deps.clearDraftIfVersion).toHaveBeenCalledWith('u1', 's1', 3);
  });
});
