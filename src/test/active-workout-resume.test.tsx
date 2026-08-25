import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { formatLocalDate } from '@/lib/utils';

// Bug 27 (X30): auto-resume (Z49) deklarował "świadome wyjście z treningu =
// nie wracamy", ale jedynym guardem listenera background->active był pathname
// startsWith('/workout/'). Po WP-D (bottom nav widoczny w sesji) każde wyjście
// z treningu + zgaszenie ekranu kończyło się wrzuceniem usera z powrotem
// w ekran treningu przy unlocku.

const lifecycle = vi.hoisted(() => ({
  listener: null as null | ((isActive: boolean) => void),
}));

vi.mock('@/lib/app-lifecycle', () => ({
  addAppStateListener: (cb: (isActive: boolean) => void) => {
    lifecycle.listener = cb;
    return () => { lifecycle.listener = null; };
  },
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1' }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));

const draftFixture = vi.hoisted(() => ({ draft: null as unknown }));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => draftFixture.draft) },
}));

import { ActiveWorkoutResume } from '@/components/ActiveWorkoutResume';

const todayStr = () => formatLocalDate(new Date());

const aliveDraft = () => ({
  sessionId: 's1',
  userId: 'u1',
  dayId: 'day-1',
  date: todayStr(),
  dirty: true,
  sessionOrigin: 'remote',
  completedLocally: false,
  finalSyncPending: false,
  updatedAt: Date.now(),
});

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
};

const WorkoutScreen = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/settings')}>wyjdz-nav</button>
  );
};

const renderApp = (initialPath = '/settings') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ActiveWorkoutResume />
      <LocationProbe />
      <Routes>
        <Route path="/settings" element={<div>Ustawienia</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/workout/:dayId" element={<WorkoutScreen />} />
      </Routes>
    </MemoryRouter>,
  );

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  lifecycle.listener = null;
  draftFixture.draft = aliveDraft();
});

describe('ActiveWorkoutResume (bug 27)', () => {
  it('niezmiennik Z49: zimny start z żywym draftem wraca do treningu (resume mountowy)', async () => {
    renderApp('/settings');
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/workout/day-1'));
  });

  it('bug 27: świadome wyjście z treningu + zgaszenie/zapalenie ekranu NIE wrzuca usera z powrotem w trening', async () => {
    renderApp('/settings');
    // Mount resume: user ląduje w treningu (zimny start, zamierzone Z49).
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/workout/day-1'));

    // Świadome wyjście z treningu bottom navem (WP-D).
    fireEvent.click(screen.getByText('wyjdz-nav'));
    expect(screen.getByTestId('path').textContent).toBe('/settings');

    // Ekran gaśnie na /settings i user odblokowuje telefon.
    act(() => { lifecycle.listener?.(false); });
    act(() => { lifecycle.listener?.(true); });
    await flush();

    expect(screen.getByTestId('path').textContent).toBe('/settings');
  });

  it('niezmiennik: zejście do tła NA ekranie treningu nadal pozwala listenerowi wznowić po resecie trasy', async () => {
    renderApp('/settings');
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/workout/day-1'));

    // Tło z ekranu treningu; w tle iOS resetuje trasę (symulacja: nawigacja na /).
    act(() => { lifecycle.listener?.(false); });
    fireEvent.click(screen.getByText('wyjdz-nav'));
    expect(screen.getByTestId('path').textContent).toBe('/settings');

    act(() => { lifecycle.listener?.(true); });
    await flush();

    expect(screen.getByTestId('path').textContent).toBe('/workout/day-1');
  });
});
