import type { SetData, WorkoutSession } from '@/types';

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
    w.exercises.forEach(ex => {
      if (ex.exerciseId !== exerciseId) return;
      ex.sets.forEach(set => {
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
    w.exercises.forEach(ex => {
      if (ex.exerciseId !== exerciseId) return;
      ex.sets.forEach(set => {
        if (!set.completed || set.isWarmup) return;
        if (set.reps > maxReps) maxReps = set.reps;
      });
    });
  });
  return maxReps;
};

export interface PRComparison {
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | '1rm' | 'both' | 'reps';
  newValue: number;
  oldValue: number;
}

export const detectNewPRs = (
  currentWorkout: WorkoutSession,
  previousWorkouts: WorkoutSession[],
  exerciseNames: Map<string, string>,
  bodyweightExerciseIds?: Set<string>,
): PRComparison[] => {
  const prs: PRComparison[] = [];

  currentWorkout.exercises.forEach(ex => {
    const name = exerciseNames.get(ex.exerciseId) || ex.exerciseId;
    const isBw = bodyweightExerciseIds?.has(ex.exerciseId) ?? false;

    if (isBw) {
      // Bodyweight: PR based on max reps
      let currentMaxReps = 0;
      ex.sets.forEach(set => {
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
    ex.sets.forEach(set => {
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
