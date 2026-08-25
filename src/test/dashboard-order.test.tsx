import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// Runna pakiet 1, krok 8 (spec B2): kolejność Dashboardu (dziś → tydzień →
// reszta → Szybki trening na dole) + dzień wolny jako karta regeneracji.
// Niezmiennik: wszystkie dotychczasowe elementy obecne (przesuwamy, nie
// usuwamy) — wzorzec profile-sections.

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
});

describe('kolejność Dashboardu (spec B2)', () => {
  it('D-T2: hero -> tydzień -> szybkie akcje -> max jeden insight; duplikaty usunięte', async () => {
    planFixture.plan = [dayOn(0, 'day-1', 'Push')];
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId('week-card')).toBeTruthy());

    const greeting = screen.getByTestId('dash-greeting');
    const hero = screen.getByTestId('dash-hero');
    const weekCard = screen.getByTestId('week-card');
    const quickStart = screen.getByTestId('quick-workout-start');
    const cardio = screen.getByTestId('add-cardio-open');
    // Fala 2: analityka to kafel w gridzie akcji (pełnowymiarowy przycisk zniknął).
    const analytics = screen.getByTestId('dash-analytics');

    // Duplikaty analityki/planu/tygodnia zeszły z Dashboardu (domy: Postępy i Plan).
    expect(screen.queryByTestId('dash-stats')).toBeNull();
    expect(screen.queryByTestId('dash-week-section')).toBeNull();
    expect(screen.queryByTestId('dash-strava-km')).toBeNull();
    expect(screen.queryByTestId('dash-plan-card')).toBeNull();
    expect(screen.queryByTestId('dash-last-pr')).toBeNull();
    expect(screen.queryByText('Zobacz analitykę')).toBeNull();

    // Kolejność: powitanie -> hero -> kompaktowy tydzień -> grid akcji
    // (baner decyzji planu siada MIĘDZY greeting a hero, gdy jest co decydować).
    expect(greeting.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hero.compareDocumentPosition(weekCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(weekCard.compareDocumentPosition(quickStart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(quickStart.compareDocumentPosition(analytics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cardio).toBeTruthy();
    expect(screen.getByTestId('dash-your-numbers')).toBeTruthy();

    // Zaległość nie jest automatycznym modalem: zero blokujących warstw po wejściu.
    expect(document.querySelectorAll('[data-app-overlay]')).toHaveLength(0);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('dzień wolny: karta regeneracji z tipem pod wczorajszą partię', async () => {
    planFixture.plan = [dayOn(1, 'day-2', 'Pull')];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    workoutsFixture.workouts = [{
      id: 'w-y',
      userId: 'u1',
      dayId: 'day-x',
      date: dateKey(yesterday),
      completed: true,
      dayFocus: 'Klatka i barki',
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 5, weight: 100, completed: true }] }],
    }];
    renderDashboard();

    await waitFor(() => expect(screen.getByText(/Dzień regeneracji/)).toBeTruthy());
    expect(screen.getByText(/Rozciągnij klatkę i barki/)).toBeTruthy();
    // Naprawa r1 (2026-08-21): dzień wolny renderuje hero najbliższej sesji
    // (eyebrow + CTA podglądu + przełożenie) nad kartą regeneracji.
    const hero = screen.getByTestId('next-session-hero');
    expect(within(hero).getByText(/Następna sesja/i)).toBeTruthy();
    expect(within(hero).getByText('Otwórz sesję')).toBeTruthy();
    expect(within(hero).getByText('Przełóż trening')).toBeTruthy();
  });
});
