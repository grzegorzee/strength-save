import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// Fala 2 (2026-08-20): link "Przełóż trening" w stopce hero (karta NEXT SESSION)
// podpina istniejący openReschedule — z guardem żywego draftu (spec 2026-08-11,
// brzeg 2): przy rozpoczętej sesji tego dnia toast zamiast otwarcia sheeta.

const navigateSpy = vi.hoisted(() => vi.fn());
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
  toast: toastSpy,
}));

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

const draftFixture = vi.hoisted(() => ({ draft: null as unknown }));

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
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => draftFixture.draft) },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0 },
}));

const planFixture = vi.hoisted(() => ({ plan: [] as unknown[] }));

import Dashboard from '@/pages/Dashboard';

const todayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const dayToday = (): TrainingDay => ({
  id: 'day-1',
  dayName: 'Dzień A',
  weekday: WEEKDAYS[new Date().getDay()] as TrainingDay['weekday'],
  focus: 'Push',
  exercises: [{ id: 'ex-1', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
});

const liveDraft = (dayId: string) => ({
  sessionId: 's1',
  userId: 'u1',
  dayId,
  date: todayStr(),
  dirty: true,
  sessionOrigin: 'remote',
  completedLocally: false,
  finalSyncPending: false,
  updatedAt: Date.now(),
  version: 3,
  exerciseSets: {
    'ex-1': [{ reps: 5, weight: 100, completed: true }],
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
  toastSpy.mockClear();
  planFixture.plan = [dayToday()];
  draftFixture.draft = null;
});

describe('link "Przełóż trening" w hero (fala 2)', () => {
  it('bez draftu: klik otwiera RescheduleSheet', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Rozpocznij trening')).toBeTruthy());

    // Scope do hero: "Przełóż trening" istnieje też w MissedWorkoutBanner.
    fireEvent.click(within(screen.getByTestId('dash-hero')).getByText('Przełóż trening'));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Przełóż trening' })).toBeTruthy());
  });

  it('żywy draft dnia: toast draftBlocked i sheet pozostaje zamknięty', async () => {
    draftFixture.draft = liveDraft('day-1');
    renderDashboard();
    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));

    fireEvent.click(within(screen.getByTestId('dash-hero')).getByText('Przełóż trening'));
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Najpierw dokończ albo odrzuć rozpoczęty trening',
      variant: 'destructive',
    }));
    expect(screen.queryByRole('heading', { name: 'Przełóż trening' })).toBeNull();
  });

  it('link "Szczegóły" nawiguje do widoku dnia (niezmiennik)', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Szczegóły')).toBeTruthy());
    fireEvent.click(screen.getByText('Szczegóły'));
    expect(navigateSpy).toHaveBeenLastCalledWith('/day');
  });
});
