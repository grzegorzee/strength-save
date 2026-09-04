import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// Z174: jedna prawda o aktywnej sesji na Dashboardzie. Z buildem 80 user widział
// DWA przyciski "Kontynuuj trening" (baner sync + karta dnia) i licznik
// "Odhaczone serie: 0/4" rozjechany z ekranem treningu (rozgrzewka wliczana).

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, forEach: () => {} })),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn(),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }) },
  addDoc: vi.fn(async () => ({})),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));

const draftFixture = vi.hoisted(() => ({
  draft: null as unknown,
  // Bug 4 (X30): drafty per strona (dayId:date) dla loadDraftForDay.
  pageDrafts: {} as Record<string, unknown>,
  // WP-C (X38): wpisy kolejki syncu (permanent/konflikt decyduje o kartcie vs chmurce).
  queue: [] as unknown[],
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false, canUseStrava: false }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: [],
    getTotalWeight: () => 0,
    getCompletedWorkoutsCount: () => 0,
    getLatestMeasurement: () => null,
    isLoaded: true,
    error: null,
    backfillHistoricalWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    plan: planFixture.plan,
    isLoaded: true,
    isCustom: true,
    planDurationWeeks: 12,
    planStartDate: '2026-07-27',
    progression: null,
    skippedDates: [],
    setDaySkipped: vi.fn(async () => ({ success: true })),
    skipPastDates: vi.fn(async () => ({ success: true })),
    reducedMode: null,
    setReducedMode: vi.fn(async () => ({ success: true })),
    vacation: null,
    setVacation: vi.fn(async () => ({ success: true })),
    currentWeek: 1,
    isPlanExpired: false,
    weeksRemaining: 11,
    planStarted: true,
    planError: false,
    savePlan: vi.fn(),
    saveDeloadDecision: vi.fn(),
    swapExercise: vi.fn(),
    updateExerciseSets: vi.fn(),
    removeExercise: vi.fn(),
    addExercise: vi.fn(),
    moveExercise: vi.fn(),
    resetToDefault: vi.fn(),
  }),
}));
vi.mock('@/hooks/useActivities', () => ({
  useActivities: () => ({
    activities: [],
    stravaActivities: [],
    connection: { connected: false },
    addActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
  }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ cycles: [], isLoaded: true, archiveCurrentPlan: vi.fn(), createActiveCycle: vi.fn() }),
}));
vi.mock('@/hooks/useWatchPlanPreview', () => ({ useWatchPlanPreview: () => {} }));
vi.mock('@/components/ProUpsellBanner', () => ({ ProUpsellBanner: () => null }));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: {
    loadActiveDraft: vi.fn(async () => draftFixture.draft),
    loadDraftForDay: vi.fn(async (_uid: string, dayId: string, date: string) => (
      draftFixture.pageDrafts[`${dayId}:${date}`] ?? null
    )),
  },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => draftFixture.queue.length, list: () => draftFixture.queue },
}));

const planFixture = vi.hoisted(() => ({
  plan: [] as unknown[],
}));

import Dashboard from '@/pages/Dashboard';

const todayParts = () => {
  const now = new Date();
  return {
    todayStr: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    weekdayName: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()],
  };
};

const dayForToday = (): TrainingDay => ({
  id: 'day-1',
  dayName: 'Mój dzień A',
  weekday: todayParts().weekdayName as TrainingDay['weekday'],
  focus: 'Martwy ciąg i plecy',
  exercises: [{ id: 'ex-a', name: 'Martwy ciąg', sets: '3 x 5', instructions: [] }],
});

const provisionalDraft = (dayId: string) => ({
  sessionId: 's1',
  userId: 'u1',
  dayId,
  date: todayParts().todayStr,
  dirty: true,
  sessionOrigin: 'provisional',
  completedLocally: false,
  finalSyncPending: false,
  updatedAt: Date.now(),
  version: 5,
  exerciseSets: {
    'ex-a': [
      { reps: 10, weight: 20, completed: true, isWarmup: true },
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: false },
    ],
  },
});

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <Dashboard />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  navigateSpy.mockClear();
  planFixture.plan = [dayForToday()];
  draftFixture.draft = null;
  draftFixture.pageDrafts = {};
  draftFixture.queue = [];
});

// WP-C (X38): zakończenie offline jest ciche. Zamiast banera z CTA "Otwórz Sync
// Center" Dashboard pokazuje pasywną chmurkę z kropką; karta z CTA zostaje
// wyłącznie dla wpisów trwałych/konfliktów (stan wymagający decyzji usera).
describe('WP-C (X38): wskaźnik chmurki zamiast banera sync', () => {
  it('draft zakończony lokalnie (finalSyncPending) → chmurka, bez centrum synchronizacji i bez "Kontynuuj"', async () => {
    draftFixture.draft = { ...provisionalDraft('day-1'), completedLocally: true, finalSyncPending: true, finalizedAt: Date.now() };
    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('cloud-pending-indicator')).toBeTruthy());
    expect(screen.getByTestId('cloud-pending-indicator').getAttribute('aria-label')).toBe('Czeka na zapis w chmurze, zapisze się sam');
    expect(screen.queryByText('Otwórz centrum synchronizacji')).toBeNull();
    expect(screen.queryByText('Masz trening zakończony lokalnie')).toBeNull();
    expect(screen.queryByText('Kontynuuj trening')).toBeNull();
  });

  it('wpis trwały w kolejce (permission) → karta z centrum synchronizacji zostaje (zasada 6: wyjście)', async () => {
    draftFixture.queue = [{
      queueId: 'q1', userId: 'u1', sessionId: 'q1', dayId: 'day-1', date: '2026-08-01',
      sessionOrigin: 'remote', dirty: true, finalSyncPending: true, updatedAt: 1, enqueuedAt: 1,
      retryCount: 2, lastError: 'permission-denied', lastErrorAt: 1, permanent: true,
    }];
    renderDashboard();

    await waitFor(() => expect(screen.getByText('Otwórz centrum synchronizacji')).toBeTruthy());
    expect(screen.queryByTestId('cloud-pending-indicator')).toBeNull();
  });

  it('niezmiennik Z174: żywy draft dnia nadal ma kartę z kontynuacją, nie chmurkę', async () => {
    draftFixture.draft = provisionalDraft('day-1');
    renderDashboard();

    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('cloud-pending-indicator')).toBeNull();
  });
});

describe('Z174: jedna prawda o aktywnej sesji', () => {
  it('żywy draft dzisiejszego dnia → DOKŁADNIE JEDEN przycisk "Kontynuuj trening" i licznik bez rozgrzewki', async () => {
    draftFixture.draft = provisionalDraft('day-1');
    renderDashboard();

    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));
    // Baner informacyjny zostaje (status), ale przycisk jest tylko na karcie dnia.
    expect(screen.getByText('Masz trening rozpoczęty offline')).toBeTruthy();
    expect(screen.getAllByText('Kontynuuj trening')).toHaveLength(1);
    // 3 odhaczone robocze + 1 rozgrzewkowa → licznik pokazuje 3 (spójnie z ekranem treningu).
    expect(screen.getByText('Odhaczone serie: 3')).toBeTruthy();
  });

  it('baner rozpoczętego treningu ma natychmiastowy, dostępny przycisk zamknięcia', async () => {
    draftFixture.draft = provisionalDraft('day-1');
    renderDashboard();

    const dismiss = await screen.findByRole('button', { name: 'Ukryj komunikat o synchronizacji' });
    expect(screen.getByText('Masz trening rozpoczęty offline')).toBeTruthy();

    fireEvent.click(dismiss);

    expect(screen.queryByText('Masz trening rozpoczęty offline')).toBeNull();
    expect(screen.getAllByText('Kontynuuj trening')).toHaveLength(1);
  });

  it('nowy błąd kolejki o tej samej liczbie wpisów wraca po dismissie poprzedniego', async () => {
    const queued = (queueId: string) => ({
      queueId, userId: 'u1', sessionId: queueId, dayId: 'day-1', date: '2026-08-01',
      sessionOrigin: 'remote', dirty: true, finalSyncPending: true, updatedAt: 1, enqueuedAt: 1,
      retryCount: 2, lastError: 'permission-denied', lastErrorAt: 1, permanent: true,
    });
    draftFixture.queue = [queued('q1')];
    renderDashboard();

    const dismiss = await screen.findByRole('button', { name: 'Ukryj komunikat o synchronizacji' });
    fireEvent.click(dismiss);
    expect(screen.queryByText('Otwórz centrum synchronizacji')).toBeNull();

    draftFixture.queue = [queued('q2')];
    window.dispatchEvent(new Event('strength-save-workout-sync-state-changed'));

    await waitFor(() => expect(screen.getByText('Otwórz centrum synchronizacji')).toBeTruthy());
  });

  it('draft INNEGO dnia planu → baner zachowuje swój przycisk (karta dnia bez CTA)', async () => {
    draftFixture.draft = provisionalDraft('other-day');
    renderDashboard();

    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Kontynuuj trening')).toHaveLength(1);
    expect(screen.getByText('Rozpocznij trening')).toBeTruthy();
  });

  it('D-T2: hero przy żywym drafcie nawiguje z ?session=, nie ?autostart', async () => {
    // Kafel tygodnia (timeline) zszedł z Dashboardu w D-T2 — niezmiennik Z174
    // pilnuje jedynej pozostałej powierzchni: CTA hero dnia.
    draftFixture.draft = provisionalDraft('day-1');
    renderDashboard();
    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('Kontynuuj trening')[0]);
    const { todayStr } = todayParts();
    expect(navigateSpy).toHaveBeenLastCalledWith(`/workout/day-1?date=${todayStr}&session=s1`);
  });

  it('bug 4: porzucony szybki trening nie odbiera sesji planu ścieżki powrotu — hero linkuje z session= sesji planu', async () => {
    const { todayStr } = todayParts();
    // Globalny pick (nowszy, dirty) wskazuje adhoc — dokładnie stan po sekwencji
    // "plan → wyjście → szybki trening → porzucenie → powrót na Dashboard".
    draftFixture.draft = { ...provisionalDraft('adhoc-999'), sessionId: 's-adhoc' };
    // Żywa sesja planu wciąż istnieje pod swoim dniem (draft per strona).
    draftFixture.pageDrafts[`day-1:${todayStr}`] = { ...provisionalDraft('day-1'), sessionId: 's-plan' };
    renderDashboard();

    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));
    // Jedna prawda o sesji (Z174): CTA kontynuacji tylko na karcie dnia.
    expect(screen.getAllByText('Kontynuuj trening')).toHaveLength(1);

    fireEvent.click(screen.getByText('Kontynuuj trening'));
    expect(navigateSpy).toHaveBeenLastCalledWith(`/workout/day-1?date=${todayStr}&session=s-plan`);
  });

  it('bug 4 niezmiennik: globalny pick zgodny z dniem planu ma pierwszeństwo jak dotąd', async () => {
    const { todayStr } = todayParts();
    draftFixture.draft = provisionalDraft('day-1');
    draftFixture.pageDrafts[`day-1:${todayStr}`] = { ...provisionalDraft('day-1'), sessionId: 's-inny' };
    renderDashboard();

    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Kontynuuj trening')[0]);
    expect(navigateSpy).toHaveBeenLastCalledWith(`/workout/day-1?date=${todayStr}&session=s1`);
  });
});
