import type { SetData, WorkoutSession } from '@/types';
import { parseSetCount } from '@/lib/exercise-utils';

// Podsumowanie completion (Runna pakiet 1, spec A1): liczone DETERMINISTYCZNIE
// z danych sesji i historii — bez AI, zero kosztów per trening. Wolumen liczony
// tą samą formułą co licznik live sesji (sessionStats: reps * weight, tylko
// odhaczone serie robocze), żeby liczba z paska treningu i z podsumowania
// nigdy się nie rozjechały.

export interface CompletionSummary {
  volumeKg: number;
  completedSets: number;
  plannedSets: number | null;
  planPct: number | null;
  prevVolumeKg: number | null;
  volumeDeltaPct: number | null;
  /** Data (ISO) ostatniej ukończonej sesji tego dnia planu — label "vs {date}" w hero (fala 2). */
  prevDate: string | null;
}

const workingSetVolume = (sets: SetData[]): number =>
  sets
    .filter((set) => set.completed && !set.isWarmup)
    .reduce((sum, set) => sum + set.reps * set.weight, 0);

const workingSetCount = (sets: SetData[]): number =>
  sets.filter((set) => set.completed && !set.isWarmup).length;

export const computeCompletionSummary = (args: {
  exerciseSets: Record<string, SetData[]>;
  dayExercises: { id: string; sets: string }[] | null;
  skippedExercises?: string[];
  workouts: WorkoutSession[];
  sessionId: string | null;
  dayId: string | null | undefined;
}): CompletionSummary => {
  const { exerciseSets, dayExercises, skippedExercises = [], workouts, sessionId, dayId } = args;

  const allSets = Object.values(exerciseSets);
  const volumeKg = allSets.reduce((sum, sets) => sum + workingSetVolume(sets), 0);
  const completedSets = allSets.reduce((sum, sets) => sum + workingSetCount(sets), 0);

  const skipped = new Set(skippedExercises);
  const plannedSets = dayExercises
    ? dayExercises
      .filter((exercise) => !skipped.has(exercise.id))
      .reduce((sum, exercise) => sum + parseSetCount(exercise.sets), 0)
    : null;
  const planPct = plannedSets && plannedSets > 0
    ? Math.round((completedSets / plannedSets) * 100)
    : null;

  const previous = dayId
    ? workouts
      .filter((w) => w.completed && w.dayId === dayId && w.id !== sessionId)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
    : null;
  const prevVolume = previous
    ? previous.exercises.reduce((sum, exercise) => sum + workingSetVolume(exercise.sets), 0)
    : 0;
  const prevVolumeKg = prevVolume > 0 ? prevVolume : null;
  const volumeDeltaPct = prevVolumeKg !== null
    ? Math.round(((volumeKg - prevVolumeKg) / prevVolumeKg) * 100)
    : null;

  return {
    volumeKg,
    completedSets,
    plannedSets,
    planPct,
    prevVolumeKg,
    volumeDeltaPct,
    prevDate: previous?.date ?? null,
  };
};
