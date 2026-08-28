import { describe, expect, it } from 'vitest';
import { buildWorkoutDraftSnapshot, type DraftSnapshotContext } from '@/lib/workout-draft-snapshot';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const makePreviousDraft = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
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
  cloudRevision: 5,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 6,
  ...over,
});

const makeContext = (over: Partial<DraftSnapshotContext> = {}): DraftSnapshotContext => ({
  userId: 'u1',
  sessionId: 's1',
  dayId: 'd1',
  date: '2026-07-03',
  previousDraft: makePreviousDraft(),
  exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  dayNames: { 'ex-1': 'Przysiad' },
  cloudMeta: null,
  now: 3000,
  ...over,
});

describe('sessionSwaps w snapshocie draftu (Z185)', () => {
  const swaps = { 'ex-1': { id: 'ex-1__swap-wyciskanie', name: 'Wyciskanie', sets: '3 x 6-8' } };

  it('override sessionSwaps trafia do snapshotu', () => {
    const snapshot = buildWorkoutDraftSnapshot(makeContext(), { sessionSwaps: swaps });
    expect(snapshot?.sessionSwaps).toEqual(swaps);
  });

  it('sessionSwaps dziedziczy się z previousDraft (snapshot techniczny go nie gubi)', () => {
    const context = makeContext({ previousDraft: makePreviousDraft({ sessionSwaps: swaps }) });
    const snapshot = buildWorkoutDraftSnapshot(context);
    expect(snapshot?.sessionSwaps).toEqual(swaps);
  });

  it('brak sessionSwaps => pole nieobecne (legacy draft bez zmian)', () => {
    const snapshot = buildWorkoutDraftSnapshot(makeContext());
    expect(snapshot && 'sessionSwaps' in snapshot).toBe(false);
  });
});

describe('buildWorkoutDraftSnapshot', () => {
  it('przenosi pendingWriteId i pendingWriteVersion z previousDraft', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({ pendingWriteId: 'W', pendingWriteVersion: 6 }),
    });

    const snapshot = buildWorkoutDraftSnapshot(context);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.pendingWriteId).toBe('W');
    expect(snapshot?.pendingWriteVersion).toBe(6);
  });

  it('identyczna treść nie podbija version', () => {
    const context = makeContext();

    const snapshot = buildWorkoutDraftSnapshot(context);

    expect(snapshot?.version).toBe(6);
  });

  it('zmieniona treść podbija version i NADAL przenosi pendingWriteId', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({ pendingWriteId: 'W', pendingWriteVersion: 6 }),
      exerciseSets: {
        'ex-1': [
          { reps: 8, weight: 100, completed: true },
          { reps: 8, weight: 100, completed: true },
        ],
      },
    });

    const snapshot = buildWorkoutDraftSnapshot(context);

    expect(snapshot?.version).toBe(7);
    // pendingWriteId kasuje dopiero silnik po sukcesie; reuse i tak blokuje
    // niezgodny pendingWriteVersion (draftWriteId).
    expect(snapshot?.pendingWriteId).toBe('W');
    expect(snapshot?.pendingWriteVersion).toBe(6);
  });

  it('previousDraft o innym sessionId jest ignorowany (snapshot od zera)', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({
        sessionId: 'inna-sesja',
        pendingWriteId: 'W',
        pendingWriteVersion: 6,
      }),
    });

    const snapshot = buildWorkoutDraftSnapshot(context);

    expect(snapshot?.version).toBe(1);
    expect(snapshot?.pendingWriteId).toBeUndefined();
    expect(snapshot?.pendingWriteVersion).toBeUndefined();
    expect(snapshot?.startedAt).toBe(3000);
  });

  it('brak userId/sessionId/dayId zwraca null', () => {
    expect(buildWorkoutDraftSnapshot(makeContext({ sessionId: null }))).toBeNull();
    expect(buildWorkoutDraftSnapshot(makeContext({ userId: null }))).toBeNull();
    expect(buildWorkoutDraftSnapshot(makeContext({ dayId: null }))).toBeNull();
  });

  it('overrides nadpisują wartości z refów i previousDraft', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({ pendingWriteId: 'W', pendingWriteVersion: 6 }),
    });

    const snapshot = buildWorkoutDraftSnapshot(context, {
      version: 99,
      pendingWriteId: null,
      pendingWriteVersion: null,
      dirty: false,
    });

    expect(snapshot?.version).toBe(99);
    expect(snapshot?.pendingWriteId).toBeNull();
    expect(snapshot?.pendingWriteVersion).toBeNull();
    expect(snapshot?.dirty).toBe(false);
  });

  it('przenosi lastTouchedExerciseId z previousDraft (Z47)', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({ lastTouchedExerciseId: 'ex-1' }),
    });

    const snapshot = buildWorkoutDraftSnapshot(context);

    expect(snapshot?.lastTouchedExerciseId).toBe('ex-1');
  });

  it('overrides nadpisują lastTouchedExerciseId (Z47)', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({ lastTouchedExerciseId: 'ex-1' }),
    });

    const snapshot = buildWorkoutDraftSnapshot(context, { lastTouchedExerciseId: 'ex-2' });

    expect(snapshot?.lastTouchedExerciseId).toBe('ex-2');
  });

  it('zmiana dayNotes / skippedExercises / metrics liczy się jako zmiana treści', () => {
    expect(buildWorkoutDraftSnapshot(makeContext({ dayNotes: 'nowa notatka' }))?.version).toBe(7);
    expect(buildWorkoutDraftSnapshot(makeContext({ skippedExercises: ['ex-2'] }))?.version).toBe(7);
    expect(buildWorkoutDraftSnapshot(makeContext({ exerciseMetrics: { 'ex-1': { rpe: 8 } } }))?.version).toBe(7);
    expect(buildWorkoutDraftSnapshot(makeContext({ exerciseNotes: { 'ex-1': 'ciężko' } }))?.version).toBe(7);
  });

  it('techniczny snapshot zachowuje health fence i nie podbija version', () => {
    const healthGrant = { healthEpoch: 7, healthGrantId: 'grant-7' };
    const previousDraft = makePreviousDraft({
      exerciseMetrics: { 'ex-1': { rpe: 8 } },
      exerciseMetricGrants: { 'ex-1': { rpe: healthGrant } },
      pendingHealthGrant: healthGrant,
    });
    const snapshot = buildWorkoutDraftSnapshot(makeContext({
      previousDraft,
      exerciseMetrics: previousDraft.exerciseMetrics,
      exerciseMetricGrants: previousDraft.exerciseMetricGrants,
      pendingHealthGrant: previousDraft.pendingHealthGrant,
    }));

    expect(snapshot?.exerciseMetricGrants).toEqual(previousDraft.exerciseMetricGrants);
    expect(snapshot?.pendingHealthGrant).toEqual(healthGrant);
    expect(snapshot?.version).toBe(6);
  });

  it('zmiana fence jest zmianą wersjonowanej treści draftu', () => {
    const previousGrant = { healthEpoch: 7, healthGrantId: 'grant-7' };
    const currentGrant = { healthEpoch: 8, healthGrantId: 'grant-8' };
    const previousDraft = makePreviousDraft({
      exerciseMetrics: { 'ex-1': { rpe: 8 } },
      exerciseMetricGrants: { 'ex-1': { rpe: previousGrant } },
      pendingHealthGrant: previousGrant,
    });
    const snapshot = buildWorkoutDraftSnapshot(makeContext({
      previousDraft,
      exerciseMetrics: previousDraft.exerciseMetrics,
      exerciseMetricGrants: { 'ex-1': { rpe: currentGrant } },
      pendingHealthGrant: currentGrant,
    }));

    expect(snapshot?.version).toBe(7);
    expect(snapshot?.pendingHealthGrant).toEqual(currentGrant);
  });
});

describe('warmupChecked w snapshocie draftu (Z162)', () => {
  it('override warmupChecked trafia do snapshotu i podbija version (zmiana treści)', () => {
    const snapshot = buildWorkoutDraftSnapshot(makeContext(), {
      warmupChecked: ['warmup.jumpingJacks'],
    });

    expect(snapshot?.warmupChecked).toEqual(['warmup.jumpingJacks']);
    expect(snapshot?.version).toBe(7);
  });

  it('brak zmiany warmupChecked nie podbija version (niezmiennik)', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({ warmupChecked: ['warmup.jumpingJacks'] }),
      warmupChecked: ['warmup.jumpingJacks'],
    });

    const snapshot = buildWorkoutDraftSnapshot(context);

    expect(snapshot?.warmupChecked).toEqual(['warmup.jumpingJacks']);
    expect(snapshot?.version).toBe(6);
  });

  it('legacy previousDraft bez warmupChecked: snapshot bez pola, version bez bumpu', () => {
    const snapshot = buildWorkoutDraftSnapshot(makeContext());

    expect(snapshot?.warmupChecked).toBeUndefined();
    expect(snapshot?.version).toBe(6);
  });
});

describe('lastActivityAt — znacznik ostatniej realnej aktywności (Z142)', () => {
  it('zmiana treści (toggle serii) bumpuje lastActivityAt do now', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({ lastActivityAt: 1500 }),
      exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: false }] },
    });
    expect(buildWorkoutDraftSnapshot(context)?.lastActivityAt).toBe(3000);
  });

  it('zmiana kg / dodanie serii / notatka bumpują lastActivityAt', () => {
    const prev = makePreviousDraft({ lastActivityAt: 1500 });
    expect(buildWorkoutDraftSnapshot(makeContext({
      previousDraft: prev,
      exerciseSets: { 'ex-1': [{ reps: 8, weight: 105, completed: true }] },
    }))?.lastActivityAt).toBe(3000);
    expect(buildWorkoutDraftSnapshot(makeContext({
      previousDraft: prev,
      exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: true }, { reps: 8, weight: 100, completed: false }] },
    }))?.lastActivityAt).toBe(3000);
    expect(buildWorkoutDraftSnapshot(makeContext({
      previousDraft: prev,
      exerciseNotes: { 'ex-1': 'ciężko' },
    }))?.lastActivityAt).toBe(3000);
  });

  it('snapshot techniczny (ta sama treść, np. finalizedAt / scroll) NIE bumpuje', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({ lastActivityAt: 1500 }),
    });
    expect(buildWorkoutDraftSnapshot(context, { finalizedAt: 2999 })?.lastActivityAt).toBe(1500);
    expect(buildWorkoutDraftSnapshot(context, { lastTouchedExerciseId: 'ex-9' })?.lastActivityAt).toBe(1500);
  });

  it('stary draft bez pola: snapshot bez zmiany treści zostawia undefined (zero migracji)', () => {
    const context = makeContext({ previousDraft: makePreviousDraft() });
    expect(buildWorkoutDraftSnapshot(context, { finalizedAt: 2999 })?.lastActivityAt).toBeUndefined();
  });

  it('pierwszy snapshot sesji (brak previousDraft) dostaje lastActivityAt=now', () => {
    const context = makeContext({ previousDraft: null });
    expect(buildWorkoutDraftSnapshot(context)?.lastActivityAt).toBe(3000);
  });
});

describe('queuedDraft jako baza snapshotu (R2-21)', () => {
  it('gdy activeDraft nie pasuje do sesji, bazą jest queuedDraft o zgodnym sessionId', () => {
    const queued = makePreviousDraft({
      version: 7,
      startedAt: 500,
      cycleId: 'cycle-queued',
      pendingWriteId: 'W',
      pendingWriteVersion: 7,
    });
    const context = makeContext({
      previousDraft: makePreviousDraft({ sessionId: 'inna-sesja' }),
      queuedDraft: queued,
    });

    const snapshot = buildWorkoutDraftSnapshot(context);

    // Identyczna treść: wersja i startedAt z bazy kolejkowej (bez rollbacku do 1).
    expect(snapshot?.version).toBe(7);
    expect(snapshot?.startedAt).toBe(500);
    expect(snapshot?.cycleId).toBe('cycle-queued');
    expect(snapshot?.pendingWriteId).toBe('W');
  });

  it('activeDraft o zgodnym sessionId ma pierwszeństwo przed queuedDraft', () => {
    const context = makeContext({
      previousDraft: makePreviousDraft({ version: 9, startedAt: 111 }),
      queuedDraft: makePreviousDraft({ version: 4, startedAt: 999 }),
    });

    const snapshot = buildWorkoutDraftSnapshot(context);

    expect(snapshot?.version).toBe(9);
    expect(snapshot?.startedAt).toBe(111);
  });
});
