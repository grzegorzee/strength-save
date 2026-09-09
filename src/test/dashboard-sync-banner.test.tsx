import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  t: (key: string) => ({
    'dash.sync.compact.saved': 'Zapisano na telefonie',
    'dash.sync.compact.retry': 'Synchronizuj teraz',
    'dash.sync.compact.syncing': 'Synchronizowanie…',
    'dash.sync.compact.failed': 'Zapis nadal czeka na synchronizację',
    'dash.sync.compact.attention': 'Zapis wymaga sprawdzenia',
    'dash.sync.compact.resolve': 'Rozwiąż problem',
  })[key] ?? key,
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
    clearActiveDraftIfVersion: vi.fn(async (uid, id, version) => {
      const found = f.drafts.find(d => d.userId === uid && d.sessionId === id);
      if (found && found.version > version) return false;
      f.drafts = f.drafts.filter(d => d.userId !== uid || d.sessionId !== id);
      return true;
    }),
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

import { DashboardSyncBanner } from '@/components/DashboardSyncBanner';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';

const draft = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  userId: 'user-a', sessionId: 'session-a', dayId: 'day-a', date: '2026-09-09', cycleId: null,
  sessionOrigin: 'remote', remoteSessionId: 'session-a', cloudRevision: 0,
  exerciseSets: { squat: [{ weight: 50, reps: 5, completed: true }] },
  exerciseNotes: {}, exerciseMetrics: {}, exerciseNames: { squat: 'Squat' }, dayNotes: '', skippedExercises: [],
  startedAt: 1, updatedAt: 2, lastFirebaseSyncAt: null, dirty: true, completedLocally: false,
  finalSyncPending: false, version: 1, ...over,
});
const openRecovery = vi.fn();
const view = () => <DashboardSyncBanner uid={f.uid} onOpenSyncCenter={openRecovery} />;

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


describe('Dashboard direct retry with the real durable sync engine', () => {
  it('retries a remote checkpoint directly; failure retains the workout and the retry action', async () => {
    f.drafts = [draft()];
    f.save.mockResolvedValue({ success: false, error: 'OFFLINE' });
    render(view());
    fireEvent.click(await screen.findByRole('button', { name: 'Synchronizuj teraz' }));
    await waitFor(() => expect(f.save).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Synchronizuj teraz' })).toBeEnabled());
    expect(f.save.mock.calls[0][2]).not.toHaveProperty('completed');
    expect(f.drafts[0].exerciseSets.squat).toEqual([{ weight: 50, reps: 5, completed: true }]);
    expect(workoutSyncQueue.list('user-a')).toHaveLength(1);
    expect(openRecovery).not.toHaveBeenCalled();
    expect(screen.getByTestId('dashboard-sync-banner')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss|zamknij|ukryj|centrum/i })).toBeNull();
  });

  it('keeps finalized data until the full acknowledgement; double tap produces one save', async () => {
    let finish!: (value: object) => void;
    f.drafts = [draft({ completedLocally: true, finalSyncPending: true })];
    workoutSyncQueue.upsertFromDraft(f.drafts[0]);
    f.save.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(view());
    const retry = await screen.findByRole('button', { name: 'Synchronizuj teraz' });
    fireEvent.click(retry);
    fireEvent.click(retry);
    await waitFor(() => expect(f.save).toHaveBeenCalledOnce());
    expect(f.drafts).toHaveLength(1);
    expect(workoutSyncQueue.list('user-a')).toHaveLength(1);
    expect(workoutDraftDb.clearActiveDraftIfVersion).not.toHaveBeenCalled();
    await act(async () => { finish({ success: true, revision: 1, updatedAt: 3, health: 'none' }); });
    await waitFor(() => expect(screen.queryByTestId('dashboard-sync-banner')).toBeNull());
    expect(f.drafts).toHaveLength(0);
    expect(workoutSyncQueue.list('user-a')).toHaveLength(0);
  });

  it('retains the banner and metrics when the base write succeeds but health ACK is pending', async () => {
    f.drafts = [draft({ finalSyncPending: true, exerciseMetrics: { squat: { rpe: 8 } } })];
    f.save.mockResolvedValue({ success: true, revision: 1, health: 'pending' });
    render(view());
    fireEvent.click(await screen.findByRole('button', { name: 'Synchronizuj teraz' }));
    await waitFor(() => expect(f.save).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Synchronizuj teraz' })).toBeEnabled());
    expect(f.drafts[0].exerciseMetrics.squat.rpe).toBe(8);
    expect(workoutSyncQueue.list('user-a')).toHaveLength(1);
    expect(workoutDraftDb.clearActiveDraftIfVersion).not.toHaveBeenCalled();
  });

  it('preserves the conflict baseline and offers an explicit recovery only after a conflict', async () => {
    f.drafts = [draft({ cloudRevision: 7 })];
    f.save.mockResolvedValue({ success: false, error: 'WORKOUT_CONFLICT' });
    render(view());
    fireEvent.click(await screen.findByRole('button', { name: 'Synchronizuj teraz' }));
    const resolve = await screen.findByRole('button', { name: 'Rozwiąż problem' });
    expect(f.save.mock.calls[0][2].expectedRevision).toBe(7);
    expect(workoutDraftDb.setCloudBaseline).not.toHaveBeenCalled();
    expect(f.drafts).toHaveLength(1);
    expect(openRecovery).not.toHaveBeenCalled();
    fireEvent.click(resolve);
    expect(openRecovery).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Synchronizuj teraz' })).toBeEnabled();
  });

  it('allows a deliberate retry for a permanent queue failure and keeps the active workout after checkpoint ACK', async () => {
    f.drafts = [draft()];
    workoutSyncQueue.upsertFromDraft(f.drafts[0]);
    workoutSyncQueue.markRetry('user-a', 'session-a', 'permission-denied');
    expect(workoutSyncQueue.list('user-a')[0].permanent).toBe(true);
    render(view());
    fireEvent.click(await screen.findByRole('button', { name: 'Synchronizuj teraz' }));
    await waitFor(() => expect(f.save).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByTestId('dashboard-sync-banner')).toBeNull());
    expect(f.drafts).toHaveLength(1);
    expect(f.drafts[0].exerciseSets.squat).toHaveLength(1);
  });

  it('does not call a clean active draft an unsynced workout', async () => {
    f.drafts = [draft({ dirty: false })];
    render(view());
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByTestId('dashboard-sync-banner')).toBeNull();
  });

  it('does not let an old account ACK clear the new account or keep its retry disabled', async () => {
    let finish!: (value: object) => void;
    f.drafts = [draft({ finalSyncPending: true })];
    f.save.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const rendered = render(view());
    fireEvent.click(await screen.findByRole('button', { name: 'Synchronizuj teraz' }));
    await waitFor(() => expect(f.save).toHaveBeenCalledOnce());
    f.uid = 'user-b';
    f.drafts.push(draft({ userId: 'user-b', sessionId: 'session-b' }));
    rendered.rerender(view());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Synchronizuj teraz' })).toBeEnabled());
    await act(async () => { finish({ success: true, revision: 1, updatedAt: 3, health: 'none' }); });
    expect(f.drafts.find(d => d.userId === 'user-b')?.exerciseSets.squat).toHaveLength(1);
    expect(workoutDraftDb.clearActiveDraftIfVersion).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Synchronizuj teraz' })).toBeEnabled();
  });
});
