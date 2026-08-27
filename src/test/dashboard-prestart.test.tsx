import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// T3 (feedback 2026-08-20): cykl startuje w przyszłości → karta pre-start z datą
// startu (z dniem tygodnia) i pierwszym treningiem PO starcie. Niezmiennik
// (reguła #5 CLAUDE.md): start dzisiejszy/przeszły oraz ukończony trening
// renderują się dokładnie jak dotąd. Mocki wg wzorca dashboard-order.test.tsx.

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
    planStartDate: planFixture.planStartDate,
    progression: null,
    skippedDates: [],
    setDaySkipped: vi.fn(async () => ({ success: true })),
    skipPastDates: vi.fn(async () => ({ success: true })),
    reducedMode: null,
    setReducedMode: vi.fn(async () => ({ success: true })),
    vacation: null,
    setVacation: vi.fn(async () => ({ success: true })),
    currentWeek: planFixture.planStarted ? 3 : 0,
    isPlanExpired: false,
    weeksRemaining: 9,
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

const planFixture = vi.hoisted(() => ({
  plan: [] as unknown[],
  planStartDate: null as string | null,
  planStarted: false,
}));
const workoutsFixture = vi.hoisted(() => ({ workouts: [] as unknown[] }));

import Dashboard from '@/pages/Dashboard';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d;
};

const dayOn = (offsetDays: number, id: string, focus: string): TrainingDay => {
  const d = addDays(offsetDays);
  return {
    id,
    dayName: `Dzień ${id}`,
    weekday: WEEKDAYS[d.getDay()] as TrainingDay['weekday'],
    focus,
    exercises: [{ id: `ex-${id}`, name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
  };
};

const longDate = (d: Date, locale: string) =>
  d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

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
  workoutsFixture.workouts = [];
  planFixture.plan = [];
  planFixture.planStartDate = null;
  planFixture.planStarted = false;
});

describe('karta pre-start (T3)', () => {
  it('start w przyszłości: karta pre-start z datą i dniem tygodnia, bez karty regeneracji', async () => {
    const start = addDays(5);
    planFixture.plan = [dayOn(5, 'day-1', 'Push')];
    planFixture.planStartDate = dateKey(start);

    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('prestart-card')).toBeTruthy());

    const card = screen.getByTestId('prestart-card');
    expect(card.textContent).toContain('Start cyklu:');
    expect(card.textContent).toContain(longDate(start, 'pl-PL'));
    expect(card.textContent).toContain('Pierwszy trening:');
    expect(screen.queryByTestId('recovery-card')).toBeNull();
  });

  it('EN: tytuł i data karty pre-start w języku angielskim', async () => {
    localStorage.setItem('app-language', 'en');
    const start = addDays(5);
    planFixture.plan = [dayOn(5, 'day-1', 'Push')];
    planFixture.planStartDate = dateKey(start);

    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('prestart-card')).toBeTruthy());

    const card = screen.getByTestId('prestart-card');
    expect(card.textContent).toContain('Cycle starts:');
    expect(card.textContent).toContain(longDate(start, 'en-US'));
  });

  it('niezmiennik (reguła #5): start przeszły + trening dziś = karta treningu jak dotąd, bez pre-startu', async () => {
    planFixture.plan = [dayOn(0, 'day-1', 'Push')];
    planFixture.planStartDate = dateKey(addDays(-7));
    planFixture.planStarted = true;

    renderDashboard();
    await waitFor(() => expect(screen.getByText('Rozpocznij trening')).toBeTruthy());
    expect(screen.queryByTestId('prestart-card')).toBeNull();
  });

  it('X28 WP-B: trening ad-hoc ukończony dziś + start w przyszłości = pre-start wygrywa (zero sesji sprzed startu)', async () => {
    // Odwrócenie starego niezmiennika (bug builda 114): branch completed liczył
    // "next" czystą regułą weekday i pokazywał sesję SPRZED startu planu.
    planFixture.plan = [dayOn(5, 'day-1', 'Push')];
    planFixture.planStartDate = dateKey(addDays(5));
    workoutsFixture.workouts = [{
      id: 'w-1',
      userId: 'u1',
      dayId: 'adhoc-1',
      date: dateKey(new Date()),
      completed: true,
      dayFocus: 'Push',
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 5, weight: 100, completed: true }] }],
    }];

    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('prestart-card')).toBeTruthy());
    expect(screen.queryByTestId('today-completed-card')).toBeNull();
    expect(screen.queryByTestId('next-session-hero')).toBeNull();
  });

  it('pierwszy trening liczony OD daty startu, nie od dziś (środa PO starcie w poniedziałek)', async () => {
    // Najbliższy przyszły poniedziałek (1-7 dni do przodu).
    const start = addDays(((8 - new Date().getDay()) % 7) || 7);
    const firstWednesday = new Date(start);
    firstWednesday.setDate(start.getDate() + 2);

    planFixture.plan = [{
      id: 'day-w',
      dayName: 'Środa siłowa',
      weekday: 'wednesday',
      focus: 'Pull',
      exercises: [{ id: 'ex-w', name: 'Wiosłowanie', sets: '3 x 8', instructions: [] }],
    }];
    planFixture.planStartDate = dateKey(start);

    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('prestart-card')).toBeTruthy());
    expect(screen.getByTestId('prestart-card').textContent)
      .toContain(longDate(firstWednesday, 'pl-PL'));
  });
});
