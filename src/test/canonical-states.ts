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
import type { PlanCycle, PlanCycleChoice, PlanCycleChoiceEntry } from '@/types/cycles';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { buildPlanCycleChoice } from '@/lib/plan-cycle-choice';
import { addCalendarDays, calendarDayDiff, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { clampSet } from '@/lib/workout-sanitizers';
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
  | 'plan-future-start-wpc'
  | 'plan-midweek-done-wpc'
  | 'plan-future-start-done-today-wpb'
  | 'plan-active-done-today-wpb'
  | 'photos-before-after'
  | 'active-plan-rpe'
  | 'history-multi-cycle';

export const CANONICAL_STATE_IDS: CanonicalStateId[] = [
  'fresh-user',
  'active-plan',
  'plan-ended',
  'empty-history',
  'history-outside-cycles',
  'draft-open',
  'plan-future-start-wpc',
  'plan-midweek-done-wpc',
  'plan-future-start-done-today-wpb',
  'plan-active-done-today-wpb',
  'photos-before-after',
  'active-plan-rpe',
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

/** WP-6 (X33): odpowiedzi z kreatora na cyklu — TA SAMA logika co produkcyjny
 *  zapis (buildPlanCycleChoice z Onboarding/NewPlan), nie reczny obiekt.
 *  Domyslne odpowiedzi odpowiadaja dwudniowemu planowi kanonicznemu. */
export const buildCycleChoice = (
  entry: PlanCycleChoiceEntry,
  chosenAtISO: string,
  overrides: Partial<Parameters<typeof buildPlanCycleChoice>[0]> = {},
): PlanCycleChoice => buildPlanCycleChoice({
  level: 'intermediate',
  objective: 'build_muscle',
  daysPerWeek: 2,
  trainingDays: ['monday', 'wednesday'],
  planSource: 'recommended',
  templateId: 'tpl-fullbody-2',
  recommendedTemplateId: 'tpl-fullbody-2',
  planName: 'Mój plan siłowy',
  ...overrides,
}, entry, new Date(chosenAtISO));

/** Aktywny cykl 1:1 z usePlanCycles.createActiveCycle: endDate '' az do
 *  archiwizacji, id operacyjne cycle-{uid}-{startDate}, stats wyzerowane.
 *  `choice` (WP-6) tylko gdy podane — cykle sprzed X33 pola nie maja. */
const buildActiveCycle = (days: TrainingDay[], durationWeeks: number, startDate: string, choice?: PlanCycleChoice): PlanCycle => ({
  id: `cycle-${CANONICAL_UID}-${startDate}`,
  userId: CANONICAL_UID,
  days,
  durationWeeks,
  startDate,
  endDate: '',
  status: 'active',
  createdAt: `${startDate}T06:00:00.000Z`,
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  ...(choice ? { choice } : {}),
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

/** Bug 5 (X30): sesja z seriami typow Z105 (duration / assisted_bodyweight /
 *  weight_distance_duration) budowana przez clampSet — TA SAMA logika co
 *  produkcyjny zapis (workout-save). Roundtrip w canonical-states.test.ts
 *  pilnuje, ze hydracja nie obcina durationSec/distanceM/assistWeight/LWW. */
export const buildTypedSetsWorkout = (todayISO: string): WorkoutSession => {
  const startedAt = parseLocalDate(todayISO).getTime() + 17 * 3_600_000;
  return {
    id: `${CANONICAL_UID}_day-typed_${todayISO}_typed`,
    userId: CANONICAL_UID,
    dayId: 'day-typed',
    date: todayISO,
    completed: true,
    exercises: [
      {
        exerciseId: 'plank',
        name: 'Plank',
        sets: [clampSet({ reps: 1, weight: 0, completed: true, durationSec: 60, updatedAt: startedAt + 60_000, updatedEventId: 'evt-plank-1' })],
      },
      {
        exerciseId: 'assisted-pullup',
        name: 'Podciąganie wspomagane',
        sets: [clampSet({ reps: 8, weight: 0, completed: true, assistWeight: 30, updatedAt: startedAt + 120_000, updatedEventId: 'evt-pull-1' })],
      },
      {
        exerciseId: 'farmer-walk',
        name: "Farmer's Walk",
        sets: [clampSet({ reps: 0, weight: 40, completed: true, distanceM: 50, durationSec: 45, updatedAt: startedAt + 180_000, updatedEventId: 'evt-farmer-1' })],
      },
    ],
    dayName: 'Dzień typów Z105',
    dayFocus: 'Core',
    durationSec: 1800,
    startedAt,
    completedAt: startedAt + 1800 * 1000,
  };
};

/** Pomiar liczbowy: ksztalt zapisu addMeasurement sprzed 2026-08-13 (legacy,
 *  bez recordedAt — takie wpisy wciaz zyja w produkcji). Eksport: WP-M testy
 *  edycji buduja fixtury tymi samymi builderami co stany kanoniczne. */
export const buildMeasurement = (dateISO: string): BodyMeasurement => ({
  id: `measurement-${dateISO}`,
  userId: CANONICAL_UID,
  date: dateISO,
  weight: 83.5,
  waist: 88,
});

/** WP-M: pomiar z godzina wykonania — ksztalt zapisu addMeasurement od
 *  2026-08-13 (recordedAt epoch ms w obrebie dnia `date`). */
export const buildRecordedMeasurement = (dateISO: string, hour: number): BodyMeasurement => ({
  ...buildMeasurement(dateISO),
  id: `measurement-recorded-${dateISO}`,
  recordedAt: parseLocalDate(dateISO).getTime() + hour * 3_600_000,
});

/** Wpis pomiaru TYLKO-zdjecie (WP-D, X27): photoUrl bez zadnego pola liczbowego
 *  (validateMeasurement uznaje zdjecie za pelnoprawna wartosc). */
const buildPhotoOnlyMeasurement = (dateISO: string): BodyMeasurement => ({
  id: `measurement-photo-${dateISO}`,
  userId: CANONICAL_UID,
  date: dateISO,
  photoUrl: 'https://firebasestorage.googleapis.com/v0/b/app/o/body-photos%2Fcanonical.jpg?alt=media',
} as BodyMeasurement);

/** WP-E (X28): pomiar z waga i zdjeciem — ksztalt zapisu addMeasurement po
 *  udanym uploadzie foto (photoUrl + photoPath jak w Measurements.tsx). */
export const buildPhotoWeightMeasurement = (dateISO: string, weightKg: number): BodyMeasurement => ({
  id: `measurement-photo-weight-${dateISO}`,
  userId: CANONICAL_UID,
  date: dateISO,
  weight: weightKg,
  photoUrl: `https://firebasestorage.googleapis.com/v0/b/app/o/body-photos%2F${CANONICAL_UID}%2F${dateISO}.jpg?alt=media`,
  photoPath: `body-photos/${CANONICAL_UID}/${dateISO}.jpg`,
});

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
      // WP-6 (X33): aktywny cykl powstal z kreatora po cyklu (replan) i niesie
      // odpowiedzi; zamkniety cykl jest sprzed zapisu odpowiedzi (bez pola).
      const days = buildPlanDays(todayISO);
      const active = buildActiveCycle(days, durationWeeks, activeStart, buildCycleChoice('replan', `${activeStart}T06:00:00.000Z`, {
        trainingDays: days.map((day) => day.weekday),
      }));
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

    case 'plan-future-start-wpc': {
      // WP-C (X28): plan z data startu w PRZYSZLOSCI (replan z data startu,
      // WP-PLANS-2 X27) — planStarted=false, zero sesji, cykl aktywny czeka.
      // Start = poniedzialek dwa tygodnie w przod (ksztalt jak zapis startu).
      const days = buildPlanDays(todayISO);
      const futureStart = formatLocalDate(getStartOfPlanWeek(parseLocalDate(addCalendarDays(todayISO, 14))));
      const cycle = buildActiveCycle(days, durationWeeks, futureStart);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: futureStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [cycle],
      };
    }

    case 'plan-midweek-done-wpc': {
      // WP-C (X28): biezacy tydzien planu w CALOSCI ukonczony (dni planu
      // wypadaja przed dzisiaj) — "nastepny" trening musi wskoczyc do
      // kolejnego tygodnia. Wlasciwosc "tydzien zrobiony" wymaga todayISO
      // środa-niedziela (dni to wczoraj i przedwczoraj).
      const days: TrainingDay[] = [
        planDay('day-a', weekdayOf(addCalendarDays(todayISO, -2)), 'Dzień A', 'Push'),
        planDay('day-b', weekdayOf(addCalendarDays(todayISO, -1)), 'Dzień B', 'Pull'),
      ];
      const midStart = formatLocalDate(getStartOfPlanWeek(parseLocalDate(addCalendarDays(todayISO, -7))));
      const cycle = buildActiveCycle(days, durationWeeks, midStart);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: midStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [cycle],
        workouts: [
          buildWorkout('w1a', addCalendarDays(todayISO, -9), days[0], { cycleId: cycle.id }),
          buildWorkout('w1b', addCalendarDays(todayISO, -8), days[1], { cycleId: cycle.id }),
          buildWorkout('w2a', addCalendarDays(todayISO, -2), days[0], { cycleId: cycle.id }),
          buildWorkout('w2b', addCalendarDays(todayISO, -1), days[1], { cycleId: cycle.id }),
        ],
      };
    }

    case 'plan-future-start-done-today-wpb': {
      // WP-B (X28): plan ze startem w PRZYSZLOSCI (poniedzialek >=2 tygodnie
      // naprzod) + DZISIEJSZY ukonczony trening (ad-hoc/stary plan). Scenariusz
      // buga "NEXT SESSION sprzed startu": hero MUSI byc preStart, nigdy
      // completed z next liczonym czysta regula weekday sprzed startu.
      const days = buildPlanDays(todayISO);
      const futureStart = formatLocalDate(getStartOfPlanWeek(parseLocalDate(addCalendarDays(todayISO, 21))));
      const cycle = buildActiveCycle(days, durationWeeks, futureStart);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: futureStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [cycle],
        workouts: [buildWorkout('today', todayISO, days[0], { cycleId: cycle.id })],
      };
    }

    case 'plan-active-done-today-wpb': {
      // WP-B (X28): plan wystartowany + DZISIEJSZA ukonczona sesja — baner
      // "Trening ukonczony" z zamykaniem (dismiss per data).
      const days = buildPlanDays(todayISO);
      const cycle = buildActiveCycle(days, durationWeeks, activeStart);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: activeStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [cycle],
        workouts: [buildWorkout('today', todayISO, days[0], { cycleId: cycle.id })],
      };
    }

    case 'photos-before-after': {
      // WP-E (X28): dwa zdjecia sylwetki z wagami (przed/po) + pomiar liczbowy
      // w srodku — stan eksportu porownania before/after (BodyPhotoCompare).
      const days = buildPlanDays(todayISO);
      const cycle = buildActiveCycle(days, durationWeeks, activeStart);
      return {
        ...base,
        plan: { days, durationWeeks, startDate: activeStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [cycle],
        measurements: [
          buildPhotoWeightMeasurement(addCalendarDays(todayISO, -60), 84),
          buildMeasurement(addCalendarDays(todayISO, -30)),
          buildPhotoWeightMeasurement(addCalendarDays(todayISO, -1), 80.5),
        ],
      };
    }

    case 'active-plan-rpe': {
      // WP-D (X28): wariant active-plan z autoregulacja (rpe/pain/quality per
      // cwiczenie — optionalFinite w sanitizeWorkoutDoc) i progresem ciezaru
      // DZIS vs tydzien temu. Fixtura dla RzaMetricsCard (menu wykresow) i
      // chipow PR w restyle'u tygodni (PR w biezacym tygodniu).
      const days = buildPlanDays(todayISO);
      const cycle = buildActiveCycle(days, durationWeeks, activeStart);
      const withMetrics = (workout: WorkoutSession, weightDelta: number): WorkoutSession => ({
        ...workout,
        exercises: workout.exercises.map((exercise) => ({
          ...exercise,
          rpe: 8,
          pain: 1,
          quality: 4,
          sets: exercise.sets.map((set) => ({ ...set, weight: set.weight + weightDelta })),
        })),
      });
      return {
        ...base,
        plan: { days, durationWeeks, startDate: activeStart, status: 'active', name: 'Mój plan siłowy' },
        cycles: [cycle],
        workouts: [
          withMetrics(buildWorkout('rpe-now', todayISO, days[0], { cycleId: cycle.id }), 10),
          withMetrics(buildWorkout('rpe-prev', addCalendarDays(todayISO, -7), days[0], { cycleId: cycle.id }), 0),
        ],
        measurements: [buildMeasurement(addCalendarDays(todayISO, -2))],
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
    hasServerSnapshot: true,
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
    // WP-M: edycja/usuwanie wpisu pomiaru (Measurements.tsx destrukturyzuje oba).
    updateMeasurement: async () => ({ measurement: null }),
    deleteMeasurement: async () => ({ ok: true }),
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
  hasServerSnapshot: true,
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

// X36: Analityka domyślna w Postępach — SummaryTab czyta useWorkoutRange.
export const buildUseWorkoutRangeResult = (state: CanonicalState) => ({
  workouts: state.workouts,
  isLoaded: true,
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
