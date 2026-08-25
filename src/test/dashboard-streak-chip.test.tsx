import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// Fala 2 (2026-08-20): chip streaka tygodniowego przy dacie w powitaniu
// (mockupowe "14 WEEKS"). Streak liczony jak dotąd (calculateStreakDetails,
// >=2 treningi/tydzień); chip renderuje się TYLKO gdy streak > 0.

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
    workouts: workoutsFixture.workouts,
    getTotalWeight: () => 0,
    getCompletedWorkoutsCount: () => workoutsFixture.workouts.length,
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
const workoutsFixture = vi.hoisted(() => ({ workouts: [] as unknown[] }));

import Dashboard from '@/pages/Dashboard';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dayToday = (): TrainingDay => ({
  id: 'day-1',
  dayName: 'Dzień A',
  weekday: WEEKDAYS[new Date().getDay()] as TrainingDay['weekday'],
  focus: 'Push',
  exercises: [{ id: 'ex-1', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
});

const completedWorkout = (id: string) => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date: dateKey(new Date()),
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 5, weight: 100, completed: true }] }],
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
  workoutsFixture.workouts = [];
});

describe('chip streaka w powitaniu (fala 2)', () => {
  it('streak > 0: chip z liczbą tygodni przy dacie', async () => {
    // 2 ukończone treningi w bieżącym tygodniu = streak 1 (próg >=2/tydzień).
    workoutsFixture.workouts = [completedWorkout('w1'), completedWorkout('w2')];
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dash-streak-chip')).toBeTruthy());
    expect(screen.getByTestId('dash-streak-chip').textContent).toContain('1 tyg. serii');
  });

  it('streak 0: brak chipu', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dash-greeting')).toBeTruthy());
    expect(screen.queryByTestId('dash-streak-chip')).toBeNull();
  });
});
