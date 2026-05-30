import type { SetData, WorkoutSession } from '@/types';

export interface WorkoutWriteExercise {
  exerciseId: string;
  sets: SetData[];
}

export interface WorkoutWriteExpectation {
  completed: boolean;
  exercises: WorkoutWriteExercise[];
}

export interface WorkoutWriteValidation {
  ok: boolean;
  reason?: string;
}

const normalizeSet = (set: Partial<SetData>): SetData => ({
  reps: Math.max(0, Math.min(999, Math.round(Number(set.reps) || 0))),
  weight: Math.max(0, Math.min(999, Math.round((Number(set.weight) || 0) * 2) / 2)),
  completed: !!set.completed,
  ...(set.isWarmup && { isWarmup: true }),
});

const setsMatch = (actual: SetData, expected: SetData): boolean => {
  const nextActual = normalizeSet(actual);
  const nextExpected = normalizeSet(expected);

  return nextActual.reps === nextExpected.reps
    && nextActual.weight === nextExpected.weight
    && nextActual.completed === nextExpected.completed
    && !!nextActual.isWarmup === !!nextExpected.isWarmup;
};

export const buildWorkoutWriteExpectation = (
  exercises: WorkoutWriteExercise[],
  options: { completed?: boolean } = {}
): WorkoutWriteExpectation => ({
  completed: !!options.completed,
  exercises: exercises.map(exercise => ({
    exerciseId: exercise.exerciseId,
    sets: exercise.sets.map(normalizeSet),
  })),
});

export const validateWorkoutCloudWrite = (
  workout: WorkoutSession | null,
  expectation: WorkoutWriteExpectation
): WorkoutWriteValidation => {
  if (!workout) {
    return { ok: false, reason: 'missing-workout' };
  }

  if (expectation.completed && workout.completed !== true) {
    return { ok: false, reason: 'not-completed' };
  }

  if (expectation.completed && expectation.exercises.length === 0) {
    return { ok: false, reason: 'empty-final-payload' };
  }

  if (expectation.exercises.length > 0 && workout.exercises.length === 0) {
    return { ok: false, reason: 'missing-exercises' };
  }

  for (const expectedExercise of expectation.exercises) {
    const actualExercise = workout.exercises.find(exercise => exercise.exerciseId === expectedExercise.exerciseId);
    if (!actualExercise) {
      return { ok: false, reason: `missing-exercise:${expectedExercise.exerciseId}` };
    }

    if (actualExercise.sets.length < expectedExercise.sets.length) {
      return { ok: false, reason: `missing-sets:${expectedExercise.exerciseId}` };
    }

    for (let index = 0; index < expectedExercise.sets.length; index += 1) {
      if (!setsMatch(actualExercise.sets[index], expectedExercise.sets[index])) {
        return { ok: false, reason: `set-mismatch:${expectedExercise.exerciseId}:${index + 1}` };
      }
    }
  }

  return { ok: true };
};
