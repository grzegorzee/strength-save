import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// Runna pakiet 1, krok 2 (spec A1): powrót z completion na Dashboard podświetla
// kartę ukończonego dnia i pokazuje następny trening (domknięcie pętli "co dalej").

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
    getCompletedWorkoutsCount: () => 1,
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
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => null) },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0 },
}));

const planFixture = vi.hoisted(() => ({ plan: [] as unknown[] }));
const workoutsFixture = vi.hoisted(() => ({ workouts: [] as unknown[] }));

import Dashboard from '@/pages/Dashboard';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const todayParts = () => {
  const now = new Date();
  return {
    todayStr: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    weekdayName: WEEKDAYS[now.getDay()],
    tomorrowWeekdayName: WEEKDAYS[(now.getDay() + 1) % 7],
  };
};

const planDays = (): TrainingDay[] => [
  {
    id: 'day-1',
    dayName: 'Dzień A',
    weekday: todayParts().weekdayName as TrainingDay['weekday'],
    focus: 'Push',
    exercises: [{ id: 'ex-a', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
  },
  {
    id: 'day-2',
    dayName: 'Dzień B',
    weekday: todayParts().tomorrowWeekdayName as TrainingDay['weekday'],
    focus: 'Pull',
    exercises: [{ id: 'ex-b', name: 'Wiosłowanie', sets: '3 x 5', instructions: [] }],
  },
];

const completedToday = () => ({
  id: 'w1',
  userId: 'u1',
  dayId: 'day-1',
  date: todayParts().todayStr,
  completed: true,
  exercises: [{ exerciseId: 'ex-a', sets: [{ reps: 5, weight: 100, completed: true }] }],
});

const renderDashboard = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
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
  planFixture.plan = planDays();
  workoutsFixture.workouts = [completedToday()];
});

describe('powrót z completion na Dashboard', () => {
  it('celebrate=1: karta ukończonego dnia podświetlona i z następnym treningiem', async () => {
    renderDashboard('/?celebrate=1');
    await waitFor(() => expect(screen.getAllByText('Trening ukończony!').length).toBeGreaterThan(0));
    const card = screen.getByTestId('today-completed-card');
    expect(card.className).toContain('ring-2');
    // Naprawa r1 (2026-08-21): następny trening prezentuje hero najbliższej
    // sesji pod kartą ukończenia (mockup: NEXT SESSION mimo "Today done").
    const hero = screen.getByTestId('next-session-hero');
    expect(within(hero).getByText(/Dzień B/)).toBeTruthy();
    expect(within(hero).getByText('Otwórz sesję')).toBeTruthy();
  });

  it('zwykłe wejście: karta bez podświetlenia (niezmiennik)', async () => {
    renderDashboard('/');
    await waitFor(() => expect(screen.getAllByText('Trening ukończony!').length).toBeGreaterThan(0));
    const card = screen.getByTestId('today-completed-card');
    expect(card.className).not.toContain('ring-2');
  });
});
