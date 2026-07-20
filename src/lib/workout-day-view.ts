import type { TrainingDay, Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';

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

  // 1. Ćwiczenia planu — ZAWSZE wszystkie, w kolejności planu.
  const fromPlan: Exercise[] = planExercises.map((exercise) => {
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
    .filter(([exerciseId]) => !planIds.has(exerciseId))
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
