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
  },
}));
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
});
