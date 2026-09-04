import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';

// WP-PLANS-1 (X27, Task P3): stan "plan zakończony" (training_plans.status='ended').
// (a) Dashboard nie renderuje hero NEXT SESSION z martwego planu, renderuje kartę
//     końca planu z CTA nowego planu; (b) /plan pokazuje pusty stan z CTA;
// (c) baner rekomendacji na /cycles jest nieobecny.
// Mocki wg wzorca dashboard-prestart.test.tsx.

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
  orderBy: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false,
    canUseStrava: false, canUseBodyPhotos: false,
  }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: [],
    getTotalWeight: () => 0,
    getCompletedWorkoutsCount: () => 0,
    getLatestMeasurement: () => null,
    getLatestWorkout: () => null,
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
    planStatus: planFixture.planStatus,
    setPlanStatus: vi.fn(async () => ({ success: true })),
    planDurationWeeks: 12,
    planStartDate: '2026-08-03',
    progression: null,
    scheduleOverrides: {},
    moveScheduledDay: vi.fn(async () => ({ success: true })),
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
  usePlanCycles: () => ({
    cycles: cyclesFixture.cycles,
    isLoaded: true,
    archiveCurrentPlan: vi.fn(),
    createActiveCycle: vi.fn(),
    deleteCycle: vi.fn(),
  }),
}));
vi.mock('@/hooks/useWatchPlanPreview', () => ({ useWatchPlanPreview: () => {} }));
vi.mock('@/components/ProUpsellBanner', () => ({ ProUpsellBanner: () => null }));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: {
    loadActiveDraft: vi.fn(async () => null),
    listDrafts: vi.fn(async () => []),
    loadDraftForDay: vi.fn(async () => null),
  },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0, list: () => [] },
}));

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const todayWeekday = WEEKDAYS[new Date().getDay()];

const planDay: TrainingDay = {
  id: 'day-1',
  dayName: 'Mój dzień A',
  weekday: todayWeekday as TrainingDay['weekday'],
  focus: 'Push',
  exercises: [{ id: 'ex-1', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
};

const activeCycle: PlanCycle = {
  id: 'cycle-1',
  userId: 'u1',
  days: [planDay],
  durationWeeks: 12,
  startDate: '2026-08-03',
  endDate: '',
  status: 'active',
  createdAt: '2026-08-03T08:00:00.000Z',
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
};

const planFixture = vi.hoisted(() => ({
  plan: [] as unknown[],
  planStatus: 'active' as 'active' | 'ended' | 'none',
}));
const cyclesFixture = vi.hoisted(() => ({ cycles: [] as unknown[] }));

import Dashboard from '@/pages/Dashboard';
import TrainingPlan from '@/pages/TrainingPlan';
import Cycles from '@/pages/Cycles';

const renderPage = (page: React.ReactElement) =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>{page}</UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('app-language', 'pl');
  planFixture.plan = [planDay];
  planFixture.planStatus = 'active';
  cyclesFixture.cycles = [activeCycle];
  navigateSpy.mockClear();
});

describe('WP-PLANS-1: Dashboard przy planStatus=ended', () => {
  it('kontrola: przy planStatus=active dzisiejszy dzień planu renderuje hero treningu', () => {
    renderPage(<Dashboard />);

    expect(screen.getAllByText(/Mój dzień A/).length).toBeGreaterThan(0);
  });

  it('ended: brak hero NEXT SESSION / dnia z martwego planu, jest karta końca planu', () => {
    planFixture.planStatus = 'ended';

    renderPage(<Dashboard />);

    expect(screen.queryByTestId('next-session-hero')).toBeNull();
    expect(screen.queryAllByText(/Mój dzień A/)).toHaveLength(0);
    // Karta decyzji (state 'ended') z CTA nowego planu.
    expect(screen.getByTestId('dash-next-step')).toBeTruthy();
    expect(screen.getAllByText(/Plan się zakończył/).length).toBeGreaterThan(0);
  });
});

describe('WP-PLANS-1: /plan przy planStatus=ended', () => {
  it('pusty stan z CTA zamiast timeline z martwego planu', () => {
    planFixture.planStatus = 'ended';

    renderPage(<TrainingPlan />);

    expect(screen.getByTestId('plan-ended-empty')).toBeTruthy();
    expect(screen.getByTestId('plan-next-step')).toBeTruthy();
    // Timeline/kalendarz martwego planu nie renderują się.
    expect(screen.queryByTestId('plan-manage-trigger')).toBeNull();
    expect(screen.queryAllByText(/Mój dzień A/)).toHaveLength(0);
  });

  it('kontrola: przy planStatus=active timeline planu renderuje się normalnie', () => {
    renderPage(<TrainingPlan />);

    expect(screen.getByTestId('plan-manage-trigger')).toBeTruthy();
    expect(screen.queryByTestId('plan-ended-empty')).toBeNull();
  });
});

describe('WP-PLANS-1: /cycles przy planStatus=ended', () => {
  it('kontrola: przy planStatus=active baner rekomendacji i przycisk końca planu są widoczne', () => {
    renderPage(<Cycles />);

    expect(screen.getByText(/Domknięcie i progres cyklu/)).toBeTruthy();
    expect(screen.getByTestId('cycles-end-plan')).toBeTruthy();
  });

  it('ended: baner rekomendacji nieobecny, przycisk "Zakończ plan" schowany', () => {
    planFixture.planStatus = 'ended';

    renderPage(<Cycles />);

    expect(screen.queryByText(/Domknięcie i progres cyklu/)).toBeNull();
    expect(screen.queryByTestId('cycles-end-plan')).toBeNull();
  });
});
