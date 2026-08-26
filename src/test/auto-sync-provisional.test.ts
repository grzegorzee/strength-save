import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Z175: sesja provisional (start offline) musi promować się po powrocie online
// TAKŻE bez wchodzenia w ekran treningu. Build 80: filtr AutoSyncOnReconnect
// przepuszczał wyłącznie finalSyncPending, więc baner "rozpoczęty offline"
// wisiał na Dashboardzie mimo 5G aż do wejścia w trening.

const fixtures = vi.hoisted(() => ({
  drafts: [] as unknown[],
  queue: [] as unknown[],
  syncSpy: vi.fn(async (_uid: string, sessionId: string) => ({ success: true, sessionId })),
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
    loadDraft: vi.fn(async () => null),
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
    // WP-C (X38): no-op w tym teście — backoff z fixtures ma zostać (test bug 37).
    resetBackoff: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock('@/lib/sync-notification', () => ({ notifyDeferredSyncSuccess: vi.fn(async () => 'none') }));
vi.mock('@/lib/app-lifecycle', () => ({ addAppStateListener: () => () => {} }));
vi.mock('@/lib/network-status', () => ({ addNetworkListener: () => () => {} }));
vi.mock('@/lib/workout-sync-engine', () => ({
  syncWorkoutSession: (...args: unknown[]) => fixtures.syncSpy(...(args as [string, string])),
}));
vi.mock('@/lib/workout-sync-cleanup', () => ({
  cleanupLegacySyncLeftovers: vi.fn(async () => {}),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));

import { AutoSyncOnReconnect } from '@/components/AutoSyncOnReconnect';

const draft = (over: Record<string, unknown> = {}) => ({
  sessionId: 's1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-03',
  dirty: true,
  sessionOrigin: 'provisional',
  completedLocally: false,
  finalSyncPending: false,
  version: 3,
  updatedAt: Date.now(),
  exerciseSets: {},
  ...over,
});

const renderComponent = () =>
  render(createElement(LanguageProvider, null, createElement(AutoSyncOnReconnect)));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  fixtures.drafts = [];
  fixtures.queue = [];
  fixtures.syncSpy.mockClear();
});

describe('Z175: AutoSyncOnReconnect promuje provisional bez wchodzenia w trening', () => {
  it('draft provisional (dirty, bez finalSyncPending) → syncWorkoutSession kind=checkpoint', async () => {
    fixtures.drafts = [draft()];
    renderComponent();

    await waitFor(() => expect(fixtures.syncSpy).toHaveBeenCalled());
    const call = fixtures.syncSpy.mock.calls[0] as unknown[];
    expect(call[0]).toBe('u1');
    expect(call[1]).toBe('s1');
    expect(call[2]).toBe('checkpoint');
  });

  it('niezmiennik: dirty draft remote BEZ finalSyncPending nie jest ruszany (obsługuje go WorkoutDay)', async () => {
    fixtures.drafts = [draft({ sessionOrigin: 'remote' })];
    renderComponent();

    // Daj efektowi się wykonać, potem asercja negatywna.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fixtures.syncSpy).not.toHaveBeenCalled();
  });

  it('niezmiennik: finalSyncPending dalej idzie jako final', async () => {
    fixtures.drafts = [draft({ sessionOrigin: 'remote', finalSyncPending: true, completedLocally: true })];
    renderComponent();

    await waitFor(() => expect(fixtures.syncSpy).toHaveBeenCalled());
    expect((fixtures.syncSpy.mock.calls[0] as unknown[])[2]).toBe('final');
  });

  it('bug 37 (X30): wpis w oknie backoffu (retryCount + swiezy lastErrorAt) nie jest auto-ponawiany (resetBackoff zamockowany jako no-op)', async () => {
    const finalDraft = draft({ sessionOrigin: 'remote', finalSyncPending: true, completedLocally: true });
    fixtures.drafts = [];
    fixtures.queue = [{
      ...finalDraft,
      queueId: finalDraft.sessionId,
      enqueuedAt: Date.now(),
      retryCount: 3,
      lastError: 'CLOUD_NOT_CONFIRMED: brak potwierdzenia',
      // WP-C (X38): okno jittera moze byc krotkie; 200 ms jest ponizej dolnej granicy 1 s.
      lastErrorAt: Date.now() - 200,
    }];
    renderComponent();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fixtures.syncSpy).not.toHaveBeenCalled();
  });

  it('offline kill → launch offline → reconnect synchronizuje final dokładnie raz mimo kopii w kolejce', async () => {
    const finalDraft = draft({
      sessionOrigin: 'remote',
      finalSyncPending: true,
      completedLocally: true,
    });
    fixtures.drafts = [finalDraft];
    fixtures.queue = [{
      ...finalDraft,
      queueId: finalDraft.sessionId,
      enqueuedAt: Date.now(),
      retryCount: 0,
      lastError: null,
      lastErrorAt: null,
    }];
    // WP-C (X38): bez bramki navigator.onLine — próba idzie od razu (silnik
    // sam mówi OFFLINE), a po 'online' final leci dokładnie raz mimo kopii w kolejce.
    fixtures.syncSpy
      .mockImplementationOnce(async (_uid: string, sessionId: string) => ({ success: false, error: 'OFFLINE', sessionId }))
      .mockImplementationOnce(async (_uid: string, sessionId: string) => {
        // Realny silnik po potwierdzonym final usuwa draft i odpowiadający wpis kolejki.
        fixtures.drafts = [];
        fixtures.queue = [];
        return { success: true, sessionId };
      });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    renderComponent();

    await waitFor(() => expect(fixtures.syncSpy).toHaveBeenCalledTimes(1));
    expect((fixtures.syncSpy.mock.calls[0] as unknown[]).slice(0, 3)).toEqual(['u1', 's1', 'final']);

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    window.dispatchEvent(new Event('online'));

    await waitFor(() => expect(fixtures.syncSpy).toHaveBeenCalledTimes(2));
    expect((fixtures.syncSpy.mock.calls[1] as unknown[]).slice(0, 3)).toEqual(['u1', 's1', 'final']);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(fixtures.syncSpy).toHaveBeenCalledTimes(2);
  });
});
