import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// Fala 2 (2026-08-20): grid 2x2 szybkich akcji. Niezmiennik: DOKŁADNIE 4 kafle
// i każdy działa — kafel "Twoje liczby" przywraca wejście z Dashboardu do
// AllTimeStatsSheet (X17D Z139.4), kafel Analityki przejmuje funkcję zdjętego
// pełnowymiarowego przycisku "Zobacz analitykę".

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
  workoutSyncQueue: { pendingCount: () => 0 },
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

describe('grid szybkich akcji (fala 2)', () => {
  it('niezmiennik: grid ma DOKŁADNIE 4 kafle', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dash-actions')).toBeTruthy());
    const grid = screen.getByTestId('dash-actions');
    expect(grid.querySelectorAll('button')).toHaveLength(4);
    expect(screen.getByTestId('quick-workout-start')).toBeTruthy();
    expect(screen.getByTestId('add-cardio-open')).toBeTruthy();
    expect(screen.getByTestId('dash-your-numbers')).toBeTruthy();
    expect(screen.getByTestId('dash-analytics')).toBeTruthy();
  });

  it('kafel "Twoje liczby" otwiera AllTimeStatsSheet', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dash-your-numbers')).toBeTruthy());
    expect(screen.queryByTestId('stats-empty')).toBeNull();
    fireEvent.click(screen.getByTestId('dash-your-numbers'));
    await waitFor(() => expect(screen.getByTestId('stats-empty')).toBeTruthy());
  });

  it('kafel Analityki nawiguje do podsumowania analityki', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dash-analytics')).toBeTruthy());
    fireEvent.click(screen.getByTestId('dash-analytics'));
    expect(navigateSpy).toHaveBeenLastCalledWith('/achievements?view=analytics&tab=summary');
  });

  it('kafel szybkiego treningu nawiguje do ad-hoc z autostartem', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('quick-workout-start')).toBeTruthy());
    fireEvent.click(screen.getByTestId('quick-workout-start'));
    expect(navigateSpy).toHaveBeenLastCalledWith(expect.stringMatching(/^\/workout\/.+autostart=true$/));
  });

  it('kafel cardio otwiera dialog dodawania', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('add-cardio-open')).toBeTruthy());
    fireEvent.click(screen.getByTestId('add-cardio-open'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  });
});
