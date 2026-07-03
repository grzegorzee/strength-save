export const FEATURE_FLAGS = {
  workoutTimers: import.meta.env.VITE_FEATURE_WORKOUT_TIMERS === 'true',
  // Adaptive Coach (Z63/Z64): kill-switch buildem — VITE_FEATURE_ADAPTIVE_COACH=false wyłącza.
  adaptiveCoach: import.meta.env.VITE_FEATURE_ADAPTIVE_COACH !== 'false',
} as const;
