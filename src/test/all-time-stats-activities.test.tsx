import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutSession } from '@/types';

const fixtures = vi.hoisted(() => ({
  user: { uid: 'u1', canUseStrava: false, profile: { uid: 'u1', stravaConnected: false } },
  fetchHistory: vi.fn(),
}));
vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => fixtures.user }));
vi.mock('@/lib/activity-read-store', () => ({ fetchAllTimeActivityHistory: fixtures.fetchHistory }));
import { AllTimeStatsSheet } from '@/components/AllTimeStatsSheet';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

const workout = (id: string, userId = 'u1'): WorkoutSession => ({
  id, userId, dayId: 'day-1', date: '2026-09-01', completed: true, durationSec: 3600,
  exercises: [{ exerciseId: 'squat', name: 'Przysiad ze sztangą', sets: [{ reps: 5, weight: 100, completed: true }] }],
});
const swim = { id: 'swim', userId: 'u1', source: 'manual', type: 'Swim', movingTime: 2400 };
const renderSheet = (uid: string | null = 'u1', open = true, workouts = [workout('1'), workout('2')]) => (
  <LanguageProvider><UnitProvider>
    <AllTimeStatsSheet uid={uid ?? undefined} open={open} onOpenChange={() => {}} workouts={workouts} />
  </UnitProvider></LanguageProvider>
);
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

describe('all-time activities and account boundary', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    fixtures.user = { uid: 'u1', canUseStrava: false, profile: { uid: 'u1', stravaConnected: false } };
    fixtures.fetchHistory.mockReset().mockResolvedValue({ workouts: [workout('1'), workout('2')], activities: [swim] });
  });

  it('counts a 40-minute manual swim plus two completed strength sessions, preserving strength metrics', async () => {
    render(renderSheet());
    expect(await screen.findByTestId('stat-activities')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-workouts')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-cardio')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-cardio-time')).toHaveTextContent('40 min');
    expect(screen.getByTestId('stat-time')).toHaveTextContent('2 h');
    expect(screen.getByTestId('stat-tonnage')).toHaveTextContent('1000');
  });

  it('hides loaded account A history immediately on switching to empty account B', async () => {
    const pending = deferred<{ workouts: WorkoutSession[]; activities: typeof swim[] }>();
    const view = render(renderSheet());
    await screen.findByTestId('stat-tonnage');
    fixtures.user = { uid: 'u2', canUseStrava: false, profile: { uid: 'u2', stravaConnected: false } };
    fixtures.fetchHistory.mockReturnValue(pending.promise);
    view.rerender(renderSheet('u2'));
    expect(screen.queryByTestId('stat-tonnage')).not.toBeInTheDocument();
    await act(async () => pending.resolve({ workouts: [], activities: [] }));
    expect(await screen.findByTestId('stats-empty')).toBeVisible();
    expect(screen.queryByText('Przysiad ze sztangą')).not.toBeInTheDocument();
  });

  it('hides loaded history on logout even when the caller still holds old workouts', async () => {
    const view = render(renderSheet());
    await screen.findByTestId('stat-tonnage');
    fixtures.user = { uid: '', canUseStrava: false, profile: { uid: '', stravaConnected: false } };
    view.rerender(renderSheet(null));
    expect(screen.queryByTestId('stat-tonnage')).not.toBeInTheDocument();
  });

  it('does no full-history IO while closed, then reloads after reopening', async () => {
    const view = render(renderSheet('u1', false));
    expect(fixtures.fetchHistory).not.toHaveBeenCalled();
    view.rerender(renderSheet());
    await screen.findByTestId('stat-activities');
    expect(fixtures.fetchHistory).toHaveBeenCalledTimes(1);
    view.rerender(renderSheet('u1', false));
    fixtures.fetchHistory.mockResolvedValue({ workouts: [], activities: [swim] });
    view.rerender(renderSheet());
    expect(await screen.findByTestId('stat-activities')).toHaveTextContent('1');
    expect(fixtures.fetchHistory).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('stat-tonnage')).not.toBeInTheDocument();
  });

  it('discards delayed account A completion after account B is loaded', async () => {
    const pending = deferred<{ workouts: WorkoutSession[]; activities: typeof swim[] }>();
    fixtures.fetchHistory.mockReturnValueOnce(pending.promise).mockResolvedValue({ workouts: [], activities: [] });
    const view = render(renderSheet());
    const signal = fixtures.fetchHistory.mock.calls[0][1].signal as AbortSignal;
    fixtures.user = { uid: 'u2', canUseStrava: false, profile: { uid: 'u2', stravaConnected: false } };
    view.rerender(renderSheet('u2'));
    expect(signal.aborted).toBe(true);
    await screen.findByTestId('stats-empty');
    await act(async () => pending.resolve({ workouts: [workout('1')], activities: [swim] }));
    expect(screen.getByTestId('stats-empty')).toBeVisible();
    expect(screen.queryByTestId('stat-activities')).not.toBeInTheDocument();
  });

  it('shows a retry on partial read failure rather than presenting recent workouts as all-time', async () => {
    fixtures.fetchHistory.mockRejectedValueOnce(new Error('offline'));
    render(renderSheet());
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wczytać pełnej historii');
    expect(screen.queryByTestId('stat-activities')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stat-tonnage')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(await screen.findByTestId('stat-activities')).toHaveTextContent('3');
  });

  it('counts Strava only while both the same-owner profile and entitlement allow it', async () => {
    const strava = { ...swim, id: 'run', stravaId: 42, source: 'strava', type: 'Run', movingTime: 1800 };
    fixtures.user = { uid: 'u1', canUseStrava: true, profile: { uid: 'u1', stravaConnected: true } };
    fixtures.fetchHistory.mockResolvedValue({ workouts: [], activities: [swim, strava] });
    const view = render(renderSheet());
    expect(await screen.findByTestId('stat-activities')).toHaveTextContent('2');
    expect(fixtures.fetchHistory).toHaveBeenLastCalledWith('u1', expect.objectContaining({ includeStrava: true }));
    fixtures.user.canUseStrava = false;
    view.rerender(renderSheet());
    await waitFor(() => expect(screen.getByTestId('stat-activities')).toHaveTextContent('1'));
    expect(fixtures.fetchHistory).toHaveBeenLastCalledWith('u1', expect.objectContaining({ includeStrava: false }));
    fixtures.user = { uid: 'u2', canUseStrava: true, profile: { uid: 'u1', stravaConnected: true } };
    fixtures.fetchHistory.mockResolvedValue({ workouts: [], activities: [] });
    view.rerender(renderSheet('u2'));
    await screen.findByTestId('stats-empty');
    expect(fixtures.fetchHistory).toHaveBeenLastCalledWith('u2', expect.objectContaining({ includeStrava: false }));
  });
});
