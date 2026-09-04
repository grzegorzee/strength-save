// T9 (feedback 2026-08-20): treningi na SAMEJ GÓRZE zakładki Plan — timeline
// przed paskiem hybrydowym, trybami (urlop/reduced) i rules tipem.
// Niezmiennik (zasada 5): przestawiamy, niczego nie usuwamy — wszystkie
// dotychczasowe elementy (Cykle, tryby, strip, stats) nadal w DOM.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';

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
  limit: vi.fn(),
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
    getLatestWorkout: () => null,
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
    currentWeek: 3,
    weeksRemaining: 9,
    isPlanExpired: false,
    savePlan: vi.fn(),
    reducedMode: null,
    setReducedMode: vi.fn(async () => ({ success: true })),
    vacation: null,
    setVacation: vi.fn(async () => ({ success: true })),
    scheduleOverrides: {},
    moveScheduledDay: vi.fn(async () => ({ success: true })),
    skippedDates: [],
    setDaySkipped: vi.fn(async () => ({ success: true })),
    progression: null,
    saveDeloadDecision: vi.fn(),
  }),
}));
vi.mock('@/hooks/useActivities', () => ({
  useActivities: () => ({
    activities: activitiesFixture.activities,
    connection: { connected: false },
    addActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
  }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ cycles: [], isLoaded: true, archiveCurrentPlan: vi.fn(), createActiveCycle: vi.fn() }),
}));

const planFixture = vi.hoisted(() => ({ plan: [] as unknown[], planStartDate: '' }));
const activitiesFixture = vi.hoisted(() => ({ activities: [] as unknown[] }));
const workoutsFixture = vi.hoisted(() => ({ workouts: [] as WorkoutSession[] }));

import TrainingPlan from '@/pages/TrainingPlan';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const dayOn = (offsetDays: number, id: string): TrainingDay => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return {
    id,
    dayName: `Dzień ${id}`,
    weekday: WEEKDAYS[d.getDay()] as TrainingDay['weekday'],
    focus: 'Push',
    exercises: [{ id: `ex-${id}`, name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
  };
};

const renderPlan = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <TrainingPlan />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  navigateSpy.mockClear();
  // Plan wystartował 2 tygodnie temu (poniedziałek), trwa.
  const start = getStartOfPlanWeek(new Date());
  start.setDate(start.getDate() - 14);
  planFixture.planStartDate = formatLocalDate(start);
  planFixture.plan = [dayOn(0, 'day-1')];
  // Manualne cardio dziś: HybridWeekStrip renderuje się tylko przy obciążeniu.
  activitiesFixture.activities = [{
    id: 'act-1', userId: 'u1', stravaId: 0, name: 'Spacer', type: 'Walk',
    date: formatLocalDate(new Date()), movingTime: 1800, averageHeartrate: 120, source: 'manual',
  }];
  workoutsFixture.workouts = [];
});

describe('kolejność sekcji zakładki Plan (T9)', () => {
  it('timeline treningów przed paskiem hybrydowym, trybami i rules tipem', async () => {
    renderPlan();
    const todayKey = formatLocalDate(new Date());
    await waitFor(() => expect(screen.getByTestId(`add-cardio-day-${todayKey}`)).toBeTruthy());

    const timelineDay = screen.getByTestId(`add-cardio-day-${todayKey}`);
    const hybridStrip = screen.getByTestId('hybrid-week-strip');
    const reducedOpen = screen.getByTestId('plan-reduced-open');
    const vacationOpen = screen.getByTestId('plan-vacation-open');

    expect(timelineDay.compareDocumentPosition(hybridStrip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(timelineDay.compareDocumentPosition(reducedOpen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hybridStrip.compareDocumentPosition(reducedOpen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(vacationOpen).toBeTruthy();
  });

  it('niezmiennik (zasada 5): żaden dotychczasowy element nie znika', async () => {
    renderPlan();
    const todayKey = formatLocalDate(new Date());
    await waitFor(() => expect(screen.getByTestId(`add-cardio-day-${todayKey}`)).toBeTruthy());

    // Nagłówek: jedno wejście grupujące Cykle, edycję i bibliotekę.
    const manageTrigger = screen.getByTestId('plan-manage-trigger');
    fireEvent.pointerDown(manageTrigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(manageTrigger);
    expect(screen.getByTestId('plan-cycles-link')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Ćwiczenia' })).toBeTruthy();
    // Tryby: urlop + "nie na 100%".
    expect(screen.getByTestId('plan-reduced-open')).toBeTruthy();
    expect(screen.getByTestId('plan-vacation-open')).toBeTruthy();
    // Pasek hybrydowy tygodnia.
    expect(screen.getByTestId('hybrid-week-strip')).toBeTruthy();
    // Karta dnia: akcje wtórne są zgrupowane pod jednym dużym celem.
    expect(screen.getByTestId('day-actions-trigger')).toBeTruthy();
  });

  it('dzień dzisiejszy renderuje się przed minionym dniem tygodnia', async () => {
    // Drugi dzień planu: wczoraj (jeśli wczoraj to inny dzień tygodnia).
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    planFixture.plan = [dayOn(0, 'day-1'), dayOn(-1, 'day-2')];
    renderPlan();

    const todayKey = formatLocalDate(new Date());
    const yesterdayKey = formatLocalDate(yesterday);
    await waitFor(() => expect(screen.getByTestId(`add-cardio-day-${todayKey}`)).toBeTruthy());

    // Wczoraj w tym samym tygodniu planu (pon-nd)? Jeśli nie (dziś poniedziałek),
    // wczorajszy dzień nie jest w widoku — wtedy sprawdzamy tylko obecność dziś.
    const inSameWeek = parseLocalDate(yesterdayKey) >= getStartOfPlanWeek(new Date());
    if (!inSameWeek) return;

    const todayEl = screen.getByTestId(`add-cardio-day-${todayKey}`);
    const yesterdayEl = screen.getByTestId(`add-cardio-day-${yesterdayKey}`);
    expect(todayEl.compareDocumentPosition(yesterdayEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('ręcznie dopisane cardio układa według daty malejąco, nie kolejności zapisu', async () => {
    const weekStart = getStartOfPlanWeek(new Date());
    const dateAt = (offset: number) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + offset);
      return formatLocalDate(date);
    };
    const oldest = dateAt(0);
    const middle = dateAt(2);
    const latest = dateAt(4);
    const activity = (id: string, date: string) => ({
      id, userId: 'u1', stravaId: 0, name: 'Pływanie', type: 'Swim',
      date, movingTime: 1800, source: 'manual',
    });
    // Kolejność utworzenia celowo 5 → 1 → 3 dzień tygodnia.
    activitiesFixture.activities = [
      activity('latest', latest),
      activity('oldest', oldest),
      activity('middle', middle),
    ];

    renderPlan();
    await waitFor(() => expect(screen.getByTestId(`plan-day-header-${latest}`)).toBeTruthy());

    const latestHeader = screen.getByTestId(`plan-day-header-${latest}`);
    const middleHeader = screen.getByTestId(`plan-day-header-${middle}`);
    const oldestHeader = screen.getByTestId(`plan-day-header-${oldest}`);
    expect(latestHeader.compareDocumentPosition(middleHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(middleHeader.compareDocumentPosition(oldestHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('postęp i timeline Planu liczą tylko kanoniczne ukończone treningi', async () => {
    const today = formatLocalDate(new Date());
    const remote: WorkoutSession = {
      id: `workout-u1-day-1-${today}`,
      userId: 'u1',
      dayId: 'day-1',
      date: today,
      completed: true,
      exercises: [{ exerciseId: 'ex-day-1', sets: [{ reps: 5, weight: 60, completed: true }] }],
    };
    workoutsFixture.workouts = [
      { ...remote, id: `local-${remote.id}` },
      remote,
      { ...remote, id: 'empty', dayId: 'empty', exercises: [] },
      {
        ...remote,
        id: 'warmup-only',
        dayId: 'warmup-only',
        exercises: [{ exerciseId: 'warm', sets: [{ reps: 10, weight: 20, completed: true, isWarmup: true }] }],
      },
    ];

    renderPlan();

    await waitFor(() => expect(screen.getByText(/1 zrobione/)).toBeTruthy());
    expect(screen.queryByText(/4 zrobione/)).toBeNull();
  });
});
