import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// Progressive disclosure (2026-08-27): Dashboard zostawia wyłącznie operacyjne
// skróty potrzebne w danej chwili. Dane i analityka mają jeden dom w głównej
// zakładce Postępy; szybki trening i ręczne cardio pozostają bezpośrednio dostępne.

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
    currentWeek: 3,
    isPlanExpired: false,
    weeksRemaining: 9,
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
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => null), loadDraftForDay: vi.fn(async () => null) },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0, list: () => [] },
}));

const planFixture = vi.hoisted(() => ({ plan: [] as unknown[] }));

import Dashboard from '@/pages/Dashboard';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const dayToday = (): TrainingDay => ({
  id: 'day-1',
  dayName: 'Dzień A',
  weekday: WEEKDAYS[new Date().getDay()] as TrainingDay['weekday'],
  focus: 'Push',
  exercises: [{ id: 'ex-1', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
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
  planFixture.plan = [dayToday()];
});

describe('proste akcje Dashboardu', () => {
  it('pokazuje dokładnie dwa operacyjne skróty, bez duplikatów zakładki Postępy', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dash-actions')).toBeTruthy());
    const grid = screen.getByTestId('dash-actions');
    expect(grid.querySelectorAll('button')).toHaveLength(2);
    expect(screen.getByTestId('quick-workout-start')).toBeTruthy();
    expect(screen.getByTestId('add-cardio-open')).toBeTruthy();
    expect(screen.queryByTestId('dash-your-numbers')).toBeNull();
    expect(screen.queryByTestId('dash-analytics')).toBeNull();
  });

  it('ma jedno dominujące CTA treningowe', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dashboard-primary-action')).toBeTruthy());
    expect(screen.getAllByTestId('dashboard-primary-action')).toHaveLength(1);
    expect(screen.getByTestId('dashboard-primary-action')).toHaveTextContent('Rozpocznij trening');
  });

  it('NIEZMIENNIK starego przepływu: szybki trening nadal startuje ad-hoc', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('quick-workout-start')).toBeTruthy());
    fireEvent.click(screen.getByTestId('quick-workout-start'));
    expect(navigateSpy).toHaveBeenLastCalledWith(expect.stringMatching(/^\/workout\/.+autostart=true$/));
  });

  it('NIEZMIENNIK starego przepływu: cardio nadal otwiera formularz dodawania', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('add-cardio-open')).toBeTruthy());
    fireEvent.click(screen.getByTestId('add-cardio-open'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  });
});
