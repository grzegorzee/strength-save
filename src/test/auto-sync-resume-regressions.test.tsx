import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const f = vi.hoisted(() => ({
  uid: 'user-a',
  drafts: [] as ActiveWorkoutDraft[],
  list: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  toast: vi.fn(),
  t: (key: string) => key,
  network: null as ((connected: boolean) => void) | null,
  appState: null as ((active: boolean) => void) | null,
}));

vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({ uid: f.uid }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ t: f.t }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: f.toast }) }));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ createWorkoutSession: f.create, batchSaveWorkout: f.save, getWorkoutSessionFromServer: f.get, workouts: [], isLoaded: true }),
}));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: {
    listDrafts: (...args: unknown[]) => f.list(...args),
    loadDraft: vi.fn(async (uid, id) => f.drafts.find(d => d.userId === uid && d.sessionId === id) ?? null),
    markPromotedToRemote: vi.fn(async (uid, remoteId, oldId) => {
      f.drafts = f.drafts.map(d => d.userId === uid && d.sessionId === oldId
        ? { ...d, sessionId: remoteId, remoteSessionId: remoteId, sessionOrigin: 'remote', cloudRevision: 0 } : d);
    }),
    markDraftSynced: vi.fn(async (uid, _at, version, id) => {
      f.drafts = f.drafts.map(d => d.userId === uid && d.sessionId === id && d.version === version ? { ...d, dirty: false } : d);
    }),
    setCloudBaseline: vi.fn(async () => undefined),
    setPendingWrite: vi.fn(async () => undefined),
    markHealthWritePending: vi.fn(async () => undefined),
    clearActiveDraftIfVersion: vi.fn(async () => true),
  },
}));
vi.mock('@/lib/workout-sync-engine', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/workout-sync-engine')>();
  return { ...real, syncWorkoutSession: vi.fn(real.syncWorkoutSession) };
});
vi.mock('@/lib/workout-sync-cleanup', () => ({ cleanupLegacySyncLeftovers: vi.fn(async () => undefined) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn(async () => undefined) }));
vi.mock('@/lib/sync-notification', () => ({ notifyDeferredSyncSuccess: vi.fn(async () => undefined) }));
vi.mock('@/lib/network-status', () => ({ addNetworkListener: (cb: typeof f.network) => { f.network = cb; return () => { f.network = null; }; } }));
vi.mock('@/lib/app-lifecycle', () => ({ addAppStateListener: (cb: typeof f.appState) => { f.appState = cb; return () => { f.appState = null; }; } }));

import { AutoSyncOnReconnect } from '@/components/AutoSyncOnReconnect';
import { syncWorkoutSession } from '@/lib/workout-sync-engine';

const draft = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  userId: 'user-a', sessionId: 'session-a', dayId: 'day-a', date: '2026-09-09', cycleId: null,
  sessionOrigin: 'remote', remoteSessionId: 'session-a', cloudRevision: 0,
  exerciseSets: { squat: [{ weight: 50, reps: 5, completed: true }] },
  exerciseNotes: {}, exerciseMetrics: {}, exerciseNames: { squat: 'Squat' }, dayNotes: '', skippedExercises: [],
  startedAt: 1, updatedAt: 2, lastFirebaseSyncAt: null, dirty: true, completedLocally: false,
  finalSyncPending: false, version: 1, ...over,
});
const view = (path = '/') => <MemoryRouter initialEntries={[path]}><AutoSyncOnReconnect /></MemoryRouter>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  f.uid = 'user-a';
  f.drafts = [];
  f.list.mockReset().mockImplementation(async (uid: string) => f.drafts.filter(d => d.userId === uid));
  f.save.mockReset().mockResolvedValue({ success: true, revision: 1, updatedAt: 3, health: 'none' });
  f.create.mockReset().mockResolvedValue({ session: { id: 'remote-a', revision: 0, updatedAt: 1 } });
  f.get.mockReset().mockResolvedValue(null);
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('automatic sync outside the live workout, using the real engine', () => {
  it('sends a dirty remote draft from Dashboard as a checkpoint and preserves the workout', async () => {
    f.drafts = [draft()];
    render(view());
    await waitFor(() => expect(f.save).toHaveBeenCalledTimes(1));
    expect(vi.mocked(syncWorkoutSession).mock.calls[0].slice(0, 3)).toEqual(['user-a', 'session-a', 'checkpoint']);
    expect(f.save.mock.calls[0][2]).not.toHaveProperty('completed');
    expect(f.drafts).toHaveLength(1);
    expect(f.drafts[0].exerciseSets.squat).toHaveLength(1);
  });

  it('leaves a live WorkoutDay remote checkpoint to the screen that owns it', async () => {
    f.drafts = [draft()];
    render(view('/workout/day-a'));
    await act(async () => { await Promise.resolve(); });
    expect(f.save).not.toHaveBeenCalled();
  });

  it('promotes an offline start after native reconnect despite stale navigator.onLine=false', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(view());
    await act(async () => { await Promise.resolve(); });
    f.drafts = [draft({ sessionOrigin: 'provisional', remoteSessionId: null })];
    await act(async () => { f.network?.(true); });
    await waitFor(() => expect(f.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(f.save).toHaveBeenCalledTimes(1));
    expect(f.drafts[0].sessionOrigin).toBe('remote');
  });

  it('locks before the asynchronous draft scan and coalesces reconnect/resume events', async () => {
    let finish!: (value: ActiveWorkoutDraft[]) => void;
    f.drafts = [draft({ sessionOrigin: 'provisional', remoteSessionId: null })];
    f.list.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(view());
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      f.appState?.(true);
      f.network?.(true);
      await Promise.resolve();
    });
    expect(f.list).toHaveBeenCalledTimes(1);
    await act(async () => { finish(f.drafts); });
    await waitFor(() => expect(f.save).toHaveBeenCalledTimes(1));
  });

  it('starts the new owner queue even while the previous owner attempt is settling', async () => {
    let finish!: (value: { success: boolean; error: string }) => void;
    f.drafts = [draft({ sessionOrigin: 'provisional', remoteSessionId: null })];
    f.save.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const rendered = render(view());
    await waitFor(() => expect(f.save).toHaveBeenCalledTimes(1));
    f.uid = 'user-b';
    f.drafts.push(draft({ userId: 'user-b', sessionId: 'session-b', sessionOrigin: 'provisional', remoteSessionId: null }));
    f.create.mockResolvedValue({ session: { id: 'remote-b', revision: 0, updatedAt: 1 } });
    rendered.rerender(view());
    await act(async () => { finish({ success: false, error: 'OFFLINE' }); });
    await waitFor(() => expect(f.save).toHaveBeenCalledTimes(2));
    expect(f.save.mock.calls[1][0]).toBe('remote-b');
  });
});
