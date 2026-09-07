import { describe, expect, it, vi } from 'vitest';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { buildDraftFinalExpectation, buildWorkoutWriteExpectation, matchesFinalWorkoutContent, validateWorkoutCloudWrite } from '@/lib/workout-final-sync';
import { resolveWorkoutHydration } from '@/lib/workout-hydration';
import { syncWorkoutSession, type WorkoutSyncDeps } from '@/lib/workout-sync-engine';
import type { SetData, WorkoutSession } from '@/types';

const set: SetData = { reps: 8, weight: 80, completed: true };
const makeDraft = (overrides: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 'launch-s1', userId: 'launch-u1', dayId: 'd1', date: '2026-09-06',
  cycleId: null, sessionOrigin: 'remote', remoteSessionId: 'launch-s1',
  exerciseSets: { e1: [set] }, exerciseNotes: {}, exerciseMetrics: {},
  dayNotes: '', skippedExercises: [], startedAt: 1000, updatedAt: 3000,
  cloudRevision: 1, lastFirebaseSyncAt: null, dirty: true,
  completedLocally: false, finalSyncPending: false, version: 2,
  ...overrides,
});
const makeCloud = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'launch-s1', userId: 'launch-u1', dayId: 'd1', date: '2026-09-06',
  completed: true, revision: 1, exercises: [{ exerciseId: 'e1', sets: [set] }],
  ...overrides,
});

const cloudHarness = (initialDraft: ActiveWorkoutDraft, initialCloud: WorkoutSession) => {
  let draft = initialDraft;
  let cloud = initialCloud;
  const deps: WorkoutSyncDeps = {
    loadDraft: async () => draft,
    saveWorkout: vi.fn(async (_id, exercises, options) => {
      cloud = {
        ...cloud, ...Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)),
        exercises, revision: (cloud.revision ?? 0) + 1, updatedAt: 5000,
      };
      return { success: true, revision: cloud.revision, updatedAt: cloud.updatedAt };
    }),
    getFromServer: async () => cloud,
    createSession: async () => ({ session: null }),
    markPromoted: async () => {},
    markSynced: async (_uid, _at, _version, _session, state) => {
      draft = { ...draft, cloudRevision: state?.revision, pendingWriteId: null, pendingWriteVersion: null };
    },
    setCloudBaseline: async () => {},
    setPendingWrite: async () => {},
    clearDraftIfVersion: vi.fn(async () => true),
    queue: { remove: vi.fn() }, now: () => 5000,
  };
  return { deps, getCloud: () => cloud, updateDraft: (next: Partial<ActiveWorkoutDraft>) => { draft = { ...draft, ...next }; } };
};

describe('launch W1: hydration only removes the same complete base snapshot', () => {
  it.each(['new note', ''])('retains a newer exercise note %j after the older final ACK', (note) => {
    const draft = makeDraft({ exerciseNotes: { e1: note } });
    const cloud = makeCloud({ exercises: [{ exerciseId: 'e1', sets: [set], notes: 'old note' }] });
    const decision = resolveWorkoutHydration({
      workoutForDate: cloud, draft, draftHasData: true,
      completedValidationOk: validateWorkoutCloudWrite(cloud, buildDraftFinalExpectation(draft)).ok,
    });
    expect(decision).toEqual({ clearDraft: false, useDraft: true });
  });

  it('retains a health retry even when the completed base document matches', () => {
    const draft = makeDraft({ pendingHealthGrant: { healthEpoch: 2, healthGrantId: 'grant' }, healthSyncPending: true });
    expect(resolveWorkoutHydration({
      workoutForDate: makeCloud(), draft, draftHasData: true, completedValidationOk: true,
    })).toEqual({ clearDraft: false, useDraft: true });
  });

  it('still cleans an identical full snapshot and excludes skipped exercises consistently', () => {
    const draft = makeDraft({
      exerciseNotes: { e1: 'same' }, exerciseNames: { e1: 'Bench' },
      exerciseSets: { e1: [set], e2: [set] }, skippedExercises: ['e2'],
    });
    const cloud = makeCloud({ exercises: [{ exerciseId: 'e1', sets: [set], notes: 'same', name: 'Bench' }], skippedExercises: ['e2'] });
    expect(validateWorkoutCloudWrite(cloud, buildDraftFinalExpectation(draft))).toEqual({ ok: true });
  });
});

describe('launch W2: final validation preserves all supported set values', () => {
  it.each([
    { durationSec: 60 }, { distanceM: 30.5 }, { assistWeight: 15.25 },
  ])('recognizes an identical saved set %j and rejects an actual change', (extras) => {
    const exercise = { exerciseId: 'e1', sets: [{ ...set, ...extras }] };
    const expectation = buildWorkoutWriteExpectation([exercise], { completed: true });
    expect(matchesFinalWorkoutContent(makeCloud({ exercises: [exercise] }), expectation)).toBe(true);
    const [key, value] = Object.entries(extras)[0];
    const changed = { ...exercise, sets: [{ ...exercise.sets[0], [key]: value + 1 }] };
    expect(matchesFinalWorkoutContent(makeCloud({ exercises: [changed] }), expectation)).toBe(false);
  });

  it('does not hide a changed fractional weight by rounding to half kilograms', () => {
    const expectation = buildWorkoutWriteExpectation([{ exerciseId: 'e1', sets: [{ ...set, weight: 80.1 }] }], { completed: true });
    expect(matchesFinalWorkoutContent(makeCloud({ exercises: [{ exerciseId: 'e1', sets: [{ ...set, weight: 80.2 }] }] }), expectation)).toBe(false);
  });
});

describe('launch W3: snapshots clear previously saved optional fields', () => {
  it('checkpoint -> clear note and restore skipped exercise -> final keeps both changes', async () => {
    const h = cloudHarness(makeDraft({ dayNotes: 'old note', skippedExercises: ['e2'] }), makeCloud({ completed: false }));
    expect((await syncWorkoutSession('launch-u1', 'launch-s1', 'checkpoint', h.deps)).success).toBe(true);
    expect(h.getCloud()).toMatchObject({ notes: 'old note', skippedExercises: ['e2'] });
    h.updateDraft({ dayNotes: '', skippedExercises: [], version: 3, exerciseSets: { e1: [set], e2: [set] } });
    expect((await syncWorkoutSession('launch-u1', 'launch-s1', 'final', h.deps)).success).toBe(true);
    expect(h.getCloud()).toMatchObject({ notes: '', skippedExercises: [], completed: true });
    expect(h.getCloud().exercises).toHaveLength(2);
  });
});

describe('launch W4: cleanup cannot treat a deleted set or exercise as already saved', () => {
  it.each(['set', 'exercise'])('writes the shorter final snapshot after deleting an %s', async (deleted) => {
    const oldExercises = deleted === 'set'
      ? [{ exerciseId: 'e1', sets: [set, set] }]
      : [{ exerciseId: 'e1', sets: [set] }, { exerciseId: 'e2', sets: [set] }];
    const h = cloudHarness(makeDraft({ finalSyncPending: true }), makeCloud({ exercises: oldExercises }));
    const result = await syncWorkoutSession('launch-u1', 'launch-s1', 'final', h.deps);
    expect(result.success).toBe(true);
    expect(h.deps.saveWorkout).toHaveBeenCalledOnce();
    expect(h.getCloud().exercises).toEqual([{ exerciseId: 'e1', sets: [set] }]);
  });
});
