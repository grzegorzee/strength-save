// WP-G (X27), zasada 11 CLAUDE.md: kanoniczne stany danych jako JEDYNE zrodlo
// fixtur dokumentow Firestore. Kazdy stan jest budowany kszaltem produkcyjnego
// zapisu (zrodla prawdy wskazane przy polach), a test canonical-states.test.ts
// pilnuje zgodnosci roundtripem przez sanitizery z firestore-doc-guards
// (sanitize(doc) toEqual doc). Reczny fixture dokumentu poza tym modulem jest
// podejrzany w review.
//
// Stany obowiazkowe (zasada 11): swiezy user bez planu, aktywny plan + cykl
// z endDate '', plan zakonczony (status 'ended', WP-PLANS-1), historia pusta,
// sesje poza cyklami. Dodatkowo draft-open (otwarta sesja) dla Dashboardu.

import { trainingPlan as defaultPlanDays, type TrainingDay, type Weekday } from '@/data/trainingPlan';
import type { BodyMeasurement, WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { addCalendarDays, calendarDayDiff, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';
import { mapAppUserProfile, type UserProfile } from '@/lib/user-profile';
import type { AppUserProfile } from '@/lib/registration-api';
import type { TrainingPlanStatus } from '@/lib/firestore-doc-guards';

export type CanonicalStateId =
  | 'fresh-user'
  | 'active-plan'
  | 'plan-ended'
  | 'empty-history'
  | 'history-outside-cycles'
  | 'draft-open'
  | 'history-multi-cycle';

export const CANONICAL_STATE_IDS: CanonicalStateId[] = [
  'fresh-user',
  'active-plan',
  'plan-ended',
  'empty-history',
  'history-outside-cycles',
  'draft-open',
  'history-multi-cycle',
];

/** Dokument training_plans/{uid} w polach, ktore konsumuje useTrainingPlan
 *  (schemat zamkniety: firestore.rules validTrainingPlanShape + WP-PLANS-1/2). */
export interface CanonicalPlanDoc {
  days: TrainingDay[];
  durationWeeks: number;
  startDate: string;
  status: TrainingPlanStatus;
  name: string | null;
}

export interface CanonicalState {
  id: CanonicalStateId;
  todayISO: string;
  /** null = brak dokumentu training_plans (konto na planie domyslnym). */
  plan: CanonicalPlanDoc | null;
  cycles: PlanCycle[];
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
  profile: UserProfile;
  draft: ActiveWorkoutDraft | null;
}

export const CANONICAL_UID = 'canonical-user-1';

const WEEKDAY_NAMES: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const weekdayOf = (iso: string): Weekday => WEEKDAY_NAMES[parseLocalDate(iso).getDay()];

/** Profil przez produkcyjny mapper (mapAppUserProfile), nie reczny obiekt. */
const buildProfile = (todayISO: string): UserProfile => {
  const raw: AppUserProfile = {
    uid: CANONICAL_UID,
    email: 'qa@strengthsave.app',
    displayName: 'QA Kanoniczny',
    photoURL: '',
    role: 'user',
    access: { enabled: true },
    status: 'active',
    auth: { primaryProvider: 'password' },
    onboardingCompleted: true,
    verification: { emailVerifiedAt: `${todayISO}T08:00:00.000Z` },
    registration: { source: 'email' },
    cohorts: [],
    preferences: { unit: 'kg', language: 'pl' },
  };
  return mapAppUserProfile(CANONICAL_UID, raw, {
    userId: CANONICAL_UID,
    email: raw.email,
    displayName: raw.displayName,
    photoURL: raw.photoURL,
  });
};

/** Dzien planu: ksztalt zapisu edytora planu (sanitizeTrainingPlanDays 1:1). */
const planDay = (id: string, weekday: Weekday, dayName: string, focus: string): TrainingDay => ({
  id,
  dayName,
  weekday,
  focus,
  exercises: [
    { id: `${id}-ex-1`, name: 'Przysiad ze sztangą', sets: '3 x 5', instructions: [] },
    { id: `${id}-ex-2`, name: 'Wyciskanie sztangi', sets: '3 x 8', instructions: [] },
  ],
});

/** Dwa dni planu zakotwiczone o "dzis" (jeden wypada dzisiaj), jak plan usera. */
const buildPlanDays = (todayISO: string): TrainingDay[] => [
  planDay('day-a', weekdayOf(todayISO), 'Dzień A', 'Push'),
  planDay('day-b', weekdayOf(addCalendarDays(todayISO, 2)), 'Dzień B', 'Pull'),
];

/** Aktywny cykl 1:1 z usePlanCycles.createActiveCycle: endDate '' az do
 *  archiwizacji, id operacyjne cycle-{uid}-{startDate}, stats wyzerowane. */
const buildActiveCycle = (days: TrainingDay[], durationWeeks: number, startDate: string): PlanCycle => ({
  id: `cycle-${CANONICAL_UID}-${startDate}`,
  userId: CANONICAL_UID,
  days,
  durationWeeks,
  startDate,
  endDate: '',
  status: 'active',
  createdAt: `${startDate}T06:00:00.000Z`,
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
});

/** Cykl zarchiwizowany (archiveCurrentPlan): endDate ustawione, status completed,
 *  stats policzone przy zamknieciu. */
const buildCompletedCycle = (days: TrainingDay[], durationWeeks: number, startDate: string, endDate: string): PlanCycle => ({
  id: `cycle-${CANONICAL_UID}-${startDate}`,
  userId: CANONICAL_UID,
  days,
  durationWeeks,
  startDate,
  endDate,
  status: 'completed',
  createdAt: `${startDate}T06:00:00.000Z`,
  stats: { totalWorkouts: 8, totalTonnage: 24000, prs: [{ exerciseName: 'Przysiad ze sztangą', weight: 110, estimated1RM: 124 }], completionRate: 80 },
});

/** Sesja treningowa: ksztalt finalnego zapisu syncu (sanitizeWorkoutDoc 1:1). */
const buildWorkout = (
  idSuffix: string,
  dateISO: string,
  day: TrainingDay,
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession => {
  const startedAt = parseLocalDate(dateISO).getTime() + 17 * 3_600_000;
  return {
    id: `${CANONICAL_UID}_${day.id}_${dateISO}_${idSuffix}`,
    userId: CANONICAL_UID,
    dayId: day.id,
    date: dateISO,
    completed: true,
    exercises: day.exercises.map((exercise) => ({
      exerciseId: exercise.id,
      name: exercise.name,
      sets: [
        { reps: 5, weight: 80, completed: true },
        { reps: 5, weight: 85, completed: true },
      ],
    })),
    dayName: day.dayName,
    dayFocus: day.focus,
    durationSec: 3600,
    startedAt,
    completedAt: startedAt + 3600 * 1000,
    ...overrides,
  };
};

/** Pomiar liczbowy: ksztalt zapisu addMeasurement (kg/cm kanoniczne). */
const buildMeasurement = (dateISO: string): BodyMeasurement => ({
  id: `measurement-${dateISO}`,
  userId: CANONICAL_UID,
  date: dateISO,
  weight: 83.5,
  waist: 88,
});

/** Wpis pomiaru TYLKO-zdjecie (WP-D, X27): photoUrl bez zadnego pola liczbowego
 *  (validateMeasurement uznaje zdjecie za pelnoprawna wartosc). */
const buildPhotoOnlyMeasurement = (dateISO: string): BodyMeasurement => ({
  id: `measurement-photo-${dateISO}`,
  userId: CANONICAL_UID,
  date: dateISO,
  photoUrl: 'https://firebasestorage.googleapis.com/v0/b/app/o/body-photos%2Fcanonical.jpg?alt=media',
} as BodyMeasurement);

/** Otwarty draft sesji: ksztalt workout-draft-db.ActiveWorkoutDraft. */
const buildDraft = (todayISO: string, day: TrainingDay, cycleId: string | null): ActiveWorkoutDraft => {
  const startedAt = parseLocalDate(todayISO).getTime() + 17 * 3_600_000;
  return {
    sessionId: `${CANONICAL_UID}_${day.id}_${todayISO}`,
    userId: CANONICAL_UID,
    dayId: day.id,
    date: todayISO,
    cycleId,
    sessionOrigin: 'remote',
    remoteSessionId: `${CANONICAL_UID}_${day.id}_${todayISO}`,
    exerciseSets: { [day.exercises[0].id]: [{ reps: 5, weight: 80, completed: true }] },
    exerciseNotes: {},
    exerciseMetrics: {},
    dayNotes: '',
    dayName: day.dayName,
    dayFocus: day.focus,
    skippedExercises: [],
    startedAt,
    lastActivityAt: startedAt + 10 * 60_000,
    updatedAt: startedAt + 10 * 60_000,
    lastFirebaseSyncAt: startedAt,
    dirty: true,
    completedLocally: false,
    finalSyncPending: false,
    version: 2,
  };
};

export const buildCanonicalState = (
  id: CanonicalStateId,
  todayISO: string = formatLocalDate(new Date()),
): CanonicalState => {
  const profile = buildProfile(todayISO);
  // Start planu: poniedzialek 3 tygodnie wstecz, jak liczy go produkcyjny zapis
  // (cycle-actions wymusza formatLocalDate(getStartOfPlanWeek(...)) na starcie).
  const activeStart = formatLocalDate(getStartOfPlanWeek(parseLocalDate(addCalendarDays(todayISO, -21))));
  const durationWeeks = 8;
  const base: CanonicalState = {
    id,
    todayISO,
    plan: null,
    cycles: [],
    workouts: [],
    measurements: [],
    profile,
    draft: null,
  };

  switch (id) {
    case 'fresh-user':
      // Brak dokumentu training_plans: useTrainingPlan ustawia defaultPlan,
      // isCustom=false, planStatus 'none'. Zero cykli, zero historii.
      return base;

    case 'active-plan': {
      const days = buildPlanDays(todayISO);
      const cycle = buildActiveCycle(days, durationWeeks, activeStart);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: activeStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [cycle],
        workouts: [
          buildWorkout('a', addCalendarDays(todayISO, -1), days[0], { cycleId: cycle.id }),
          buildWorkout('b', addCalendarDays(todayISO, -3), days[1], { cycleId: cycle.id }),
        ],
        measurements: [
          buildMeasurement(addCalendarDays(todayISO, -2)),
          buildPhotoOnlyMeasurement(addCalendarDays(todayISO, -1)),
        ],
      };
    }

    case 'plan-ended': {
      // WP-PLANS-1: training_plans.status 'ended', cykl zarchiwizowany.
      const days = buildPlanDays(todayISO);
      const endedStart = formatLocalDate(getStartOfPlanWeek(parseLocalDate(addCalendarDays(todayISO, -70))));
      const endedEnd = addCalendarDays(endedStart, durationWeeks * 7);
      const cycle = buildCompletedCycle(days, durationWeeks, endedStart, endedEnd);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: endedStart, status: 'ended', name: 'Mój plan siłowy' },
        cycles: [cycle],
        workouts: [
          buildWorkout('a', addCalendarDays(endedStart, 1), days[0], { cycleId: cycle.id }),
          buildWorkout('b', addCalendarDays(endedStart, 3), days[1], { cycleId: cycle.id }),
        ],
      };
    }

    case 'empty-history': {
      // Aktywny plan + cykl, ale zero sesji (user tuz po starcie planu).
      const days = buildPlanDays(todayISO);
      const cycle = buildActiveCycle(days, durationWeeks, activeStart);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: activeStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [cycle],
      };
    }

    case 'history-outside-cycles': {
      // Sesje bez cycleId i sprzed pierwszego cyklu (np. import CSV) obok
      // zamknietego cyklu. Historia musi je pokazac w "Poza cyklami".
      const days = buildPlanDays(todayISO);
      const pastStart = formatLocalDate(getStartOfPlanWeek(parseLocalDate(addCalendarDays(todayISO, -140))));
      const pastEnd = addCalendarDays(pastStart, durationWeeks * 7);
      const cycle = buildCompletedCycle(days, durationWeeks, pastStart, pastEnd);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: pastStart, status: 'active', name: null },
        cycles: [cycle],
        workouts: [
          buildWorkout('in', addCalendarDays(pastStart, 2), days[0], { cycleId: cycle.id }),
          buildWorkout('out-a', addCalendarDays(pastStart, -30), days[0]),
          buildWorkout('out-b', addCalendarDays(todayISO, -2), days[1]),
        ],
      };
    }

    case 'history-multi-cycle': {
      // WP-H (X28): aktywny cykl w polowie + zamkniety cykl przeszly + sesja
      // poza cyklami + draft. Stan pod Historie v2 (kafle cykli, poziom cyklu,
      // pelna lista) — te same buildery co pozostale stany.
      const days = buildPlanDays(todayISO);
      const active = buildActiveCycle(days, durationWeeks, activeStart);
      const pastStart = formatLocalDate(getStartOfPlanWeek(parseLocalDate(addCalendarDays(todayISO, -140))));
      const pastEnd = addCalendarDays(pastStart, durationWeeks * 7);
      const past = buildCompletedCycle(days, durationWeeks, pastStart, pastEnd);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: activeStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [active, past],
        workouts: [
          buildWorkout('a', addCalendarDays(todayISO, -1), days[0], { cycleId: active.id }),
          buildWorkout('draft', addCalendarDays(todayISO, -2), days[0], {
            cycleId: active.id,
            completed: false,
            durationSec: undefined,
            completedAt: undefined,
          }),
          buildWorkout('b', addCalendarDays(todayISO, -3), days[1], { cycleId: active.id }),
          buildWorkout('p1', addCalendarDays(pastStart, 2), days[0], { cycleId: past.id }),
          buildWorkout('out', addCalendarDays(pastStart, -20), days[1]),
        ],
      };
    }

    case 'draft-open': {
      // Aktywny plan + otwarta (nieukonczona) sesja dzisiejsza w drafcie.
      const days = buildPlanDays(todayISO);
      const cycle = buildActiveCycle(days, durationWeeks, activeStart);
      const openWorkout = buildWorkout('open', todayISO, days[0], {
        cycleId: cycle.id,
        completed: false,
        durationSec: undefined,
        completedAt: undefined,
      });
      return {
        ...base,
        plan: { days, durationWeeks, startDate: activeStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [cycle],
        workouts: [
          openWorkout,
          buildWorkout('done', addCalendarDays(todayISO, -2), days[1], { cycleId: cycle.id }),
        ],
        draft: buildDraft(todayISO, days[0], cycle.id),
      };
    }
  }
};

// ---------------------------------------------------------------------------
// Wspolny scaffolding mocków hooków danych dla route sweepa (Task G2).
// Fabryki sa czyste (bez vi.fn) — route-smoke.test.tsx podpina je w vi.mock.
// Zwrotki odwzorowuja kontrakty realnych hooków (pola jak w ich `return {}`).
// ---------------------------------------------------------------------------

const ok = async () => ({ success: true });

export const buildUseCurrentUserResult = (state: CanonicalState) => ({
  uid: CANONICAL_UID,
  profile: state.profile,
  isAdmin: false,
  hasAppAccess: true,
  needsEmailVerification: false,
  isSuspended: false,
  canUseStrava: false,
  canUseBodyPhotos: true,
  isNewUser: false,
  profileLoaded: true,
  profileLoadError: null,
});

export const buildUseTrainingPlanResult = (state: CanonicalState) => {
  const startDate = state.plan?.startDate ?? null;
  const durationWeeks = state.plan?.durationWeeks ?? 12;
  let currentWeek = 1;
  let planStarted = true;
  let isPlanExpired = false;
  if (startDate) {
    const diff = calendarDayDiff(startDate, state.todayISO);
    planStarted = diff >= 0;
    currentWeek = planStarted ? Math.min(Math.floor(diff / 7) + 1, durationWeeks) : 1;
    isPlanExpired = diff >= durationWeeks * 7;
  }
  return {
    plan: state.plan?.days ?? defaultPlanDays,
    isLoaded: true,
    planError: false,
    isCustom: state.plan !== null,
    planStatus: (state.plan ? state.plan.status : 'none') as 'active' | 'ended' | 'none',
    setPlanStatus: ok,
    planName: state.plan?.name ?? null,
    scheduleOverrides: {},
    moveScheduledDay: ok,
    skippedDates: [] as string[],
    setDaySkipped: ok,
    skipPastDates: ok,
    reducedMode: null,
    setReducedMode: ok,
    vacation: null,
    setVacation: ok,
    planDurationWeeks: durationWeeks,
    planStartDate: startDate,
    progression: null,
    currentWeek,
    isPlanExpired,
    weeksRemaining: Math.max(0, durationWeeks - currentWeek),
    planStarted,
    savePlan: ok,
    saveDeloadDecision: ok,
    swapExercise: ok,
    updateExerciseSets: ok,
    removeExercise: ok,
    addExercise: ok,
    moveExercise: ok,
    resetToDefault: ok,
  };
};

export const buildUseFirebaseWorkoutsResult = (state: CanonicalState) => {
  const completed = state.workouts.filter((w) => w.completed);
  const latestFirst = [...state.measurements].sort((a, b) => b.date.localeCompare(a.date));
  return {
    workouts: state.workouts,
    measurements: state.measurements,
    isLoaded: true,
    error: null,
    workoutsFromCache: false,
    createWorkoutSession: async () => ({ session: null }),
    createOfflineWorkoutSession: async () => ({ session: null }),
    batchSaveWorkout: ok,
    getWorkoutSessionFromServer: async () => null,
    getWorkoutsByDay: (dayId: string) => state.workouts.filter((w) => w.dayId === dayId),
    getTodaysWorkout: (dayId: string) =>
      state.workouts.find((w) => w.dayId === dayId && w.date === state.todayISO) ?? null,
    getLatestWorkout: () => completed[0] ?? null,
    addMeasurement: async () => ({ measurement: null }),
    getLatestMeasurement: () => latestFirst[0] ?? null,
    getTotalWeight: () =>
      completed.reduce(
        (total, w) => total + w.exercises.reduce(
          (acc, ex) => acc + ex.sets.reduce((s, set) => s + (set.completed ? set.reps * set.weight : 0), 0),
          0,
        ),
        0,
      ),
    getCompletedWorkoutsCount: () => completed.length,
    exportData: () => ({ workouts: state.workouts, measurements: state.measurements }),
    importData: ok,
    importCsvSessions: async () => ({ success: true, written: 0 }),
    deleteImportBatch: ok,
    deleteWorkout: ok,
    cleanupEmptyWorkouts: async () => ({ success: true, removed: 0 }),
    backfillHistoricalWorkouts: async () => undefined,
    isProvisionalWorkoutSessionId: () => false,
  };
};

export const buildUsePlanCyclesResult = (state: CanonicalState) => ({
  cycles: state.cycles,
  isLoaded: true,
  getActiveCycle: () => state.cycles.find((c) => c.status === 'active') ?? null,
  archiveCurrentPlan: async () => null,
  createActiveCycle: async () => null,
  getCycleById: (id: string) => state.cycles.find((c) => c.id === id) ?? null,
  mergeContinuousCycles: ok,
  deleteCycle: ok,
});

export const buildUseActivitiesResult = () => ({
  activities: [],
  stravaActivities: [],
  manualActivities: [],
  connection: { connected: false },
  addActivity: ok,
  updateActivity: ok,
  deleteActivity: ok,
  isLoaded: true,
});

export const buildUseWorkoutHistoryPageResult = (state: CanonicalState) => ({
  workouts: state.workouts,
  isLoaded: true,
  isLoadingMore: false,
  hasMore: false,
  loadMore: () => undefined,
  error: null,
});

export const buildUseSubscriptionResult = () => ({
  isPro: false,
  tier: 'none',
  startedAt: null,
  expiresAt: null,
  subscription: null,
  loading: false,
  refresh: async () => undefined,
});

export const buildUseAuthResult = (state: CanonicalState) => ({
  user: {
    uid: CANONICAL_UID,
    email: state.profile.email,
    displayName: state.profile.displayName,
    photoURL: state.profile.photoURL,
  },
  loading: false,
  error: null,
  isAuthenticated: true,
  signInWithGoogle: ok,
  signInWithApple: ok,
  registerWithEmail: ok,
  loginWithEmail: ok,
  resetPassword: ok,
  logout: async () => undefined,
  logoutAfterAccountDeletion: async () => undefined,
});

export const buildUseCustomExercisesResult = () => ({
  customExercises: [],
  addCustomExercise: ok,
  removeCustomExercise: ok,
  isLoaded: true,
});
