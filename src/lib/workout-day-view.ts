import type { TrainingDay, Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import { hasCompleteSetData, type TrackingType } from '@/lib/set-tracking';

// Widok dnia treningu składany z planu + draftu.
//
// INCYDENT 2026-07-20: dzień był budowany WYŁĄCZNIE z kluczy `draft.exerciseSets`,
// więc gdy draft miał tylko jedno dotknięte ćwiczenie (powrót do treningu po szybkim
// treningu, sesja wznowiona bez pre-fillu), reszta ćwiczeń planu ZNIKAŁA z ekranu —
// nie dało się ich zalogować i przepadały z treningu.
//
// Kontrakt: plan jest BAZĄ (nic z niego nie znika), draft może tylko DOKŁADAĆ
// (ćwiczenia dodane w locie) i nadpisywać nazwę (swap "tylko dziś").

export type SessionSwapMap = Record<string, { id: string; name: string; sets: string; videoUrl?: string }>;

export interface DraftDaySnapshot {
  dayId: string;
  dayName?: string;
  dayFocus?: string;
  exerciseSets: Record<string, SetData[]>;
  exerciseNames?: Record<string, string>;
  /** Z185/F4: jawny rekord zamian w sesji (stary id -> nowy id). */
  sessionSwaps?: SessionSwapMap;
}

const workingSetsLabel = (sets: SetData[]): string =>
  `${sets.filter((set) => !set.isWarmup).length} serii`;

type DaySlot =
  | { kind: 'plan'; planIndex: number }
  | { kind: 'swap'; planIndex: number; key: string }
  | { kind: 'draft'; key: string };

/**
 * Jedno źródło kolejności dnia (widok ORAZ kolejność kluczy draftu, z której
 * powstaje payload historii). Plan jest bazą; sesja tylko mapuje i dokłada.
 *
 * - Z185: klucz draftu `${planId}__swap-...` (albo jawny `sessionSwaps[planId]`)
 *   ZASTĘPUJE kartę planu, gdy draft nie ma klucza planu.
 * - F4: stare ćwiczenie zostawione w sesji (miało odhaczone serie) stoi tuż przed
 *   swoją zamianą; zamiana zostawionej karty planu stoi tuż za nią (łańcuch
 *   `sessionSwaps`, także podwójny swap).
 * - F4 odwrotne dopasowanie (sesja w toku ze starego buildu): klucz X nieobecny
 *   w planie, plan ma `X__swap-*` (zamiana na stałe) => X na pozycji zamiany.
 * - Reszta (szybki trening, dodane w locie) na końcu, w kolejności draftu.
 */
const resolveDaySlots = (
  planIdsList: string[],
  draftKeys: string[],
  sessionSwaps: SessionSwapMap = {},
): DaySlot[] => {
  const inDraft = new Set(draftKeys);
  const planIds = new Set(planIdsList);
  const placed = new Set<string>();
  const slots: DaySlot[] = [];

  const unplacedDraftKey = (key: string | undefined): key is string => (
    !!key && inDraft.has(key) && !planIds.has(key) && !placed.has(key)
  );
  const placeDraft = (key: string, kind: 'draft' | 'swap', planIndex = -1) => {
    placed.add(key);
    slots.push(kind === 'swap' ? { kind, key, planIndex } : { kind, key });
  };
  // Łańcuch zamian w sesji za kartą `fromId` (X -> a -> b), tylko jawny rekord.
  const placeFollowers = (fromId: string) => {
    let next = sessionSwaps[fromId]?.id;
    while (unplacedDraftKey(next)) {
      placeDraft(next, 'draft');
      next = sessionSwaps[next]?.id;
    }
  };

  // Zamiana, która zastępuje kartę planu (draft nie ma klucza planu).
  const replacementFor = (planId: string): string | undefined => {
    if (inDraft.has(planId)) return undefined;
    const recorded = sessionSwaps[planId]?.id;
    if (unplacedDraftKey(recorded)) return recorded;
    return draftKeys.find((key) => unplacedDraftKey(key) && key.startsWith(`${planId}__swap-`));
  };
  const replacements = new Map<string, string>();
  planIdsList.forEach((planId) => {
    const key = replacementFor(planId);
    if (key && ![...replacements.values()].includes(key)) replacements.set(planId, key);
  });
  const claimed = new Set(replacements.values());

  // Poprzednicy karty planu: stare klucze, które ta pozycja zastąpiła.
  const isPredecessorOf = (key: string, planId: string): boolean => (
    !claimed.has(key)
    && (sessionSwaps[key]?.id === planId || planId.startsWith(`${key}__swap-`))
  );

  planIdsList.forEach((planId, planIndex) => {
    draftKeys
      .filter((key) => unplacedDraftKey(key) && isPredecessorOf(key, planId))
      .forEach((key) => placeDraft(key, 'draft'));

    const swapKey = replacements.get(planId);
    if (swapKey) {
      placeDraft(swapKey, 'swap', planIndex);
      placeFollowers(swapKey);
    } else {
      placed.add(planId);
      slots.push({ kind: 'plan', planIndex });
      placeFollowers(planId);
    }
  });

  draftKeys.filter((key) => unplacedDraftKey(key)).forEach((key) => placeDraft(key, 'draft'));
  return slots;
};

/** F4: klucze draftu w kolejności kart dnia (payload historii = kolejność dnia). */
export const orderDraftExerciseIds = (
  planExerciseIds: string[],
  draftKeys: string[],
  sessionSwaps?: SessionSwapMap,
): string[] => {
  const inDraft = new Set(draftKeys);
  return resolveDaySlots(planExerciseIds, draftKeys, sessionSwaps)
    .map((slot) => (slot.kind === 'plan' ? planExerciseIds[slot.planIndex] : slot.key))
    .filter((key) => inDraft.has(key));
};

export const buildDayFromDraft = (
  baseDay: TrainingDay | undefined,
  draft: DraftDaySnapshot,
): TrainingDay => {
  const names = draft.exerciseNames ?? {};
  const planExercises = baseDay?.exercises ?? [];
  const slots = resolveDaySlots(
    planExercises.map((exercise) => exercise.id),
    Object.keys(draft.exerciseSets),
    draft.sessionSwaps,
  );
  // Nazwa zamiany z jawnego rekordu (klucz rekordu = STARY id, wartość = nowy).
  const swapTargetNames = new Map(
    Object.values(draft.sessionSwaps ?? {}).map((swap) => [swap.id, swap.name]),
  );

  const exercises: Exercise[] = slots.map((slot) => {
    if (slot.kind === 'plan') {
      const exercise = planExercises[slot.planIndex];
      return {
        ...exercise,
        name: names[exercise.id] || exercise.name,
        // Keep the prescription used by progression/timers ("3 x 8-10", "3 x 45s").
        // ExerciseCard already counts actual working sets from savedSets; replacing
        // the prescription with "3 serii" changes a live target into a MAX target.
      };
    }
    const fallbackName = slot.kind === 'swap' ? planExercises[slot.planIndex].name : slot.key;
    return {
      id: slot.key,
      name: names[slot.key] || swapTargetNames.get(slot.key) || fallbackName,
      sets: workingSetsLabel(draft.exerciseSets[slot.key]),
      instructions: [],
    };
  });

  return {
    id: draft.dayId,
    dayName: draft.dayName || baseDay?.dayName || draft.dayId,
    weekday: baseDay?.weekday ?? 'monday',
    focus: draft.dayFocus || baseDay?.focus || '',
    exercises,
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

/** Stabilny przez promocję provisional→remote, ale izolowany między planem i
 * szybkim treningiem tego samego dnia. */
export const workoutScrollStorageKey = (userId: string, dayId: string, date: string): string => (
  `workout-scroll:${userId}:${dayId}:${date}`
);

/** Czy trening ma cokolwiek do zapisania (>=1 odhaczona seria robocza z wynikiem). */
export const hasAnyCompletedSet = (exerciseSets: Record<string, SetData[]>): boolean =>
  Object.values(exerciseSets).some((sets) => sets.some((set) => (
    set.completed
    && !set.isWarmup
    && (
      set.reps > 0
      || (set.durationSec ?? 0) > 0
      || (set.distanceM ?? 0) > 0
    )
  )));

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
): { exerciseSets: Record<string, SetData[]>; autoCompleted: number; skippedPrefilled: number; changedExerciseIds: string[] } => {
  const next: Record<string, SetData[]> = {};
  const changedExerciseIds: string[] = [];
  let autoCompleted = 0;
  let skippedPrefilled = 0;

  for (const [exerciseId, sets] of Object.entries(exerciseSets)) {
    const tracking = trackingOf(exerciseId);
    let changed = false;
    const nextSets = sets.map((set) => {
      if (set.isWarmup || set.completed || !hasCompleteSetData(set, tracking)) return set;
      // Decyzja 2026-09-29: sam prefill apki (user nic nie wpisał) NIE jest wynikiem.
      // Seria zostaje na ekranie jako niezaliczona. Legacy szkic bez flagi = jak dotąd.
      if (set.prefilled === true) {
        skippedPrefilled += 1;
        return set;
      }
      changed = true;
      autoCompleted += 1;
      return { ...set, completed: true };
    });
    next[exerciseId] = changed ? nextSets : sets;
    if (changed) changedExerciseIds.push(exerciseId);
  }

  return { exerciseSets: next, autoCompleted, skippedPrefilled, changedExerciseIds };
};

/** Forma liczebnika PL dla "N serii" (1 seria / 2-4 serie / 5+ serii, z regułą 22-24). */
export const plSetsPluralForm = (n: number): 'one' | 'few' | 'many' => {
  if (n === 1) return 'one';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'few';
  return 'many';
};
