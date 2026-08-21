import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { buildCanonicalState } from '@/test/canonical-states';
import { parseLocalDate } from '@/lib/utils';

// WP-B (X28), Edge 3: baner "Trening ukończony" ma X i po zamknięciu nie wraca
// do końca dnia (klucz fittracker_completed_dismissed_v1 = ostatnio zamknięta
// data). Nowy dzień z nowym ukończonym treningiem pokazuje baner znowu. Hero
// NEXT SESSION renderuje się DALEJ po dismissie. localStorage niedostępny =>
// baner działa bez zapamiętania (try/catch, wzorzec nextstep-dismiss).

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
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false, canUseStrava: false }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: fixture.workouts,
    getTotalWeight: () => 0,
    getCompletedWorkoutsCount: () => 1,
    getLatestMeasurement: () => null,
    getTodaysWorkout: () => null,
    isLoaded: true,
    error: null,
    backfillHistoricalWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    plan: fixture.plan,
    isLoaded: true,
    isCustom: true,
    planStatus: 'active',
    setPlanStatus: vi.fn(async () => ({ success: true })),
    planName: null,
    planDurationWeeks: 8,
    planStartDate: fixture.planStartDate,
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
    currentWeek: 1,
    isPlanExpired: false,
    weeksRemaining: 7,
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
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => null), listDrafts: vi.fn(async () => []) },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0, list: () => [] },
}));
vi.mock('@/hooks/useToday', () => ({
  useToday: () => parseLocalDate(fixture.todayISO),
}));

const fixture = vi.hoisted(() => ({
  plan: [] as unknown[],
  planStartDate: null as string | null,
  workouts: [] as unknown[],
  todayISO: '2026-08-20',
}));

import Dashboard from '@/pages/Dashboard';

const DISMISS_KEY = 'fittracker_completed_dismissed_v1';
const TODAY = '2026-08-20';
const TOMORROW = '2026-08-21';

const applyState = (todayISO: string) => {
  const state = buildCanonicalState('plan-active-done-today-wpb', todayISO);
  fixture.plan = state.plan!.days;
  fixture.planStartDate = state.plan!.startDate;
  fixture.workouts = state.workouts;
  fixture.todayISO = todayISO;
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
  applyState(TODAY);
});

describe('baner "Trening ukończony" — dismiss (X28 WP-B)', () => {
  it('X chowa baner, hero NEXT SESSION zostaje, data trafia do localStorage', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('today-completed-card')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));

    expect(screen.queryByTestId('today-completed-card')).toBeNull();
    expect(screen.getByTestId('next-session-hero')).toBeTruthy();
    expect(localStorage.getItem(DISMISS_KEY)).toBe(TODAY);
  });

  it('re-render tego samego dnia: baner nadal schowany, hero zostaje', async () => {
    localStorage.setItem(DISMISS_KEY, TODAY);
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('next-session-hero')).toBeTruthy());
    expect(screen.queryByTestId('today-completed-card')).toBeNull();
  });

  it('nowy dzień z nowym ukończonym treningiem: baner wraca mimo wczorajszego dismissu', async () => {
    localStorage.setItem(DISMISS_KEY, TODAY);
    applyState(TOMORROW);
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('today-completed-card')).toBeTruthy());
  });

  it('localStorage rzuca: baner renderuje się i X chowa go w tej sesji (bez crasha)', async () => {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === DISMISS_KEY) throw new Error('quota');
      return originalGetItem.call(this, key);
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === DISMISS_KEY) throw new Error('quota');
      originalSetItem.call(this, key, value);
    });

    try {
      renderDashboard();
      await waitFor(() => expect(screen.getByTestId('today-completed-card')).toBeTruthy());

      fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
      expect(screen.queryByTestId('today-completed-card')).toBeNull();
    } finally {
      vi.mocked(Storage.prototype.getItem).mockRestore();
      vi.mocked(Storage.prototype.setItem).mockRestore();
    }
  });
});
