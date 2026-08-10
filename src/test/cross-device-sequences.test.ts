import { describe, expect, it } from 'vitest';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSession } from '@/types';
import {
  mergeDraftWithCloudWorkout,
  workoutSetTotals,
} from '@/lib/workout-cross-device-merge';
import { mergeWatchSetEvent, stampChangedWatchSets } from '@/lib/watch-set-conflict';
import {
  applyLastKnownWatchLink,
  buildWatchCapabilitySnapshot,
  resolveWatchCapabilityAccess,
  saveAppleWatchLinkedState,
} from '@/lib/device-management';

const makeDraft = (sets: ActiveWorkoutDraft['exerciseSets']): ActiveWorkoutDraft => ({
  sessionId: 'session-shared-1',
  userId: 'uid-tech',
  dayId: 'day-1',
  date: '2026-08-10',
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: 'session-shared-1',
  exerciseSets: sets,
  exerciseNotes: {},
  exerciseNames: { bench: 'Bench press' },
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1_000,
  updatedAt: 4_000,
  cloudRevision: 1,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 4,
});

const cloudWorkout = (sets: WorkoutSession['exercises'][number]['sets']): WorkoutSession => ({
  id: 'session-shared-1',
  userId: 'uid-tech',
  dayId: 'day-1',
  date: '2026-08-10',
  completed: false,
  exercises: [{ exerciseId: 'bench', name: 'Bench press', sets }],
  updatedAt: 3_000,
  revision: 2,
});

describe('cross-device sequences (X25/Z228)', () => {
  it('iOS -> Watch -> web edit -> iOS finish keeps one session and both newest sets', () => {
    const initial = [
      { reps: 8, weight: 70, completed: false },
      { reps: 8, weight: 70, completed: false },
    ];
    const watch = mergeWatchSetEvent(initial, {
      type: 'setLogged', date: '2026-08-10', dayId: 'day-1', sessionId: 'session-shared-1',
      exerciseId: 'bench', setIndex: 0, reps: 8, weight: 72.5, completed: true,
      at: 2_000, eventId: 'watch-set-0',
    }).sets;
    const web = stampChangedWatchSets(watch, [
      { ...watch[0], weight: 75 },
      watch[1],
    ], 3_000, 'web-set-0');
    const ios = stampChangedWatchSets(watch, [
      watch[0],
      { ...watch[1], weight: 77.5, completed: true },
    ], 4_000, 'ios-set-1');

    const merged = mergeDraftWithCloudWorkout(makeDraft({ bench: ios }), cloudWorkout(web));
    expect(merged.sessionId).toBe('session-shared-1');
    expect(merged.cloudRevision).toBe(2);
    expect(merged.exerciseSets.bench).toMatchObject([
      { reps: 8, weight: 75, completed: true, updatedAt: 3_000, updatedEventId: 'web-set-0' },
      { reps: 8, weight: 77.5, completed: true, updatedAt: 4_000, updatedEventId: 'ios-set-1' },
    ]);
    expect(workoutSetTotals(merged.exerciseSets)).toEqual({ completedSets: 2, volumeKg: 1220 });
  });

  it('równoległa seria telefon+Watch ma deterministyczny tie-break eventId i idempotentny replay', () => {
    const phone = stampChangedWatchSets(
      [{ reps: 5, weight: 100, completed: false }],
      [{ reps: 5, weight: 105, completed: true }],
      5_000,
      'phone-z',
    );
    const olderOrder = mergeWatchSetEvent(phone, {
      type: 'setLogged', date: '2026-08-10', dayId: 'day-1', exerciseId: 'bench',
      setIndex: 0, reps: 5, weight: 102.5, completed: true, at: 5_000, eventId: 'phone-a',
    });
    expect(olderOrder).toEqual({ sets: phone, applied: false });

    const watchWins = mergeWatchSetEvent(phone, {
      type: 'setLogged', date: '2026-08-10', dayId: 'day-1', exerciseId: 'bench',
      setIndex: 0, reps: 5, weight: 107.5, completed: true, at: 5_000, eventId: 'watch-zz',
    });
    expect(watchWins).toMatchObject({
      applied: true,
      sets: [{ weight: 107.5, updatedAt: 5_000, updatedEventId: 'watch-zz' }],
    });
    expect(mergeWatchSetEvent(watchWins.sets, {
      type: 'setLogged', date: '2026-08-10', dayId: 'day-1', exerciseId: 'bench',
      setIndex: 0, reps: 5, weight: 107.5, completed: true, at: 5_000, eventId: 'watch-zz',
    })).toEqual({ sets: watchWins.sets, applied: false });
  });

  it('reinstall telefonu rehydratuje kanoniczną sesję, po czym przyjmuje nowszy event Watch', () => {
    const cloud = cloudWorkout([
      { reps: 6, weight: 80, completed: true, updatedAt: 6_000, updatedEventId: 'pre-reinstall' },
    ]);
    const emptyAfterReinstall = makeDraft({});
    const rehydrated = mergeDraftWithCloudWorkout(emptyAfterReinstall, cloud);
    expect(rehydrated.exerciseSets.bench).toHaveLength(1);

    const afterRetry = mergeWatchSetEvent(rehydrated.exerciseSets.bench, {
      type: 'setLogged', date: '2026-08-10', dayId: 'day-1', sessionId: 'session-shared-1',
      exerciseId: 'bench', setIndex: 0, reps: 7, weight: 82.5, completed: true,
      at: 7_000, eventId: 'watch-after-reinstall',
    });
    expect(afterRetry).toMatchObject({
      applied: true,
      sets: [{ reps: 7, weight: 82.5, updatedEventId: 'watch-after-reinstall' }],
    });
  });

  it('expiry zachowuje pending i pozwala kontynuować aktywną sesję; revoke blokuje ją fail-closed', () => {
    const expired = buildWatchCapabilitySnapshot({
      isPro: false, tier: 'none', expiresAt: null, subscription: { status: 'expired' },
    });
    expect(resolveWatchCapabilityAccess(expired, true)).toEqual({
      canStartNew: false, canContinueCurrent: true, preservePending: true,
    });
    expect(resolveWatchCapabilityAccess(expired, false).canContinueCurrent).toBe(false);

    saveAppleWatchLinkedState(false);
    const revoked = applyLastKnownWatchLink({ v: 1, active: true, tier: 'yearly' });
    expect(resolveWatchCapabilityAccess(revoked, true)).toEqual({
      canStartNew: false, canContinueCurrent: false, preservePending: true,
    });
  });
});
