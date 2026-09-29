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

// F5 (2026-09-29, wariant A): licznik od pierwszego treningu siłowego, jawna
// data „od", rozbicie cardio na źródła i typy, przypis o imporcie Stravy.
describe('F5: skąd są aktywności i od kiedy liczymy', () => {
  const dated = (id: string, date: string, extra: Record<string, unknown> = {}): WorkoutSession => ({ ...workout(id), date, ...extra });
  const act2 = (id: string, date: string, type: string, source: 'manual' | 'strava', stravaId?: number) => ({
    id, userId: 'u1', source, type, date, movingTime: 600, ...(stravaId ? { stravaId } : {}),
  });
  const ownerHistory = {
    workouts: [dated('s1', '2026-01-26'), dated('s2', '2026-02-02')],
    activities: [
      act2('old', '2025-04-04', 'Run', 'strava', 1), act2('r2', '2026-02-01', 'Run', 'strava', 2),
      act2('r3', '2026-03-01', 'Run', 'strava', 3), act2('h4', '2026-03-02', 'Hike', 'strava', 4),
      act2('w5', '2026-03-03', 'WeightTraining', 'strava', 5), act2('m1', '2026-04-01', 'Swim', 'manual'),
    ],
  };

  beforeEach(() => {
    localStorage.setItem('app-language', 'pl');
    fixtures.user = {
      uid: 'u1', canUseStrava: true,
      profile: { uid: 'u1', stravaConnected: true, stravaLastSync: '2026-08-22T08:00:08.263Z' } as typeof fixtures.user.profile,
    };
    fixtures.fetchHistory.mockReset().mockResolvedValue(ownerHistory);
  });

  it('pokazuje licznik z datą „od", rozbicie na źródła i typy oraz przypisy', async () => {
    render(renderSheet());
    expect(await screen.findByTestId('stat-activities')).toHaveTextContent('6');
    expect(screen.getByTestId('stat-activities-since')).toHaveTextContent('od 26 sty 2026');
    expect(screen.getByTestId('stat-workouts')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-cardio')).toHaveTextContent('4');
    expect(screen.getByTestId('stat-source-strava')).toHaveTextContent('Strava3');
    expect(screen.getByTestId('stat-source-manual')).toHaveTextContent('Dodane ręcznie1');
    const types = screen.getAllByTestId(/^stat-type-/).map((el) => el.textContent);
    expect(types).toEqual(['Bieg2', 'Wędrówka1', 'Pływanie1']);
    const notes = screen.getByTestId('stats-notes');
    expect(notes).toHaveTextContent('Liczymy od pierwszego ukończonego treningu siłowego');
    expect(notes).toHaveTextContent('Starsze aktywności (1) nie wchodzą do tej liczby');
    expect(notes).toHaveTextContent('importujemy do 12 miesięcy wstecz');
    expect(notes).toHaveTextContent('Postępy → Wykresy → Strava');
    expect(notes).toHaveTextContent('WeightTraining, Crossfit');
    expect(screen.getByTestId('stat-strava-last-sync')).toHaveTextContent('22 sie 2026');
  });

  it('F5b: zastój lub błąd synchronizacji Stravy jest widoczny przy dacie, ze wskazaniem wyjścia', async () => {
    render(renderSheet());
    // Właściciel: ostatni sync 22.08, dziś dużo później = zastój.
    expect(await screen.findByTestId('stat-strava-sync-problem')).toHaveTextContent('Synchronizacja Stravy nie działa');
    expect(screen.getByTestId('stat-strava-sync-problem')).toHaveTextContent('Profil → Urządzenia i połączenia');
  });

  it('F5b: świeży sync bez błędu nie pokazuje ostrzeżenia', async () => {
    fixtures.user = {
      uid: 'u1', canUseStrava: true,
      profile: { uid: 'u1', stravaConnected: true, stravaLastSync: new Date().toISOString() } as typeof fixtures.user.profile,
    };
    render(renderSheet());
    await screen.findByTestId('stat-strava-last-sync');
    expect(screen.queryByTestId('stat-strava-sync-problem')).not.toBeInTheDocument();
  });

  it('bez Stravy: tylko ręczne źródło, bez przypisów o Stravie', async () => {
    fixtures.user = { uid: 'u1', canUseStrava: false, profile: { uid: 'u1', stravaConnected: false } };
    render(renderSheet());
    expect(await screen.findByTestId('stat-activities')).toHaveTextContent('3');
    expect(screen.getByTestId('stat-source-manual')).toHaveTextContent('1');
    expect(screen.queryByTestId('stat-source-strava')).not.toBeInTheDocument();
    expect(screen.getByTestId('stats-notes')).not.toHaveTextContent('Strava');
    expect(screen.queryByTestId('stat-strava-last-sync')).not.toBeInTheDocument();
  });

  it('bez treningów siłowych: „od" = najstarsza aktywność, przypis to mówi', async () => {
    fixtures.user = { uid: 'u1', canUseStrava: false, profile: { uid: 'u1', stravaConnected: false } };
    fixtures.fetchHistory.mockResolvedValue({ workouts: [], activities: [act2('m1', '2026-04-01', 'Swim', 'manual'), act2('m2', '2026-03-05', 'Walk', 'manual')] });
    render(renderSheet());
    expect(await screen.findByTestId('stat-activities')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-activities-since')).toHaveTextContent('od 5 mar 2026');
    expect(screen.getByTestId('stats-notes')).toHaveTextContent('Liczymy od najstarszej zapisanej aktywności');
    expect(screen.queryByTestId('stat-tonnage')).not.toBeInTheDocument();
  });

  it('bez cardio: brak sekcji źródeł i typów', async () => {
    fixtures.user = { uid: 'u1', canUseStrava: false, profile: { uid: 'u1', stravaConnected: false } };
    fixtures.fetchHistory.mockResolvedValue({ workouts: [dated('s1', '2026-01-26')], activities: [] });
    render(renderSheet());
    expect(await screen.findByTestId('stat-activities')).toHaveTextContent('1');
    expect(screen.queryByTestId('stats-cardio-breakdown')).not.toBeInTheDocument();
  });

  it('EN: etykiety i data po angielsku', async () => {
    localStorage.setItem('app-language', 'en');
    render(renderSheet());
    expect(await screen.findByTestId('stat-activities-since')).toHaveTextContent('since Jan 26, 2026');
    expect(screen.getByTestId('stat-source-manual')).toHaveTextContent('Added manually1');
    expect(screen.getAllByTestId(/^stat-type-/)[0]).toHaveTextContent('Run2');
  });
});
