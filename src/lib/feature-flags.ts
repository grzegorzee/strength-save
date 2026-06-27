export const FEATURE_FLAGS = {
  workoutTimers: import.meta.env.VITE_FEATURE_WORKOUT_TIMERS === 'true',
} as const;
