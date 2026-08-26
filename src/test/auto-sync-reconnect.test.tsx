import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// WP-C (X38): incydent 2026-08-26. Szybki trening właściciela został w chmurze
// skorupą revision 0 (zero ćwiczeń), zero błędów w telemetrii. AutoSync słuchał
// tylko window 'online' (WKWebView go nie wysyła) i miał bramkę navigator.onLine,
// a backoff sięgał 1 h. Ten test opisuje nowy kontrakt wyzwalaczy.

const fixtures = vi.hoisted(() => ({
  drafts: [] as unknown[],
  queue: [] as unknown[],
  syncSpy: vi.fn(async (_uid: string, sessionId: string, _kind: string): Promise<Record<string, unknown> & { success: boolean; sessionId: string }> => ({ success: true, sessionId })),
  resetBackoff: vi.fn(),
  appState: null as ((isActive: boolean) => void) | null,
  network: null as ((connected: boolean) => void) | null,
  notify: vi.fn(async () => 'in-app'),
  track: vi.fn(),
  reportError: vi.fn(async () => undefined),
  loadDraft: vi.fn(async () => null as unknown),
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1' }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    createWorkoutSession: vi.fn(),
    batchSaveWorkout: vi.fn(),
    getWorkoutSessionFromServer: vi.fn(),
    workouts: [],
    isLoaded: true,
  }),
}));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: {
    listDrafts: vi.fn(async () => fixtures.drafts),
    loadDraft: (...args: unknown[]) => fixtures.loadDraft(...(args as [])),
    markPromotedToRemote: vi.fn(),
    markDraftSynced: vi.fn(),
    setCloudBaseline: vi.fn(),
    setPendingWrite: vi.fn(),
    clearActiveDraftIfVersion: vi.fn(),
  },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: {
    list: vi.fn(() => fixtures.queue),
    markRetry: vi.fn(),
    upsertFromDraft: vi.fn(),
    remove: vi.fn(),
    resetBackoff: (...args: unknown[]) => fixtures.resetBackoff(...args),
  },
}));
vi.mock('@/lib/workout-sync-engine', () => ({
  syncWorkoutSession: (...args: unknown[]) => fixtures.syncSpy(...(args as [string, string, string])),
}));
vi.mock('@/lib/workout-sync-cleanup', () => ({
  cleanupLegacySyncLeftovers: vi.fn(async () => {}),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: (...args: unknown[]) => fixtures.track(...args) }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: (...args: unknown[]) => fixtures.reportError(...(args as [])) }));
vi.mock('@/lib/app-lifecycle', () => ({
  addAppStateListener: (cb: (isActive: boolean) => void) => {
    fixtures.appState = cb;
    return () => { fixtures.appState = null; };
  },
}));
vi.mock('@/lib/network-status', () => ({
  addNetworkListener: (cb: (connected: boolean) => void) => {
    fixtures.network = cb;
    return () => { fixtures.network = null; };
  },
}));
vi.mock('@/lib/sync-notification', () => ({
  notifyDeferredSyncSuccess: (...args: unknown[]) => fixtures.notify(...(args as [])),
}));

import { AutoSyncOnReconnect, AUTO_SYNC_FOREGROUND_INTERVAL_MS } from '@/components/AutoSyncOnReconnect';
import { WORKOUT_SYNC_REQUESTED_EVENT, WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';

const finalDraft = (over: Record<string, unknown> = {}) => ({
  sessionId: 's-final',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-26',
  dayName: 'Szybki trening',
  dirty: true,
  sessionOrigin: 'remote',
  completedLocally: true,
  finalSyncPending: true,
  finalizedAt: Date.now() - 5 * 60_000,
  version: 3,
  updatedAt: Date.now(),
  exerciseSets: {},
  ...over,
});

const renderComponent = () =>
  render(createElement(LanguageProvider, null, createElement(AutoSyncOnReconnect)));

const flush = () => new Promise((resolve) => setTimeout(resolve, 30));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  fixtures.drafts = [];
  fixtures.queue = [];
  fixtures.syncSpy.mockReset();
  fixtures.syncSpy.mockImplementation(async (_uid: string, sessionId: string) => ({ success: true, sessionId }));
  fixtures.resetBackoff.mockClear();
  fixtures.notify.mockClear();
  fixtures.track.mockClear();
  fixtures.reportError.mockClear();
  fixtures.loadDraft.mockReset();
  fixtures.loadDraft.mockImplementation(async () => null);
  fixtures.appState = null;
  fixtures.network = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WP-C (X38): wyzwalacze AutoSync', () => {
  it('bez bramki navigator.onLine: próba idzie mimo onLine=false (silnik decyduje)', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fixtures.drafts = [finalDraft()];
    fixtures.syncSpy.mockImplementation(async (_uid: string, sessionId: string) => ({ success: false, error: 'OFFLINE', sessionId }));

    renderComponent();

    await waitFor(() => expect(fixtures.syncSpy).toHaveBeenCalledTimes(1));
    // Offline to stan, nie bug: bez client_errors, ale licznik prób rośnie.
    expect(fixtures.reportError).not.toHaveBeenCalled();
    expect(fixtures.track).toHaveBeenCalledWith('u1', 'sync_retry_auto', 1);
  });

  it('każdy realny wyzwalacz (online, resume, network) uruchamia bieg i zeruje backoff; timer nie zeruje', async () => {
    fixtures.drafts = [finalDraft()];
    fixtures.syncSpy.mockImplementation(async (_uid: string, sessionId: string) => ({ success: false, error: 'OFFLINE', sessionId }));
    renderComponent();
    await waitFor(() => expect(fixtures.syncSpy).toHaveBeenCalledTimes(1));
    expect(fixtures.resetBackoff).toHaveBeenCalledTimes(1); // start = realne zdarzenie

    await act(async () => { window.dispatchEvent(new Event('online')); await flush(); });
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(2);
    expect(fixtures.resetBackoff).toHaveBeenCalledTimes(2);

    await act(async () => { fixtures.appState?.(true); await flush(); });
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(3);
    expect(fixtures.resetBackoff).toHaveBeenCalledTimes(3);

    await act(async () => { fixtures.network?.(true); await flush(); });
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(4);
    expect(fixtures.resetBackoff).toHaveBeenCalledTimes(4);

    // Przejście w tło / utrata sieci nie uruchamiają biegu.
    await act(async () => { fixtures.appState?.(false); fixtures.network?.(false); await flush(); });
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(4);
  });

  it('prośba z WorkoutDay (WORKOUT_SYNC_REQUESTED_EVENT) uruchamia bieg natychmiast', async () => {
    renderComponent();
    await flush();
    expect(fixtures.syncSpy).not.toHaveBeenCalled();

    fixtures.drafts = [finalDraft()];
    await act(async () => { window.dispatchEvent(new Event(WORKOUT_SYNC_REQUESTED_EVENT)); await flush(); });
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(1);
    expect((fixtures.syncSpy.mock.calls[0] as unknown[])[2]).toBe('final');
  });

  it('timer foreground (45 s) ponawia, gdy kolejka niepusta, i nie zeruje backoffu', async () => {
    vi.useFakeTimers();
    fixtures.drafts = [finalDraft()];
    fixtures.syncSpy.mockImplementation(async (_uid: string, sessionId: string) => ({ success: false, error: 'OFFLINE', sessionId }));
    renderComponent();
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(1);
    fixtures.resetBackoff.mockClear();

    await act(async () => { await vi.advanceTimersByTimeAsync(AUTO_SYNC_FOREGROUND_INTERVAL_MS + 10); });
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(2);
    expect(fixtures.resetBackoff).not.toHaveBeenCalled();
  });

  it('brak podwójnego biegu: zdarzenie w trakcie syncu = jeden dodatkowy przebieg po zakończeniu', async () => {
    fixtures.drafts = [finalDraft()];
    let release: (() => void) | null = null;
    fixtures.syncSpy.mockImplementationOnce((_uid: string, sessionId: string) => new Promise((resolve) => {
      release = () => resolve({ success: false, error: 'OFFLINE', sessionId });
    }));
    fixtures.syncSpy.mockImplementation(async (_uid: string, sessionId: string) => ({ success: false, error: 'OFFLINE', sessionId }));
    renderComponent();
    await waitFor(() => expect(fixtures.syncSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      fixtures.appState?.(true);
      fixtures.network?.(true);
      await flush();
    });
    // Sync w toku: żadnych równoległych wywołań.
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(1);

    await act(async () => { release?.(); await flush(); });
    // Trzy sygnały w trakcie biegu = dokładnie jeden przebieg dogrywkowy.
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(2);
  });

  it('udany odroczony final: bez toastu "zsynchronizowano n", za to sygnał per sesja + licznik + event stanu', async () => {
    const draft = finalDraft();
    fixtures.drafts = [draft];
    fixtures.loadDraft.mockImplementation(async () => draft);
    const stateChanged = vi.fn();
    window.addEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, stateChanged);
    fixtures.syncSpy.mockImplementation(async (_uid: string, sessionId: string) => {
      fixtures.drafts = [];
      return { success: true, sessionId };
    });

    renderComponent();

    await waitFor(() => expect(fixtures.notify).toHaveBeenCalledTimes(1));
    const [uid, info] = fixtures.notify.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(uid).toBe('u1');
    expect(info).toMatchObject({ sessionId: 's-final', dayId: 'day-1', date: '2026-08-26', dayName: 'Szybki trening', finalizedAt: draft.finalizedAt });
    expect(fixtures.track).toHaveBeenCalledWith('u1', 'sync_success_deferred');
    expect(stateChanged).toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('Zsynchronizowano');
    window.removeEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, stateChanged);
  });

  it('timeout silnika: licznik sync_timeout + client_errors code timeout, wpis zostaje na retry', async () => {
    fixtures.drafts = [finalDraft()];
    fixtures.syncSpy.mockImplementation(async (_uid: string, sessionId: string) => ({
      success: false,
      error: 'final-save timed out after 30000 ms',
      sessionId,
    }));

    renderComponent();

    await waitFor(() => expect(fixtures.reportError).toHaveBeenCalledTimes(1));
    expect((fixtures.reportError.mock.calls[0] as unknown[])[1]).toMatchObject({ code: 'timeout', phase: 'final' });
    expect(fixtures.track).toHaveBeenCalledWith('u1', 'sync_timeout');
  });

  it('cloudUnconfirmed po zatwierdzonym commicie = sukces (sygnał + ślad w client_errors), nie retry', async () => {
    const draft = finalDraft();
    fixtures.drafts = [draft];
    fixtures.loadDraft.mockImplementation(async () => draft);
    fixtures.syncSpy.mockImplementation(async (_uid: string, sessionId: string) => {
      fixtures.drafts = [];
      return { success: true, sessionId, cloudUnconfirmed: true, unconfirmedReason: 'read-failed: offline' };
    });

    renderComponent();

    await waitFor(() => expect(fixtures.notify).toHaveBeenCalledTimes(1));
    expect(fixtures.reportError).toHaveBeenCalledTimes(1);
    expect((fixtures.reportError.mock.calls[0] as unknown[])[1]).toMatchObject({ code: 'validation', phase: 'final' });
    expect(fixtures.track).toHaveBeenCalledWith('u1', 'sync_validation_failed');
  });
});
