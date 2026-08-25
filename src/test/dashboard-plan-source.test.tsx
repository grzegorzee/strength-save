import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';

// Z172: Dashboard nie ma prawa renderować wbudowanego defaultPlan, gdy plan usera
// jest nieznany (snapshot jeszcze nie doszedł albo padł błędem). User widział
// "Klatka / Przysiad / Środek Pleców" zamiast własnego planu — literalnie
// trainingPlan.ts:96.

// ── Firestore zamockowany na poziomie modułu: realny useTrainingPlan dostaje
//    nasze handlery snapshotu, cała reszta transitive importów jest inertna. ──
const snapshotHandlers = vi.hoisted(() => ({
  subs: [] as Array<{ onNext: (snap: unknown) => void; onError: (err: Error) => void }>,
  get onNext() { return this.subs.at(-1)?.onNext ?? null; },
  get onError() { return this.subs.at(-1)?.onError ?? null; },
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  // H1 (X31): useTrainingPlan woła onSnapshot(ref, { includeMetadataChanges }, onNext, onError).
  onSnapshot: vi.fn((_ref: unknown, _opts: unknown, onNext: (snap: unknown) => void, onError: (err: Error) => void) => {
    snapshotHandlers.subs.push({ onNext, onError });
    return () => {};
  }),
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

// ── Mocki hooków Dashboardu (wzorzec exercise-name-localization.test.tsx) ──
const planFixture = vi.hoisted(() => ({
  isLoaded: false,
  plan: [] as unknown[],
}));
const workoutsFixture = vi.hoisted(() => ({
  workouts: [] as unknown[],
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false, canUseStrava: false }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: workoutsFixture.workouts,
    getTotalWeight: () => 0,
    getCompletedWorkoutsCount: () => 0,
    getLatestMeasurement: () => null,
    isLoaded: true,
    error: null,
    backfillHistoricalWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  // Czysta fikstura dla testów Dashboardu; suite 2 bierze REALNY hook przez
  // vi.importActual (mock modułu go nie dotyka).
  useTrainingPlan: () => ({
    plan: planFixture.plan,
    isLoaded: planFixture.isLoaded,
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
  workoutSyncQueue: { pendingCount: () => 0 },
}));

import Dashboard from '@/pages/Dashboard';
import { trainingPlan as defaultPlan } from '@/data/trainingPlan';

// REALNY hook (poza mockiem modułu) — testy źródła planu w suite 2.
const { useTrainingPlan: useTrainingPlanReal } =
  await vi.importActual<typeof import('@/hooks/useTrainingPlan')>('@/hooks/useTrainingPlan');

const customDays: TrainingDay[] = [
  {
    id: 'day-1',
    dayName: 'Mój dzień A',
    weekday: 'monday',
    focus: 'Martwy ciąg i plecy',
    exercises: [{ id: 'ex-a', name: 'Martwy ciąg', sets: '3 x 5', instructions: [] }],
  },
];

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
  snapshotHandlers.subs.length = 0;
  planFixture.isLoaded = false;
  planFixture.plan = [];
  workoutsFixture.workouts = [];
});

describe('Z172: Dashboard a źródło planu', () => {
  it('planIsLoaded=false → żadnego defaultPlan na ekranie (loader zamiast planu tygodnia)', async () => {
    planFixture.isLoaded = false;
    planFixture.plan = [...defaultPlan]; // stan startowy hooka przed snapshotem

    renderDashboard();

    // Focus defaultPlan (trainingPlan.ts:96) NIE MA PRAWA się pojawić.
    expect(screen.queryAllByText(/Klatka \/ Przysiad/)).toHaveLength(0);
    // Karta dnia i plan tygodnia nie renderują się przed poznaniem planu usera.
    expect(screen.queryAllByText(/Plan tygodnia/i)).toHaveLength(0);
    await waitFor(() => expect(screen.getByText(/Ładowanie/i)).toBeTruthy());
  });

  it('plan usera załadowany → renderuje plan usera, nie default', () => {
    planFixture.isLoaded = true;
    planFixture.plan = customDays;

    renderDashboard();

    expect(screen.queryByText(/Klatka \/ Przysiad/)).toBeNull();
    expect(screen.getAllByText(/Martwy ciąg i plecy/).length).toBeGreaterThan(0);
  });

  // Z173: guard daty w lookupie kafli tygodnia — ukończony DZIŚ trening INNEGO
  // dnia planu (np. z poprzedniego planu) nie może oznaczyć dzisiejszego kafla ✅.
  it('Z173: trening innego dnia planu ukończony dziś nie oznacza kafla jako ukończony', () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekdayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];

    planFixture.isLoaded = true;
    planFixture.plan = [{ ...customDays[0], weekday: weekdayName }];
    workoutsFixture.workouts = [{
      id: 'w-legacy',
      userId: 'u1',
      dayId: 'legacy-day',
      date: todayStr,
      completed: true,
      exercises: [],
    }];

    renderDashboard();

    // Kafel dnia usera jest na ekranie…
    expect(screen.getAllByText(/Mój dzień A/).length).toBeGreaterThan(0);
    // …ale NIE jako ukończony (✅ renderuje wyłącznie TrainingDayCard).
    expect(screen.queryAllByText('✅')).toHaveLength(0);
  });
});

describe('Z172: useTrainingPlan — błąd snapshotu nie podmienia planu usera', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LanguageProvider>{children}</LanguageProvider>
  );

  const goodSnapshot = {
    exists: () => true,
    data: () => ({ days: customDays, startDate: '2026-07-06', durationWeeks: 12, revision: 1 }),
    metadata: { fromCache: false, hasPendingWrites: false },
  };

  it('błąd snapshotu PO dobrym planie: plan usera zostaje, planError=true, isLoaded=true', async () => {
    const { result } = renderHook(() => useTrainingPlanReal('u1'), { wrapper });
    expect(snapshotHandlers.onNext).toBeTruthy();

    act(() => snapshotHandlers.onNext!(goodSnapshot));
    expect(result.current.plan.map((d) => d.dayName)).toEqual(['Mój dzień A']);
    expect(result.current.isCustom).toBe(true);

    act(() => snapshotHandlers.onError!(new Error('firestore unavailable')));
    // Sedno Z172: błąd NIE cofa planu usera do defaultPlan.
    expect(result.current.plan.map((d) => d.dayName)).toEqual(['Mój dzień A']);
    expect(result.current.planError).toBe(true);
    expect(result.current.isLoaded).toBe(true);
  });

  it('niezmiennik: konto BEZ dokumentu planu dostaje defaultPlan (to legalne)', () => {
    const { result } = renderHook(() => useTrainingPlanReal('u1'), { wrapper });
    act(() => snapshotHandlers.onNext!({ exists: () => false, data: () => null, metadata: { fromCache: false, hasPendingWrites: false } }));

    expect(result.current.plan).toEqual(defaultPlan);
    expect(result.current.isCustom).toBe(false);
    expect(result.current.isLoaded).toBe(true);
  });
});
