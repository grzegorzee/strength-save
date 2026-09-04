import type { WorkoutSession } from '@/types';

const PROVISIONAL_WORKOUT_SESSION_PREFIX = 'local-workout';

export const buildWorkoutSessionId = (userId: string, dayId: string, workoutDate: string) => (
  `workout-${userId}-${dayId}-${workoutDate}`
);

export const buildProvisionalWorkoutSessionId = (userId: string, dayId: string, workoutDate: string) => (
  `${PROVISIONAL_WORKOUT_SESSION_PREFIX}-${userId}-${dayId}-${workoutDate}`
);

export const isProvisionalWorkoutSessionId = (sessionId: string): boolean => (
  sessionId.startsWith(`${PROVISIONAL_WORKOUT_SESSION_PREFIX}-`)
);

/** Tożsamość nie zmienia się przy promocji offline provisional → remote. */
export const canonicalWorkoutSessionId = (sessionId: string): string => (
  isProvisionalWorkoutSessionId(sessionId)
    ? sessionId.slice('local-'.length)
    : sessionId
);

export const createProvisionalWorkoutSession = (
  userId: string,
  dayId: string,
  workoutDate: string,
  cycleId?: string,
): WorkoutSession => ({
  id: buildProvisionalWorkoutSessionId(userId, dayId, workoutDate),
  userId,
  dayId,
  date: workoutDate,
  exercises: [],
  completed: false,
  ...(cycleId && { cycleId }),
});
