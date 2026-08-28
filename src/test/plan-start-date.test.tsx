import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';
import { getNextScheduledTraining, resolvePlannedDay } from '@/lib/plan-schedule';
import { buildScheduleMove } from '@/lib/schedule-overrides';
import { buildCanonicalState } from '@/test/canonical-states';
import { parseLocalDate } from '@/lib/utils';
import { RescheduleSheet } from '@/components/RescheduleSheet';

// WP-PLANS-2 (X27, Task O2): wybrana data startu planu jest RESPEKTOWANA w całej
// sekwencji (bug usera: wybrał 7 września, sesje pojawiły się od 24 sierpnia).
// Dzień planowy istnieje dopiero od startDate: (1) resolver, (2) najbliższa
// sesja, (3) hero Dashboardu, (4) occupanci w RescheduleSheet.

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
    workouts: workoutsFixture.workouts,
    getTotalWeight: () => 0,
    getCompletedWorkoutsCount: () => 0,
    getLatestMeasurement: () => null,
    getTodaysWorkout: () => null,
    getLatestWorkout: () => null,
    isLoaded: true,
    error: null,
    backfillHistoricalWorkouts: vi.fn(),
  }),
}));
// (7) DayPlan: Strava poza zakresem testu — stale odlaczone.
vi.mock('@/hooks/useStrava', () => ({
  useStrava: () => ({ activities: [], connection: { connected: false } }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    plan: planFixture.plan,
    isLoaded: true,
    isCustom: true,
    planStatus: 'active',
    setPlanStatus: vi.fn(async () => ({ success: true })),
    planName: null,
    planDurationWeeks: 12,
    planStartDate: planFixture.planStartDate,
    progression: null,
    scheduleOverrides: {},
    moveScheduledDay: moveScheduledDaySpy,
    skippedDates: [],
    setDaySkipped: vi.fn(async () => ({ success: true })),
    skipPastDates: vi.fn(async () => ({ success: true })),
    reducedMode: null,
    setReducedMode: vi.fn(async () => ({ success: true })),
    vacation: null,
    setVacation: vi.fn(async () => ({ success: true })),
    currentWeek: 0,
    isPlanExpired: false,
    weeksRemaining: 12,
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
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => null), listDrafts: vi.fn(async () => []), loadDraftForDay: vi.fn(async () => null) },
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
// (8) Domknięcie WP-B w batchu 2: call-site moveScheduledDay w TrainingPlan.tsx
// też przekazuje planStartDateISO — spy hoisted, żeby dało się asertować argumenty.
const moveScheduledDaySpy = vi.hoisted(() =>
  vi.fn(async (..._args: unknown[]) => ({ success: true })));

import Dashboard from '@/pages/Dashboard';
import DayPlan from '@/pages/DayPlan';
import TrainingPlanPage from '@/pages/TrainingPlan';

const day = (id: string, weekday: TrainingDay['weekday'], dayName: string): TrainingDay => ({
  id,
  dayName,
  weekday,
  focus: 'Push',
  exercises: [{ id: `ex-${id}`, name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
});

// Stała siatka dat: poniedziałek 2026-08-24 = "dziś", start planu tydzień później.
const TODAY = '2026-08-24';
const START = '2026-08-31';
const PLAN = [day('day-1', 'monday', 'Poniedziałek siłowy'), day('day-2', 'wednesday', 'Środa siłowa')];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  planFixture.plan = [];
  planFixture.planStartDate = null;
  planFixture.planStarted = false;
  workoutsFixture.workouts = [];
  moveScheduledDaySpy.mockClear();
});

describe('(1) resolvePlannedDay respektuje startDate planu', () => {
  it('data przed startem → null, także z override; od startu → reguła weekday', () => {
    // Przed startem: środa 26.08 normalnie miałaby day-2.
    expect(resolvePlannedDay('2026-08-26', PLAN, {}, START)).toBeNull();
    // Override też nie wskrzesza dnia przed startem.
    expect(resolvePlannedDay('2026-08-25', PLAN, { '2026-08-25': 'day-1' }, START)).toBeNull();
    // Dzień startu i później: dotychczasowe reguły.
    expect(resolvePlannedDay(START, PLAN, {}, START)?.id).toBe('day-1');
    expect(resolvePlannedDay('2026-09-02', PLAN, {}, START)?.id).toBe('day-2');
  });

  it('niezmiennik: bez startDate zachowanie jak dotąd', () => {
    expect(resolvePlannedDay('2026-08-26', PLAN, {})?.id).toBe('day-2');
  });
});

describe('(2) getNextScheduledTraining respektuje startDate planu', () => {
  it('pierwsza sesja to pierwszy dzień planu >= startDate, nie najbliższy weekday', () => {
    const next = getNextScheduledTraining(PLAN, new Date(2026, 7, 24), {
      includeSameDay: true,
      startDateISO: START,
    });
    expect(next?.dateKey).toBe(START);
    expect(next?.day.id).toBe('day-1');
  });

  it('niezmiennik: bez startDateISO najbliższy weekday jak dotąd', () => {
    const next = getNextScheduledTraining(PLAN, new Date(2026, 7, 24), { includeSameDay: true });
    expect(next?.dateKey).toBe('2026-08-24');
  });
});

describe('(3) Dashboard hero przy przyszłym starcie', () => {
  it('renderuje kartę pre-start z datą startu i pierwszym treningiem, bez sesji sprzed startu', async () => {
    const start = new Date();
    start.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7) + 7); // poniedziałek za >1 tydzień
    const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    planFixture.plan = [day('day-1', 'monday', 'Poniedziałek siłowy')];
    planFixture.planStartDate = iso;

    render(
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <Dashboard />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('prestart-card')).toBeTruthy());
    const card = screen.getByTestId('prestart-card');
    const startLabel = start.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
    expect(card.textContent).toContain(startLabel);
    // Hero najbliższej sesji sprzed startu nie istnieje.
    expect(screen.queryByTestId('next-session-hero')).toBeNull();
  });
});

describe('(4) RescheduleSheet nie pokazuje occupantów przed startem planu', () => {
  const renderSheet = () =>
    render(
      <LanguageProvider>
        <RescheduleSheet
          open
          onOpenChange={() => {}}
          fromDateISO={START}
          planDays={PLAN}
          overrides={{}}
          onSelect={() => {}}
          todayISO={TODAY}
          planStartDateISO={START}
        />
      </LanguageProvider>,
    );

  it('daty przed startem są "wolne", od startu occupant wg planu', () => {
    renderSheet();

    const buttons = screen.getAllByRole('button');
    // Lista zaczyna się od todayISO; data startu (fromISO) jest pominięta.
    // Środa 26.08 (przed startem) — bez occupanta.
    const before = buttons.find((b) => b.textContent?.includes('26'));
    expect(before).toBeTruthy();
    expect(within(before!).getByText('wolne')).toBeTruthy();
    // Środa 2.09 (po starcie) — occupant day-2 z zapowiedzią swapu.
    const after = buttons.find((b) => b.textContent?.includes('2 wrz'));
    expect(after).toBeTruthy();
    expect(after!.textContent).toContain('Środa siłowa');
  });
});

// X28 WP-B: luka testu X27 — pre-start sprawdzany był BEZ ukończonego dziś
// treningu. Branch completed (przed guardem pre-start) łapał dzisiejszą sesję
// i liczył "next" czystą regułą weekday => "NEXT SESSION" sprzed startu.
describe('(5) X28 WP-B: przyszły start + ukończony DZIŚ trening (scenariusz buga 1:1)', () => {
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

  it('hero = preStart z datą startu; ŻADNEGO "next session" ani banera completed', async () => {
    const state = buildCanonicalState('plan-future-start-done-today-wpb');
    planFixture.plan = state.plan!.days;
    planFixture.planStartDate = state.plan!.startDate;
    planFixture.planStarted = false;
    workoutsFixture.workouts = state.workouts;

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('prestart-card')).toBeTruthy());
    const startLabel = parseLocalDate(state.plan!.startDate)
      .toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
    expect(screen.getByTestId('prestart-card').textContent).toContain(startLabel);
    expect(screen.queryByTestId('today-completed-card')).toBeNull();
    expect(screen.queryByTestId('next-session-hero')).toBeNull();
  });

  it('niezmiennik (Edge 2): plan WYSTARTOWANY + ukończony dziś = branch completed jak dotąd', async () => {
    const state = buildCanonicalState('plan-active-done-today-wpb');
    planFixture.plan = state.plan!.days;
    planFixture.planStartDate = state.plan!.startDate;
    planFixture.planStarted = true;
    workoutsFixture.workouts = state.workouts;

    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('today-completed-card')).toBeTruthy());
    expect(screen.queryByTestId('prestart-card')).toBeNull();
    // Hero najbliższej sesji dalej się renderuje (dni planu co 2 dni => next istnieje).
    expect(screen.getByTestId('next-session-hero')).toBeTruthy();
  });
});

describe('(6) buildScheduleMove respektuje start planu (Edge 4)', () => {
  it('cel przed startem => ok:false z reason before-start, mapa nietknięta', () => {
    const result = buildScheduleMove({
      overrides: {},
      planDays: PLAN,
      fromISO: START,
      toISO: '2026-08-27',
      todayISO: TODAY,
      planStartDateISO: START,
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe('before-start');
  });

  it('źródło sprzed startu nie istnieje w resolverze => ok:false', () => {
    const result = buildScheduleMove({
      overrides: {},
      planDays: PLAN,
      fromISO: '2026-08-26',
      toISO: '2026-09-03',
      todayISO: TODAY,
      planStartDateISO: START,
    });
    expect(result.ok).toBe(false);
  });

  it('cel na dzień startu i później działa jak dotąd', () => {
    const result = buildScheduleMove({
      overrides: {},
      planDays: PLAN,
      fromISO: START,
      toISO: '2026-09-01',
      todayISO: TODAY,
      planStartDateISO: START,
    });
    expect(result.ok).toBe(true);
  });

  it('niezmiennik: bez planStartDateISO zachowanie jak dotąd', () => {
    const result = buildScheduleMove({
      overrides: {},
      planDays: PLAN,
      fromISO: '2026-08-24',
      toISO: '2026-08-25',
      todayISO: TODAY,
    });
    expect(result.ok).toBe(true);
  });
});

describe('(7) DayPlan respektuje start planu (Edge 5)', () => {
  it('dzień sprzed startu nie pokazuje treningu planowego (widok wolny)', async () => {
    // Dzisiejszy weekday JEST w planie, ale start planu dopiero za tydzień.
    const now = new Date();
    const weekdayNames: TrainingDay['weekday'][] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const futureStart = new Date(now);
    futureStart.setDate(now.getDate() + 7);
    const futureISO = `${futureStart.getFullYear()}-${String(futureStart.getMonth() + 1).padStart(2, '0')}-${String(futureStart.getDate()).padStart(2, '0')}`;
    planFixture.plan = [day('day-t', weekdayNames[now.getDay()], 'Dzień testowy')];
    planFixture.planStartDate = futureISO;

    render(
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <DayPlan />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Dzisiaj wolne!')).toBeTruthy());
    expect(screen.queryByText('Rozpocznij trening')).toBeNull();
  });
});

// (8) Domknięcie WP-B w batchu 2 (X28): call-site moveScheduledDay w
// TrainingPlan.tsx też przekazuje planStartDateISO do silnika przełożeń.
// Dashboard dostał parametr w batchu 1; /plan zostawał bez niego (parametr
// opcjonalny, zero regresji) — teraz oba call-site'y są spójne.
describe('(8) TrainingPlan przekazuje planStartDateISO do moveScheduledDay', () => {
  it('wybór daty w sheecie woła moveScheduledDay z planStartDateISO planu', async () => {
    const weekdays: TrainingDay['weekday'][] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    planFixture.plan = [day('day-t', weekdays[now.getDay()], 'Dzień testowy')];
    planFixture.planStartDate = '2026-08-03';
    planFixture.planStarted = true;

    render(
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <TrainingPlanPage />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );

    // Dzisiejsza karta dnia grupuje akcje wtórne; wybór „Przełóż” otwiera sheet.
    const actionsTrigger = screen.getAllByLabelText('Więcej akcji')[0];
    fireEvent.pointerDown(actionsTrigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Przełóż trening' }));
    // Pierwszy wolny dzień horyzontu = handleRescheduleSelect(toDateISO).
    fireEvent.click(screen.getAllByText('wolne')[0].closest('button')!);

    await waitFor(() => expect(moveScheduledDaySpy).toHaveBeenCalledTimes(1));
    expect(moveScheduledDaySpy.mock.calls[0][2]).toMatchObject({ planStartDateISO: '2026-08-03' });
  });
});
