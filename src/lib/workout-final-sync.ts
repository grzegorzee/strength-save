import type { SetData, WorkoutSession } from '@/types';

export interface WorkoutWriteExercise {
  exerciseId: string;
  sets: SetData[];
  notes?: string;
  name?: string;
  rpe?: number;
  pain?: number;
  quality?: number;
}

export interface WorkoutWriteExpectation {
  completed: boolean;
  exercises: WorkoutWriteExercise[];
  notes?: string;
  skippedExercises?: string[];
  dayName?: string;
  dayFocus?: string;
  durationSec?: number;
  startedAt?: number;
}

export interface WorkoutWriteValidation {
  ok: boolean;
  reason?: string;
}

export const hasWorkoutWriteConflict = (
  current: Pick<WorkoutSession, 'updatedAt'>,
  expectedUpdatedAt?: number | null
): boolean => (
  typeof expectedUpdatedAt === 'number'
  && typeof current.updatedAt === 'number'
  && current.updatedAt > expectedUpdatedAt
);

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

const metricMatches = (actual: number | undefined, expected: number | undefined): boolean => (
  expected === undefined || actual === expected
);

const stringMatches = (actual: string | undefined, expected: string | undefined): boolean => (
  expected === undefined || (actual ?? '') === expected
);

const arrayMatches = (actual: string[] | undefined, expected: string[] | undefined): boolean => (
  expected === undefined || JSON.stringify(actual ?? []) === JSON.stringify(expected)
);

export const buildWorkoutWriteExpectation = (
  exercises: WorkoutWriteExercise[],
  options: {
    completed?: boolean;
    notes?: string;
    skippedExercises?: string[];
    dayName?: string;
    dayFocus?: string;
    durationSec?: number;
    startedAt?: number;
  } = {}
): WorkoutWriteExpectation => ({
  completed: !!options.completed,
  exercises: exercises.map(exercise => ({
    exerciseId: exercise.exerciseId,
    sets: exercise.sets.map(normalizeSet),
    ...(exercise.notes !== undefined && { notes: exercise.notes }),
    ...(exercise.name !== undefined && { name: exercise.name }),
    ...(exercise.rpe !== undefined && { rpe: exercise.rpe }),
    ...(exercise.pain !== undefined && { pain: exercise.pain }),
    ...(exercise.quality !== undefined && { quality: exercise.quality }),
  })),
  ...(options.notes !== undefined && { notes: options.notes }),
  ...(options.skippedExercises !== undefined && { skippedExercises: options.skippedExercises }),
  ...(options.dayName !== undefined && { dayName: options.dayName }),
  ...(options.dayFocus !== undefined && { dayFocus: options.dayFocus }),
  ...(options.durationSec !== undefined && { durationSec: options.durationSec }),
  ...(options.startedAt !== undefined && { startedAt: options.startedAt }),
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

  if (!stringMatches(workout.notes, expectation.notes)) {
    return { ok: false, reason: 'notes-mismatch' };
  }

  if (!arrayMatches(workout.skippedExercises, expectation.skippedExercises)) {
    return { ok: false, reason: 'skipped-exercises-mismatch' };
  }

  if (!stringMatches(workout.dayName, expectation.dayName)) {
    return { ok: false, reason: 'day-name-mismatch' };
  }

  if (!stringMatches(workout.dayFocus, expectation.dayFocus)) {
    return { ok: false, reason: 'day-focus-mismatch' };
  }

  if (expectation.durationSec !== undefined && workout.durationSec !== expectation.durationSec) {
    return { ok: false, reason: 'duration-mismatch' };
  }

  if (expectation.startedAt !== undefined && workout.startedAt !== expectation.startedAt) {
    return { ok: false, reason: 'started-at-mismatch' };
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

    if (!stringMatches(actualExercise.notes, expectedExercise.notes)) {
      return { ok: false, reason: `exercise-notes-mismatch:${expectedExercise.exerciseId}` };
    }

    if (!stringMatches(actualExercise.name, expectedExercise.name)) {
      return { ok: false, reason: `exercise-name-mismatch:${expectedExercise.exerciseId}` };
    }

    if (!metricMatches(actualExercise.rpe, expectedExercise.rpe)) {
      return { ok: false, reason: `rpe-mismatch:${expectedExercise.exerciseId}` };
    }

    if (!metricMatches(actualExercise.pain, expectedExercise.pain)) {
      return { ok: false, reason: `pain-mismatch:${expectedExercise.exerciseId}` };
    }

    if (!metricMatches(actualExercise.quality, expectedExercise.quality)) {
      return { ok: false, reason: `quality-mismatch:${expectedExercise.exerciseId}` };
    }
  }

  return { ok: true };
};

/**
 * Potwierdza, że poprzednia próba zapisu finalnego już dotarła do chmury.
 * Nie porównujemy czasu: stare drafty nie miały finalizedAt, więc retry po dniach
 * wyliczał inny durationSec mimo identycznie zapisanego treningu.
 */
export const matchesFinalWorkoutContent = (
  workout: WorkoutSession | null,
  expectation: WorkoutWriteExpectation,
): boolean => validateWorkoutCloudWrite(workout, {
  ...expectation,
  durationSec: undefined,
  startedAt: undefined,
}).ok;
