import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// Z174: jedna prawda o aktywnej sesji na Dashboardzie. Z buildem 80 user widział
// DWA przyciski "Kontynuuj trening" (baner sync + karta dnia) i licznik
// "Odhaczone serie: 0/4" rozjechany z ekranem treningu (rozgrzewka wliczana).

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

const draftFixture = vi.hoisted(() => ({
  draft: null as unknown,
}));

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

const planFixture = vi.hoisted(() => ({
  plan: [] as unknown[],
}));

import Dashboard from '@/pages/Dashboard';

const todayParts = () => {
  const now = new Date();
  return {
    todayStr: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    weekdayName: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()],
  };
};

const dayForToday = (): TrainingDay => ({
  id: 'day-1',
  dayName: 'Mój dzień A',
  weekday: todayParts().weekdayName as TrainingDay['weekday'],
  focus: 'Martwy ciąg i plecy',
  exercises: [{ id: 'ex-a', name: 'Martwy ciąg', sets: '3 x 5', instructions: [] }],
});

const provisionalDraft = (dayId: string) => ({
  sessionId: 's1',
  userId: 'u1',
  dayId,
  date: todayParts().todayStr,
  dirty: true,
  sessionOrigin: 'provisional',
  completedLocally: false,
  finalSyncPending: false,
  updatedAt: Date.now(),
  version: 5,
  exerciseSets: {
    'ex-a': [
      { reps: 10, weight: 20, completed: true, isWarmup: true },
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: false },
    ],
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
  planFixture.plan = [dayForToday()];
  draftFixture.draft = null;
});

describe('Z174: jedna prawda o aktywnej sesji', () => {
  it('żywy draft dzisiejszego dnia → DOKŁADNIE JEDEN przycisk "Kontynuuj trening" i licznik bez rozgrzewki', async () => {
    draftFixture.draft = provisionalDraft('day-1');
    renderDashboard();

    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));
    // Baner informacyjny zostaje (status), ale przycisk jest tylko na karcie dnia.
    expect(screen.getByText('Masz trening rozpoczęty offline')).toBeTruthy();
    expect(screen.getAllByText('Kontynuuj trening')).toHaveLength(1);
    // 3 odhaczone robocze + 1 rozgrzewkowa → licznik pokazuje 3 (spójnie z ekranem treningu).
    expect(screen.getByText('Odhaczone serie: 3')).toBeTruthy();
  });

  it('draft INNEGO dnia planu → baner zachowuje swój przycisk (karta dnia bez CTA)', async () => {
    draftFixture.draft = provisionalDraft('other-day');
    renderDashboard();

    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Kontynuuj trening')).toHaveLength(1);
    expect(screen.getByText('Rozpocznij trening')).toBeTruthy();
  });

  it('kafel tygodnia przy żywym drafcie nawiguje z ?session=, nie ?autostart', async () => {
    draftFixture.draft = provisionalDraft('day-1');
    renderDashboard();
    await waitFor(() => expect(screen.getAllByText('Kontynuuj trening').length).toBeGreaterThan(0));

    // '›' to chevron TrainingDayCard — klik bąbelkuje do onClick kafla.
    fireEvent.click(screen.getByText('›'));
    const { todayStr } = todayParts();
    expect(navigateSpy).toHaveBeenLastCalledWith(`/workout/day-1?date=${todayStr}&session=s1`);
  });
});
