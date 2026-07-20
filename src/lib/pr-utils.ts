import type { SetData, WorkoutSession } from '@/types';
import type { TrackingType } from '@/lib/set-tracking';
import { workoutExercises, exerciseSets } from '@/lib/summary-utils';

// Epley formula: 1RM = weight × (1 + reps / 30)
export const calculate1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

export interface ExerciseBest {
  exerciseId: string;
  maxWeight: number;
  best1RM: number;
  best1RMWeight: number;
  best1RMReps: number;
  bestDate: string;
}

export const getExerciseBest1RM = (
  workouts: WorkoutSession[],
  exerciseId: string,
): ExerciseBest => {
  let maxWeight = 0;
  let best1RM = 0;
  let best1RMWeight = 0;
  let best1RMReps = 0;
  let bestDate = '';

  workouts.forEach(w => {
    if (!w.completed) return;
    workoutExercises(w).forEach(ex => {
      if (ex.exerciseId !== exerciseId) return;
      exerciseSets(ex).forEach(set => {
        if (!set.completed || set.isWarmup || set.weight <= 0) return;
        if (set.weight > maxWeight) maxWeight = set.weight;
        const estimated = calculate1RM(set.weight, set.reps);
        if (estimated > best1RM) {
          best1RM = estimated;
          best1RMWeight = set.weight;
          best1RMReps = set.reps;
          bestDate = w.date;
        }
      });
    });
  });

  return { exerciseId, maxWeight, best1RM, best1RMWeight, best1RMReps, bestDate };
};

export const getExerciseBestReps = (
  workouts: WorkoutSession[],
  exerciseId: string,
): number => {
  let maxReps = 0;
  workouts.forEach(w => {
    if (!w.completed) return;
    workoutExercises(w).forEach(ex => {
      if (ex.exerciseId !== exerciseId) return;
      exerciseSets(ex).forEach(set => {
        if (!set.completed || set.isWarmup) return;
        if (set.reps > maxReps) maxReps = set.reps;
      });
    });
  });
  return maxReps;
};

// ===== Z106: rekordy dla nowych typów śledzenia =====

/** Najdłuższy czas ukończonej serii roboczej (typ 'duration'). */
export const getExerciseBestDuration = (
  workouts: WorkoutSession[],
  exerciseId: string,
): number => {
  let best = 0;
  workouts.forEach(w => {
    if (!w.completed) return;
    workoutExercises(w).forEach(ex => {
      if (ex.exerciseId !== exerciseId) return;
      exerciseSets(ex).forEach(set => {
        if (!set.completed || set.isWarmup) return;
        if ((set.durationSec ?? 0) > best) best = set.durationSec!;
      });
    });
  });
  return best;
};

/** Najlepszy iloczyn ciężar x dystans (typ 'weight_distance_duration'). */
export const getExerciseBestWeightDistance = (
  workouts: WorkoutSession[],
  exerciseId: string,
): { score: number; weight: number; distanceM: number } => {
  let best = { score: 0, weight: 0, distanceM: 0 };
  workouts.forEach(w => {
    if (!w.completed) return;
    workoutExercises(w).forEach(ex => {
      if (ex.exerciseId !== exerciseId) return;
      exerciseSets(ex).forEach(set => {
        if (!set.completed || set.isWarmup) return;
        const score = (set.weight || 0) * (set.distanceM ?? 0);
        if (score > best.score) best = { score, weight: set.weight, distanceM: set.distanceM ?? 0 };
      });
    });
  });
  return best;
};

/**
 * Najlepsze obciążenie efektywne dla asysty (typ 'assisted_bodyweight'):
 * masa ciała minus NAJMNIEJSZA asysta + powtórzenia przy tym obciążeniu.
 * null gdy brak pomiaru wagi ciała (wtedy PR tylko po powtórzeniach).
 */
export const getExerciseBestEffectiveLoad = (
  workouts: WorkoutSession[],
  exerciseId: string,
  bodyWeightKg: number | null,
): { effectiveLoad: number; reps: number } | null => {
  if (bodyWeightKg === null) return null;
  let best: { effectiveLoad: number; reps: number } | null = null;
  workouts.forEach(w => {
    if (!w.completed) return;
    workoutExercises(w).forEach(ex => {
      if (ex.exerciseId !== exerciseId) return;
      exerciseSets(ex).forEach(set => {
        if (!set.completed || set.isWarmup || set.reps <= 0) return;
        const effectiveLoad = Math.max(0, bodyWeightKg - (set.assistWeight ?? 0));
        if (!best
          || effectiveLoad > best.effectiveLoad
          || (effectiveLoad === best.effectiveLoad && set.reps > best.reps)) {
          best = { effectiveLoad, reps: set.reps };
        }
      });
    });
  });
  return best;
};

export interface PRComparison {
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | '1rm' | 'both' | 'reps' | 'duration' | 'weight_distance' | 'effective_load';
  newValue: number;
  oldValue: number;
}

export interface DetectPROptions {
  /** Typ śledzenia per exerciseId (Z106) — brak wpisu = dotychczasowa logika weight/bodyweight. */
  trackingByExerciseId?: Map<string, TrackingType>;
  /** Masa ciała w kg (najnowszy pomiar) do obciążenia efektywnego asysty. */
  bodyWeightKg?: number | null;
}

export const detectNewPRs = (
  currentWorkout: WorkoutSession,
  previousWorkouts: WorkoutSession[],
  exerciseNames: Map<string, string>,
  bodyweightExerciseIds?: Set<string>,
  options?: DetectPROptions,
): PRComparison[] => {
  const prs: PRComparison[] = [];
  if (!currentWorkout.completed) return prs;

  workoutExercises(currentWorkout).forEach(ex => {
    const name = exerciseNames.get(ex.exerciseId) || ex.name || ex.exerciseId;
    const tracking = options?.trackingByExerciseId?.get(ex.exerciseId);

    // Z106: PR czasu — dłuższa ukończona seria niż kiedykolwiek.
    if (tracking === 'duration') {
      let currentBest = 0;
      exerciseSets(ex).forEach(set => {
        if (!set.completed || set.isWarmup) return;
        if ((set.durationSec ?? 0) > currentBest) currentBest = set.durationSec!;
      });
      if (currentBest === 0) return;
      const historicalBest = getExerciseBestDuration(previousWorkouts, ex.exerciseId);
      if (currentBest > historicalBest && historicalBest > 0) {
        prs.push({ exerciseId: ex.exerciseId, exerciseName: name, type: 'duration', newValue: currentBest, oldValue: historicalBest });
      }
      return;
    }

    // Z106: PR ciężar x dystans.
    if (tracking === 'weight_distance_duration') {
      let currentBest = 0;
      exerciseSets(ex).forEach(set => {
        if (!set.completed || set.isWarmup) return;
        const score = (set.weight || 0) * (set.distanceM ?? 0);
        if (score > currentBest) currentBest = score;
      });
      if (currentBest === 0) return;
      const historicalBest = getExerciseBestWeightDistance(previousWorkouts, ex.exerciseId);
      if (currentBest > historicalBest.score && historicalBest.score > 0) {
        prs.push({ exerciseId: ex.exerciseId, exerciseName: name, type: 'weight_distance', newValue: currentBest, oldValue: historicalBest.score });
      }
      return;
    }

    // Z106 (wyróżnik kategorii): asysta — mniejsza asysta przy >= powtórzeniach = NOWY PR.
    if (tracking === 'assisted_bodyweight') {
      const bodyWeightKg = options?.bodyWeightKg ?? null;
      if (bodyWeightKg !== null) {
        const historicalBest = getExerciseBestEffectiveLoad(previousWorkouts, ex.exerciseId, bodyWeightKg);
        let bestPr: PRComparison | null = null;
        exerciseSets(ex).forEach(set => {
          if (!set.completed || set.isWarmup || set.reps <= 0) return;
          const effectiveLoad = Math.max(0, bodyWeightKg - (set.assistWeight ?? 0));
          if (historicalBest
            && effectiveLoad > historicalBest.effectiveLoad
            && set.reps >= historicalBest.reps
            && (!bestPr || effectiveLoad > bestPr.newValue)) {
            bestPr = { exerciseId: ex.exerciseId, exerciseName: name, type: 'effective_load', newValue: effectiveLoad, oldValue: historicalBest.effectiveLoad };
          }
        });
        if (bestPr) prs.push(bestPr);
        return;
      }
      // Brak pomiaru wagi ciała: PR tylko po powtórzeniach (zachęta do uzupełnienia w UI).
      let currentMaxReps = 0;
      exerciseSets(ex).forEach(set => {
        if (!set.completed || set.isWarmup) return;
        if (set.reps > currentMaxReps) currentMaxReps = set.reps;
      });
      if (currentMaxReps === 0) return;
      const historicalMaxReps = getExerciseBestReps(previousWorkouts, ex.exerciseId);
      if (currentMaxReps > historicalMaxReps && historicalMaxReps > 0) {
        prs.push({ exerciseId: ex.exerciseId, exerciseName: name, type: 'reps', newValue: currentMaxReps, oldValue: historicalMaxReps });
      }
      return;
    }

    const isBw = tracking === 'bodyweight_reps' || (bodyweightExerciseIds?.has(ex.exerciseId) ?? false);

    if (isBw) {
      // Bodyweight: PR based on max reps
      let currentMaxReps = 0;
      exerciseSets(ex).forEach(set => {
        if (!set.completed || set.isWarmup) return;
        if (set.reps > currentMaxReps) currentMaxReps = set.reps;
      });

      if (currentMaxReps === 0) return;

      const historicalMaxReps = getExerciseBestReps(previousWorkouts, ex.exerciseId);
      if (currentMaxReps > historicalMaxReps && historicalMaxReps > 0) {
        prs.push({
          exerciseId: ex.exerciseId,
          exerciseName: name,
          type: 'reps',
          newValue: currentMaxReps,
          oldValue: historicalMaxReps,
        });
      }
      return;
    }

    // Weighted: PR based on weight / 1RM
    let currentMaxWeight = 0;
    let currentBest1RM = 0;
    exerciseSets(ex).forEach(set => {
      if (!set.completed || set.isWarmup || set.weight <= 0) return;
      if (set.weight > currentMaxWeight) currentMaxWeight = set.weight;
      const est = calculate1RM(set.weight, set.reps);
      if (est > currentBest1RM) currentBest1RM = est;
    });

    if (currentMaxWeight === 0) return;

    // Get historical bests (excluding current workout)
    const historicalBest = getExerciseBest1RM(previousWorkouts, ex.exerciseId);

    const isWeightPR = currentMaxWeight > historicalBest.maxWeight && historicalBest.maxWeight > 0;
    const is1RMPR = currentBest1RM > historicalBest.best1RM && historicalBest.best1RM > 0;

    if (isWeightPR && is1RMPR) {
      prs.push({
        exerciseId: ex.exerciseId,
        exerciseName: name,
        type: 'both',
        newValue: currentMaxWeight,
        oldValue: historicalBest.maxWeight,
      });
    } else if (isWeightPR) {
      prs.push({
        exerciseId: ex.exerciseId,
        exerciseName: name,
        type: 'weight',
        newValue: currentMaxWeight,
        oldValue: historicalBest.maxWeight,
      });
    } else if (is1RMPR) {
      prs.push({
        exerciseId: ex.exerciseId,
        exerciseName: name,
        type: '1rm',
        newValue: currentBest1RM,
        oldValue: historicalBest.best1RM,
      });
    }
  });

  return prs;
};
