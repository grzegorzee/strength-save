// H-T4: minimalny port detekcji PR z src/lib/pr-utils.ts (detectNewPRs)
// pod maile do trenera. Zakres: nowy max kg, nowe max powtórzenia przy tym
// samym ciężarze, nowy e1RM (Epley). Bez typów Z106 (duration/dystans/asysta)
// i bez backfill — brak wcześniejszych zapisów ćwiczenia = "pierwszy zapis",
// nie PR. Liczy się wyłącznie seria ukończona, nierozgrzewkowa.
import type { EmailExercise, EmailWorkout } from "./email-workout";

/** Epley: 1RM = weight × (1 + reps / 30); zaokrąglenie do 0.1 jak klient. */
export const calculateE1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

export interface EmailPR {
  exerciseId: string;
  exerciseName: string;
  type: "weight" | "reps" | "e1rm";
  newValue: number;
  oldValue: number;
}

export interface EmailPRResult {
  prs: EmailPR[];
  /** exerciseId ćwiczeń bez żadnego wcześniejszego zapisu (pierwszy zapis). */
  firsts: string[];
}

interface ExerciseStats {
  hasAny: boolean;
  maxWeight: number;
  repsAtMaxWeight: number;
  maxReps: number;
  bestE1RM: number;
}

const workingSets = (ex: EmailExercise) =>
  (ex.sets ?? []).filter((s) => s.completed && !s.isWarmup);

/** Match jak matchesExerciseEntry: po exerciseId albo po nazwie (ad-hoc). */
const matchesExercise = (ex: EmailExercise, exerciseId: string, name?: string): boolean =>
  ex.exerciseId === exerciseId || (!!name && !!ex.name && ex.name === name);

const historicalStats = (earlier: EmailWorkout[], exerciseId: string, name?: string): ExerciseStats => {
  const stats: ExerciseStats = { hasAny: false, maxWeight: 0, repsAtMaxWeight: 0, maxReps: 0, bestE1RM: 0 };
  earlier.forEach((workout) => {
    if (!workout.completed) return;
    (workout.exercises ?? []).forEach((ex) => {
      if (!matchesExercise(ex, exerciseId, name)) return;
      workingSets(ex).forEach((set) => {
        const weight = set.weight ?? 0;
        const reps = set.reps ?? 0;
        stats.hasAny = true;
        if (weight > stats.maxWeight) {
          stats.maxWeight = weight;
          stats.repsAtMaxWeight = reps;
        } else if (weight === stats.maxWeight && reps > stats.repsAtMaxWeight) {
          stats.repsAtMaxWeight = reps;
        }
        if (reps > stats.maxReps) stats.maxReps = reps;
        const est = calculateE1RM(weight, reps);
        if (est > stats.bestE1RM) stats.bestE1RM = est;
      });
    });
  });
  return stats;
};

export function detectEmailPRs(current: EmailWorkout, earlier: EmailWorkout[]): EmailPRResult {
  const prs: EmailPR[] = [];
  const firsts: string[] = [];
  if (!current.completed) return { prs, firsts };

  (current.exercises ?? []).forEach((ex) => {
    const sets = workingSets(ex);
    if (sets.length === 0) return;
    const name = ex.name;
    const displayName = name || ex.exerciseId;
    const hist = historicalStats(earlier, ex.exerciseId, name);
    if (!hist.hasAny) {
      firsts.push(ex.exerciseId);
      return;
    }

    let maxWeight = 0;
    let repsAtMaxWeight = 0;
    let maxReps = 0;
    let bestE1RM = 0;
    sets.forEach((set) => {
      const weight = set.weight ?? 0;
      const reps = set.reps ?? 0;
      if (weight > maxWeight) {
        maxWeight = weight;
        repsAtMaxWeight = reps;
      } else if (weight === maxWeight && reps > repsAtMaxWeight) {
        repsAtMaxWeight = reps;
      }
      if (reps > maxReps) maxReps = reps;
      const est = calculateE1RM(weight, reps);
      if (est > bestE1RM) bestE1RM = est;
    });

    const isBodyweight = maxWeight === 0 && hist.maxWeight === 0;
    if (isBodyweight) {
      if (maxReps > hist.maxReps && hist.maxReps > 0) {
        prs.push({ exerciseId: ex.exerciseId, exerciseName: displayName, type: "reps", newValue: maxReps, oldValue: hist.maxReps });
      }
      return;
    }

    if (maxWeight > hist.maxWeight && hist.maxWeight > 0) {
      prs.push({ exerciseId: ex.exerciseId, exerciseName: displayName, type: "weight", newValue: maxWeight, oldValue: hist.maxWeight });
      return;
    }
    if (maxWeight === hist.maxWeight && repsAtMaxWeight > hist.repsAtMaxWeight && hist.repsAtMaxWeight > 0) {
      prs.push({ exerciseId: ex.exerciseId, exerciseName: displayName, type: "reps", newValue: repsAtMaxWeight, oldValue: hist.repsAtMaxWeight });
      return;
    }
    if (bestE1RM > hist.bestE1RM && hist.bestE1RM > 0) {
      prs.push({ exerciseId: ex.exerciseId, exerciseName: displayName, type: "e1rm", newValue: bestE1RM, oldValue: hist.bestE1RM });
    }
  });

  return { prs, firsts };
}
