import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';
import type { UnifiedActivity } from '@/types/strava';
import { formatLocalDate } from '@/lib/utils';

// T5 (feedback 2026-08-20): aktywności Strava/manual bieżącego tygodnia mają
// być widoczne na Dashboardzie TAKŻE zanim wystartuje plan. Niezmiennik
// reguły 5: karta tylko DOKŁADA render — plan wystartowany dalej ją widzi,
// a sekcja km 'dash-strava-km' pozostaje zdjęta (pilnuje dashboard-order).

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
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false, canUseStrava: true }),
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
    planStartDate: planFixture.planStartDate,
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
    weeksRemaining: 12,
    planStarted: planFixture.planStarted,
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
    activities: activitiesFixture.activities,
    stravaActivities: [],
    connection: { connected: activitiesFixture.connected },
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

const planFixture = vi.hoisted(() => ({
  plan: [] as unknown[],
  planStartDate: null as string | null,
  planStarted: false,
}));
const activitiesFixture = vi.hoisted(() => ({
  activities: [] as unknown[],
  connected: true,
}));

import Dashboard from '@/pages/Dashboard';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const dayOn = (offsetDays: number, id: string, focus: string): TrainingDay => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return {
    id,
    dayName: `Dzień ${id}`,
    weekday: WEEKDAYS[d.getDay()] as TrainingDay['weekday'],
    focus,
    exercises: [{ id: `ex-${id}`, name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
  };
};

const todayStr = () => formatLocalDate(new Date());

const stravaRun = (over: Partial<UnifiedActivity> = {}): UnifiedActivity => ({
  id: 'run-1',
  userId: 'u1',
  stravaId: 1,
  name: 'Morning Run',
  type: 'Run',
  date: todayStr(),
  distance: 5000,
  movingTime: 1500,
  averageSpeed: 3.33,
  stravaUrl: 'https://strava.com/1',
  syncedAt: 'now',
  source: 'strava',
  ...over,
});

const manualWalk = (over: Partial<UnifiedActivity> = {}): UnifiedActivity => ({
  id: 'manual-1',
  userId: 'u1',
  stravaId: 0,
  name: '',
  type: 'Walk',
  date: todayStr(),
  movingTime: 1800,
  stravaUrl: '',
  syncedAt: 'now',
  source: 'manual',
  ...over,
});

const futureStart = () => {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return formatLocalDate(d);
};

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
  planFixture.plan = [dayOn(0, 'day-1', 'Push')];
  planFixture.planStartDate = null;
  planFixture.planStarted = false;
  activitiesFixture.activities = [];
  activitiesFixture.connected = true;
});

describe('karta cardio tygodnia na Dashboardzie (T5)', () => {
  it('plan startuje w PRZYSZŁOŚCI + bieg z tego tygodnia → karta widoczna (scenariusz z feedbacku)', async () => {
    planFixture.planStartDate = futureStart();
    planFixture.planStarted = false;
    activitiesFixture.activities = [stravaRun()];

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('dash-week-cardio')).toBeTruthy());
    expect(screen.getByText('Cardio w tym tygodniu')).toBeTruthy();
    expect(screen.getByText('Morning Run')).toBeTruthy();
  });

  it('plan WYSTARTOWANY → karta nadal widoczna (niezmiennik reguły 5)', async () => {
    planFixture.planStartDate = '2026-07-27';
    planFixture.planStarted = true;
    activitiesFixture.activities = [stravaRun()];

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('dash-week-cardio')).toBeTruthy());
    expect(screen.getByText('Morning Run')).toBeTruthy();
    // Sekcja km Strava została ŚWIADOMIE zdjęta — karta jej nie wskrzesza.
    expect(screen.queryByTestId('dash-strava-km')).toBeNull();
  });

  it('Strava NIEpołączona + wpis manualny → manual widoczny, Strava nie', async () => {
    activitiesFixture.connected = false;
    activitiesFixture.activities = [
      manualWalk(),
      stravaRun({ id: 'stale-run', name: 'Stale Strava Run' }),
    ];

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('dash-week-cardio')).toBeTruthy());
    expect(screen.getByTestId('manual-activity-card')).toBeTruthy();
    expect(screen.queryByText('Stale Strava Run')).toBeNull();
  });

  it('zero aktywności → karty nie ma', async () => {
    activitiesFixture.activities = [];

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('dash-actions')).toBeTruthy());
    expect(screen.queryByTestId('dash-week-cardio')).toBeNull();
  });
});
