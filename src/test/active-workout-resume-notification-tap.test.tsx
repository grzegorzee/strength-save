import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ActiveWorkoutResume } from '@/components/ActiveWorkoutResume';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { formatLocalDate } from '@/lib/utils';

// Bug 53 (X30): tap w powiadomienie "Koniec przerwy" nie prowadził do treningu.
// Online wyjście w tło robi checkpoint (dirty=false), więc auto-resume
// (shouldResumeWorkoutDraft, isAlive = dirty || provisional) odmawiał, a cold
// start lądował na Dashboardzie. Listener localNotificationActionPerformed
// dla id 90001 nawiguje do kontynuowalnego dzisiejszego draftu (ta sama,
// łagodniejsza reguła co karta Dashboardu: isDraftContinuableToday).

const TODAY = formatLocalDate(new Date());

const mocks = vi.hoisted(() => ({
  loadActiveDraft: vi.fn(async (_uid: string): Promise<unknown> => null),
  tapCallback: null as (() => void) | null,
  appStateCallback: null as ((isActive: boolean) => void) | null,
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1' }),
}));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { loadActiveDraft: (uid: string) => mocks.loadActiveDraft(uid) },
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/app-lifecycle', () => ({
  addAppStateListener: (cb: (isActive: boolean) => void) => {
    mocks.appStateCallback = cb;
    return () => { mocks.appStateCallback = null; };
  },
}));
vi.mock('@/lib/rest-notification', () => ({
  addRestNotificationTapListener: (cb: () => void) => {
    mocks.tapCallback = cb;
    return () => { mocks.tapCallback = null; };
  },
}));

const makeDraft = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 'workout-u1-day-1-today',
  userId: 'u1',
  dayId: 'day-1',
  date: TODAY,
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: 'workout-u1-day-1-today',
  exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: Date.now() - 30 * 60 * 1000,
  updatedAt: Date.now() - 5 * 60 * 1000,
  lastFirebaseSyncAt: Date.now() - 5 * 60 * 1000,
  // Po checkpoincie przy wyjściu w tło (online): zsynchronizowany, NIE dirty.
  dirty: false,
  completedLocally: false,
  finalSyncPending: false,
  version: 3,
  ...over,
});

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
};

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <ActiveWorkoutResume />
    <LocationProbe />
  </MemoryRouter>,
);

const flush = async () => {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

beforeEach(() => {
  mocks.loadActiveDraft.mockReset();
  mocks.loadActiveDraft.mockResolvedValue(null);
  mocks.tapCallback = null;
  mocks.appStateCallback = null;
});

describe('ActiveWorkoutResume: tap w powiadomienie końca przerwy (bug 53, X30)', () => {
  it('zsynchronizowany dzisiejszy draft (dirty=false): auto-resume NIE wraca, ale tap w powiadomienie prowadzi do treningu', async () => {
    mocks.loadActiveDraft.mockResolvedValue(makeDraft());
    renderAt('/');
    await flush();
    // Niezmiennik: auto-resume zostaje ostrzejszy (dirty=false = brak auto-nawigacji).
    expect(screen.getByTestId('location')).toHaveTextContent('/');
    expect(mocks.tapCallback).not.toBeNull();

    act(() => { mocks.tapCallback?.(); });
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        `/workout/day-1?date=${TODAY}&session=workout-u1-day-1-today`,
      );
    });
  });

  it('tap na ekranie treningu: bez ponownej nawigacji (nie walczymy z bieżącą trasą)', async () => {
    mocks.loadActiveDraft.mockResolvedValue(makeDraft());
    renderAt('/workout/day-1?date=x&session=s');
    await flush();

    act(() => { mocks.tapCallback?.(); });
    await flush();
    expect(screen.getByTestId('location')).toHaveTextContent('/workout/day-1?date=x&session=s');
  });

  it('brak kontynuowalnego draftu (ukończony lokalnie): tap zostawia usera tam, gdzie jest', async () => {
    mocks.loadActiveDraft.mockResolvedValue(makeDraft({ completedLocally: true }));
    renderAt('/');
    await flush();

    act(() => { mocks.tapCallback?.(); });
    await flush();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('draft z innego dnia: tap nie nawiguje (reguła karty Dashboardu: tylko dzisiejszy)', async () => {
    mocks.loadActiveDraft.mockResolvedValue(makeDraft({ date: '2020-01-01' }));
    renderAt('/');
    await flush();

    act(() => { mocks.tapCallback?.(); });
    await flush();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('niezmiennik Z49: żywy (dirty) draft nadal wraca automatycznie na mount, bez tapu', async () => {
    mocks.loadActiveDraft.mockResolvedValue(makeDraft({ dirty: true }));
    renderAt('/');
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/workout/day-1?');
    });
  });
});
