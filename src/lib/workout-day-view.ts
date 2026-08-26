import type { TrainingDay, Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import type { TrackingType } from '@/lib/set-tracking';

// Widok dnia treningu składany z planu + draftu.
//
// INCYDENT 2026-07-20: dzień był budowany WYŁĄCZNIE z kluczy `draft.exerciseSets`,
// więc gdy draft miał tylko jedno dotknięte ćwiczenie (powrót do treningu po szybkim
// treningu, sesja wznowiona bez pre-fillu), reszta ćwiczeń planu ZNIKAŁA z ekranu —
// nie dało się ich zalogować i przepadały z treningu.
//
// Kontrakt: plan jest BAZĄ (nic z niego nie znika), draft może tylko DOKŁADAĆ
// (ćwiczenia dodane w locie) i nadpisywać nazwę (swap "tylko dziś").

export interface DraftDaySnapshot {
  dayId: string;
  dayName?: string;
  dayFocus?: string;
  exerciseSets: Record<string, SetData[]>;
  exerciseNames?: Record<string, string>;
}

const workingSetsLabel = (sets: SetData[]): string =>
  `${sets.filter((set) => !set.isWarmup).length} serii`;

export const buildDayFromDraft = (
  baseDay: TrainingDay | undefined,
  draft: DraftDaySnapshot,
): TrainingDay => {
  const names = draft.exerciseNames ?? {};
  const planExercises = baseDay?.exercises ?? [];
  const planIds = new Set(planExercises.map((exercise) => exercise.id));

  // Z185 (samonaprawa): klucz draftu `${planId}__swap-...` to swap "tylko dziś" —
  // ZASTĘPUJE kartę planu planId zamiast dokładać drugą (po restarcie mapa
  // sessionSwaps w stanie Reacta nie istnieje i draft renderował DWIE karty).
  // Wyjątek: gdy draft anormalnie ma też klucz planu, karta planu zostaje,
  // a swap idzie do extras (reprezentacja bez utraty możliwości edycji).
  const swapKeyByPlanId = new Map<string, string>();
  for (const key of Object.keys(draft.exerciseSets)) {
    if (planIds.has(key)) continue;
    const planId = planExercises.find((exercise) => key.startsWith(`${exercise.id}__swap-`))?.id;
    if (planId && !draft.exerciseSets[planId] && !swapKeyByPlanId.has(planId)) {
      swapKeyByPlanId.set(planId, key);
    }
  }
  const claimedSwapKeys = new Set(swapKeyByPlanId.values());

  // 1. Ćwiczenia planu — ZAWSZE wszystkie, w kolejności planu.
  const fromPlan: Exercise[] = planExercises.map((exercise) => {
    const swapKey = swapKeyByPlanId.get(exercise.id);
    if (swapKey) {
      return {
        id: swapKey,
        name: names[swapKey] || exercise.name,
        sets: workingSetsLabel(draft.exerciseSets[swapKey]),
        instructions: [],
      };
    }
    const draftSets = draft.exerciseSets[exercise.id];
    return {
      ...exercise,
      name: names[exercise.id] || exercise.name,
      // Etykieta z liczby serii tylko dla ćwiczeń realnie śledzonych w drafcie;
      // nietknięte zostają z zakresem z planu ("4 x 6-8").
      sets: draftSets ? workingSetsLabel(draftSets) : exercise.sets,
    };
  });

  // 2. Ćwiczenia spoza planu (szybki trening, dodane w locie) — na końcu, w kolejności draftu.
  const extras: Exercise[] = Object.entries(draft.exerciseSets)
    .filter(([exerciseId]) => !planIds.has(exerciseId) && !claimedSwapKeys.has(exerciseId))
    .map(([exerciseId, sets]) => ({
      id: exerciseId,
      name: names[exerciseId] || exerciseId,
      sets: workingSetsLabel(sets),
      instructions: [],
    }));

  return {
    id: draft.dayId,
    dayName: draft.dayName || baseDay?.dayName || draft.dayId,
    weekday: baseDay?.weekday ?? 'monday',
    focus: draft.dayFocus || baseDay?.focus || '',
    exercises: [...fromPlan, ...extras],
  };
};

/** Bug 5 (X30): seed stanu widoku z sesji Firestore. Kopiuje CALY ksztalt serii
 *  (spread), bo enumeracja pol w WorkoutDay obcinala durationSec/distanceM/
 *  assistWeight/updatedAt/updatedEventId — sesja po powrocie gubila typy Z105.
 *  Defaulty reps/weight/completed zostaja dla legacy dokumentow bez tych pol. */
export const seedSetsFromSession = (sets: SetData[]): SetData[] =>
  sets.map((set) => ({
    ...set,
    reps: set.reps ?? 0,
    weight: set.weight ?? 0,
    completed: set.completed ?? false,
  }));

/** Czy trening ma cokolwiek do zapisania (>=1 odhaczona seria robocza lub rozgrzewkowa). */
export const hasAnyCompletedSet = (exerciseSets: Record<string, SetData[]>): boolean =>
  Object.values(exerciseSets).some((sets) => sets.some((set) => set.completed));

/**
 * Z131: metryki nagłówka aktywnej sesji. Liczą się WYŁĄCZNIE ukończone serie
 * robocze — rozgrzewka nie jest pracą do raportowania. Tonaż w kg (kanonicznie),
 * konwersja jednostek dopiero w UI.
 */
export const sessionStats = (
  exerciseSets: Record<string, SetData[]>,
): { volumeKg: number; completedSets: number } =>
  Object.values(exerciseSets)
    .flat()
    .reduce(
      (acc, set) => (set.completed && !set.isWarmup
        ? { volumeKg: acc.volumeKg + set.reps * set.weight, completedSets: acc.completedSets + 1 }
        : acc),
      { volumeKg: 0, completedSets: 0 },
    );

/** Z174: wspólny licznik odhaczonych serii ROBOCZYCH — Dashboard liczył z
 *  rozgrzewką i rozjeżdżał się z ekranem treningu ("Odhaczone serie: 0/4"). */
export const countCompletedWorkingSets = (exerciseSets: Record<string, SetData[]>): number =>
  sessionStats(exerciseSets).completedSets;

/** WP-D (X37): komplet danych serii wg typu śledzenia. Progi zgodne z tym, co
 *  karta pokazuje jako wpisaną wartość (0 = puste pole). */
const hasCompleteSetData = (set: SetData, tracking: TrackingType): boolean => {
  switch (tracking) {
    case 'weight_reps':
      return set.reps > 0 && set.weight > 0;
    case 'bodyweight_reps':
    case 'assisted_bodyweight':
      return set.reps > 0;
    case 'duration':
      return (set.durationSec ?? 0) > 0;
    case 'weight_distance_duration':
      return (set.distanceM ?? 0) > 0 || (set.durationSec ?? 0) > 0;
  }
};

/**
 * WP-D (X37): przy "Zakończ trening" serie ROBOCZE z kompletem danych, ale bez
 * odhaczenia, dostają completed=true (świadomie inaczej niż Hevy, które pomija
 * je po cichu). Puste zostają puste, rozgrzewka (`isWarmup`) nietknięta.
 * Czysta: nie mutuje wejścia; ćwiczenia bez zmian zachowują tę samą referencję
 * tablicy, a `changedExerciseIds` mówi, które trzeba przepuścić przez ścieżkę
 * zapisu (handleSetsChange), żeby draft/IDB i PR-y były spójne z ręcznym odhaczeniem.
 */
export const autoCompleteFilledSets = (
  exerciseSets: Record<string, SetData[]>,
  trackingOf: (exerciseId: string) => TrackingType,
): { exerciseSets: Record<string, SetData[]>; autoCompleted: number; changedExerciseIds: string[] } => {
  const next: Record<string, SetData[]> = {};
  const changedExerciseIds: string[] = [];
  let autoCompleted = 0;

  for (const [exerciseId, sets] of Object.entries(exerciseSets)) {
    const tracking = trackingOf(exerciseId);
    let changed = false;
    const nextSets = sets.map((set) => {
      if (set.isWarmup || set.completed || !hasCompleteSetData(set, tracking)) return set;
      changed = true;
      autoCompleted += 1;
      return { ...set, completed: true };
    });
    next[exerciseId] = changed ? nextSets : sets;
    if (changed) changedExerciseIds.push(exerciseId);
  }

  return { exerciseSets: next, autoCompleted, changedExerciseIds };
};

/** Forma liczebnika PL dla "N serii" (1 seria / 2-4 serie / 5+ serii, z regułą 22-24). */
export const plSetsPluralForm = (n: number): 'one' | 'few' | 'many' => {
  if (n === 1) return 'one';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'few';
  return 'many';
};
