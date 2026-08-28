// A4/B4 (X70): kontrakt ról kolorów wspierających palety.
// supportA = drugi akcent DANYCH (ikona trendu rekordów na Postępach),
// supportB = akcent DEKORACYJNY (tint banera tygodnia, poświata hero "Dzisiaj",
// księżyc w powitaniu). Ochrona przed regresją "paleta = 1 kolor": tokeny
// --palette-support-a/b muszą mieć realnych konsumentów w UI, nie tylko wykresy.
// Dodatkowo B4: delta tonażu chowana przy zbyt słabej bazie porównania.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

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
vi.mock('@/lib/firebase', () => ({ db: {}, storage: {}, auth: {}, functions: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false, canUseStrava: false }),
}));

// Zakładki Analityki są lazy i ciężkie — kontrakt dotyczy kafli i banera.
vi.mock('@/components/analytics/AnalyticsChartsTab', () => ({ default: () => <div data-testid="charts-tab" /> }));
vi.mock('@/components/analytics/AnalyticsWeeklyTab', () => ({ default: () => <div data-testid="weekly-tab" /> }));
vi.mock('@/components/strava/StravaTab', () => ({ StravaTab: () => null }));
vi.mock('@/components/analytics/MonthlyOverviewCard', () => ({ MonthlyOverviewCard: () => <div data-testid="monthly-overview-card" /> }));
vi.mock('@/components/analytics/HybridLoadCard', () => ({ HybridLoadCard: () => <div data-testid="hybrid-load-card" /> }));
vi.mock('@/components/ExportWorkoutsDialog', () => ({ ExportWorkoutsDialog: () => null }));

vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: workoutsFixture.workouts,
    measurements: [],
    measurementError: null,
    retryMeasurements: vi.fn(),
    getTotalWeight: () => 0,
    getCompletedWorkoutsCount: () => workoutsFixture.workouts.length,
    getLatestMeasurement: () => null,
    isLoaded: true,
    error: null,
    backfillHistoricalWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/useWorkoutHistoryPage', () => ({
  useWorkoutRange: () => ({ workouts: workoutsFixture.workouts, isLoaded: true }),
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
const workoutsFixture = vi.hoisted(() => ({ workouts: [] as Array<Record<string, unknown>> }));

import Analytics from '@/pages/Analytics';
import Dashboard from '@/pages/Dashboard';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const workoutAt = (id: string, date: string, weight: number) => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 5, weight, completed: true }] }],
});

const dayToday = (): TrainingDay => ({
  id: 'day-1',
  dayName: 'Dzień A',
  weekday: WEEKDAYS[new Date().getDay()] as TrainingDay['weekday'],
  focus: 'Push',
  exercises: [{ id: 'ex-1', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
});

const renderAnalytics = () => render(
  <MemoryRouter initialEntries={['/achievements?view=analytics']}>
    <LanguageProvider>
      <UnitProvider>
        <Analytics embedded />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

const renderDashboard = () => render(
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider>
        <Dashboard />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

// Czwartek w środku tygodnia: poprzedni tydzień pełny (17-23.08), bieżący trwa 4 dni.
const THURSDAY_NOON = new Date(2026, 7, 27, 12, 0, 0);
const MONDAY_NOON = new Date(2026, 7, 24, 12, 0, 0);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  navigateSpy.mockClear();
  // Symulacja aktywnej palety: tokeny wsparcia nadpisane inline jak w applyPaletteTheme.
  const root = document.documentElement;
  root.style.setProperty('--palette-support-a', '187 86% 53%');
  root.style.setProperty('--palette-support-b', '258 90% 66%');
  root.dataset.palette = 'test-palette';
  vi.useFakeTimers({ toFake: ['Date'], now: THURSDAY_NOON });
  planFixture.plan = [];
  workoutsFixture.workouts = [];
});

afterEach(() => {
  vi.useRealTimers();
  const root = document.documentElement;
  root.style.removeProperty('--palette-support-a');
  root.style.removeProperty('--palette-support-b');
  delete root.dataset.palette;
});

describe('A4: role kolorów wspierających na Postępach', () => {
  it('baner tygodnia ma tint support-b, a nie primary', () => {
    workoutsFixture.workouts = [workoutAt('w1', '2026-08-25', 60)];
    renderAnalytics();
    const insight = screen.getByTestId('analytics-summary-insight');
    expect(insight.className).toContain('bg-support-b/10');
    expect(insight.className).toContain('border-support-b/30');
    expect(insight.className).not.toContain('bg-primary/10');
  });

  it('kafel rekordów używa support-a, puchar tonażu zostaje primary, płomień semantyczny', () => {
    workoutsFixture.workouts = [workoutAt('w1', '2026-08-25', 60)];
    renderAnalytics();
    const firstView = screen.getByTestId('analytics-summary-first-view');
    const tiles = within(firstView).getAllByTestId('analytics-summary-metric');
    expect(tiles).toHaveLength(3);
    expect(tiles[0].querySelector('.text-primary')).not.toBeNull();
    expect(tiles[1].querySelector('.text-fitness-warning')).not.toBeNull();
    expect(tiles[2].querySelector('.text-support-a')).not.toBeNull();
    expect(tiles[2].querySelector('.text-primary')).toBeNull();
  });
});

describe('A4: dekoracje support-b na Dzisiaj', () => {
  it('hero dzisiejszego treningu nosi klasę hero-support-glow (poświata tylko przy palecie)', async () => {
    planFixture.plan = [dayToday()];
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dash-hero')).toBeTruthy());
    expect(screen.getByTestId('dash-hero').querySelector('.hero-support-glow')).not.toBeNull();
  });

  it('wieczorem ikona księżyca w powitaniu ma kolor support-b', async () => {
    vi.setSystemTime(new Date(2026, 7, 27, 20, 0, 0));
    planFixture.plan = [dayToday()];
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dash-greeting')).toBeTruthy());
    expect(screen.getByTestId('dash-greeting').querySelector('.text-support-b')).not.toBeNull();
  });

  it('w dzień słońce zostaje w kolorze primary (bez support-b)', async () => {
    planFixture.plan = [dayToday()];
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('dash-greeting')).toBeTruthy());
    expect(screen.getByTestId('dash-greeting').querySelector('.text-support-b')).toBeNull();
  });
});

describe('B4: delta tonażu tylko przy sensownej bazie porównania', () => {
  const prevWeekTwoWorkouts = () => [
    workoutAt('p1', '2026-08-18', 100),
    workoutAt('p2', '2026-08-20', 100),
  ];

  it('poprzedni tydzień >=2 treningów i >=3 dni bieżącego: delta widoczna, z odstępem po "Tonaż"', () => {
    workoutsFixture.workouts = [...prevWeekTwoWorkouts(), workoutAt('c1', '2026-08-25', 60)];
    renderAnalytics();
    const firstView = screen.getByTestId('analytics-summary-first-view');
    expect(firstView.textContent).toContain('%');
    // Bez realnej spacji innerText sklejał etykietę z deltą ("Tonaż-62%").
    expect(firstView.textContent).toMatch(/Tonaż\s+[-+−]?\d+%/);
  });

  it('poprzedni tydzień z 1 treningiem: delta ukryta', () => {
    workoutsFixture.workouts = [workoutAt('p1', '2026-08-18', 100), workoutAt('c1', '2026-08-25', 60)];
    renderAnalytics();
    expect(screen.getByTestId('analytics-summary-first-view').textContent).not.toContain('%');
  });

  it('bieżący tydzień trwa <3 dni (poniedziałek): delta ukryta mimo pełnej bazy', () => {
    vi.setSystemTime(MONDAY_NOON);
    workoutsFixture.workouts = [...prevWeekTwoWorkouts(), workoutAt('c1', '2026-08-24', 60)];
    renderAnalytics();
    expect(screen.getByTestId('analytics-summary-first-view').textContent).not.toContain('%');
  });
});
