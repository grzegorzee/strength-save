import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'account-a' } },
  ready: Promise.resolve(),
  sent: [] as Array<{ authenticatedUid: string; workoutOwner: unknown; expectedOwnerUid: string }>,
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
vi.mock('@/lib/firebase', () => ({
  auth: state.auth,
  functions: {},
  get appCheckReady() { return state.ready; },
}));
vi.mock('firebase/functions', () => ({
  // Firebase SDK chooses the token when invoking the callable, after our
  // appCheckReady wait. This reproduces that boundary, without any network.
  httpsCallable: () => async (data: { expectedOwnerUid: string; workout: { id: string; userId: unknown } }) => {
    state.sent.push({ authenticatedUid: state.auth.currentUser.uid, workoutOwner: data.workout.userId, expectedOwnerUid: data.expectedOwnerUid });
    return { data: { status: 'restored', workoutId: data.workout.id } };
  },
}));

import { restoreWorkoutBackupV3Item } from '@/lib/workout-restore-v3';

beforeEach(() => {
  state.sent = [];
  state.ready = Promise.resolve();
  state.auth.currentUser = { uid: 'account-a' };
});

it('CSV import cannot send account A data using account B auth after waiting for App Check', async () => {
  let release: () => void = () => undefined;
  state.ready = new Promise<void>((resolve) => { release = resolve; });
  state.auth.currentUser = { uid: 'account-a' };
  // importCsvSessions checks this owner immediately before calling restore.
  expect(state.auth.currentUser.uid).toBe('account-a');
  const operation = restoreWorkoutBackupV3Item({ workout: {
    id: 'imported-account-a-batch-1', userId: 'account-a',
    dayId: 'imported-account-a-batch-1', date: '2026-09-06', completed: true,
    exercises: [{ exerciseId: 'squat', sets: [{ reps: 5, weight: 100, completed: true }] }],
  } }, null, 'restore-12345678', 'account-a');
  state.auth.currentUser = { uid: 'account-b' };
  release();
  await expect(operation).rejects.toThrow('CALLABLE_ACCOUNT_CHANGED');
  expect(state.sent).toEqual([]);
});

it('an explicitly selected old-owner backup imports into the captured current account', async () => {
  await expect(restoreWorkoutBackupV3Item({ workout: {
    id: 'backup-workout', userId: 'exported-owner', dayId: 'backup-day',
    date: '2026-09-06', completed: true,
    exercises: [{ exerciseId: 'squat', sets: [{ reps: 5, weight: 100, completed: true }] }],
  } }, null, 'restore-12345678', 'account-a')).resolves.toMatchObject({ status: 'restored' });
  expect(state.sent).toEqual([{ authenticatedUid: 'account-a', workoutOwner: 'exported-owner', expectedOwnerUid: 'account-a' }]);
});
