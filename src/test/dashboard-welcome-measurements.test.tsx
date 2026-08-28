import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// T4 (feedback 2026-08-20): po onboardingu (?welcome=1) Dashboard proponuje
// dodanie pomiarów startowych. "Tak" -> /measurements (istniejący formularz),
// "Nie teraz" -> zamknięcie. Popup tylko gdy user nie ma ŻADNEGO pomiaru.

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
    getLatestMeasurement: () => measurementFixture.latest,
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
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => null), loadDraftForDay: vi.fn(async () => null) },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0, list: () => [] },
}));

const planFixture = vi.hoisted(() => ({ plan: [] as unknown[] }));
const measurementFixture = vi.hoisted(() => ({ latest: null as unknown }));

import Dashboard from '@/pages/Dashboard';
import { buildCanonicalState } from '@/test/canonical-states';

// WP-K (X29), zasada 11: kształty pomiarów z kanonicznych stanów (jak zapis
// addMeasurement), nie ręcznie klepane obiekty. Stan 'active-plan' ma oba
// produkcyjne warianty: liczbowy (waga+obwody) i tylko-zdjęcie (photoUrl).
const canonicalMeasurements = buildCanonicalState('active-plan').measurements;
const numericMeasurement = canonicalMeasurements.find((m) => m.weight != null);
const photoOnlyMeasurement = canonicalMeasurements.find((m) => m.weight == null && m.photoUrl);

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const planDays = (): TrainingDay[] => [
  {
    id: 'day-1',
    dayName: 'Dzień A',
    weekday: WEEKDAYS[new Date().getDay()] as TrainingDay['weekday'],
    focus: 'Push',
    exercises: [{ id: 'ex-a', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
  },
];

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
  measurementFixture.latest = null;
});

describe('popup pomiarów po onboardingu (T4)', () => {
  it('welcome=1 bez pomiarów: najpierw handoff planu, pomiary dopiero po jego zamknięciu', async () => {
    renderDashboard('/?welcome=1');

    expect(await screen.findByRole('heading', { name: 'Twój plan jest gotowy' })).toBeInTheDocument();
    expect(screen.queryByText('Dodać pomiary ciała?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Później' }));
    expect(await screen.findByText('Dodać pomiary ciała?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tak, dodaj pomiary' }));
    expect(navigateSpy).toHaveBeenCalledWith('/measurements');
  });

  it('welcome=1 bez pomiarów: "Nie teraz" zamyka dialog i nic nie nawiguje', async () => {
    renderDashboard('/?welcome=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Później' }));
    expect(await screen.findByText('Dodać pomiary ciała?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nie teraz' }));
    await waitFor(() => expect(screen.queryByText('Dodać pomiary ciała?')).toBeNull());
    expect(navigateSpy).not.toHaveBeenCalledWith('/measurements');
  });

  it('NIEZMIENNIK (zasada #5): zwykłe wejście na Dashboard bez dialogu', async () => {
    renderDashboard('/');
    await waitFor(() => expect(screen.getByTestId('dash-greeting')).toBeInTheDocument());
    expect(screen.queryByText('Dodać pomiary ciała?')).toBeNull();
  });

  it('welcome=1, ale user ma już pomiar (kanoniczny kształt liczbowy): dialogu NIE ma', async () => {
    expect(numericMeasurement).toBeTruthy();
    measurementFixture.latest = numericMeasurement;
    renderDashboard('/?welcome=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Później' }));
    await waitFor(() => expect(screen.getByTestId('dash-greeting')).toBeInTheDocument());
    expect(screen.queryByText('Dodać pomiary ciała?')).toBeNull();
  });

  it('welcome=1, user ma pomiar tylko-zdjęcie (photoUrl bez liczb): dialogu NIE ma', async () => {
    expect(photoOnlyMeasurement).toBeTruthy();
    measurementFixture.latest = photoOnlyMeasurement;
    renderDashboard('/?welcome=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Później' }));
    await waitFor(() => expect(screen.getByTestId('dash-greeting')).toBeInTheDocument());
    expect(screen.queryByText('Dodać pomiary ciała?')).toBeNull();
  });
});
