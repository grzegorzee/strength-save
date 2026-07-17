import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSession } from '@/types';

export type WorkoutSyncErrorCode =
  | 'offline'
  | 'not-found'
  | 'revision-conflict'
  | 'validation'
  | 'permission'
  | 'unknown';

export interface WorkoutContentSummary {
  exercises: number;
  completedSets: number;
}

export const classifyWorkoutSyncError = (error: unknown): WorkoutSyncErrorCode => {
  const message = String(error ?? '').toLowerCase();
  if (
    message.includes('workout_conflict')
    || message.includes('workout_revision_unknown')
    || message.includes('revision-conflict')
  ) return 'revision-conflict';
  if (message.includes('workout_not_found') || message.includes('not-found')) return 'not-found';
  if (
    message.includes('validation')
    || message.includes('mismatch')
    || message.includes('cloud_not_confirmed')
    || message.includes('cloudnotconfirmed')
  ) return 'validation';
  if (message.includes('permission-denied') || message.includes('permission')) return 'permission';
  if (
    message.includes('offline')
    || message.includes('network')
    || message.includes('unavailable')
    || message.includes('timeout')
  ) return 'offline';
  return 'unknown';
};

export type WorkoutSyncErrorMessageKey =
  | 'workout.err.conflict'
  | 'workout.err.permission'
  | 'workout.err.notFound'
  | 'workout.err.validation'
  | 'workout.err.offline'
  | 'workout.err.unknown';

export const workoutSyncErrorMessageKey = (error: unknown): WorkoutSyncErrorMessageKey => {
  switch (classifyWorkoutSyncError(error instanceof Error ? error.message : error)) {
    case 'revision-conflict': return 'workout.err.conflict';
    case 'permission': return 'workout.err.permission';
    case 'not-found': return 'workout.err.notFound';
    case 'validation': return 'workout.err.validation';
    case 'offline': return 'workout.err.offline';
    default: return 'workout.err.unknown';
  }
};

export const isRevisionConflictError = (error: unknown): boolean => (
  classifyWorkoutSyncError(error) === 'revision-conflict'
);

// Local-wins (Z87): konflikt rewizji rozwiązujemy automatycznie na korzyść wersji
// lokalnej. Limit chroni przed pętlą, gdy drugie urządzenie aktywnie pisze; po
// wyczerpaniu zostajemy przy lokalnym drafcie (kolejny checkpoint dośle dane).
export const MAX_CONFLICT_AUTO_RESOLVES = 2;

export const shouldAutoResolveConflict = (attemptsSoFar: number): boolean =>
  attemptsSoFar < MAX_CONFLICT_AUTO_RESOLVES;

export const summarizeLocalDraft = (draft: ActiveWorkoutDraft): WorkoutContentSummary => ({
  exercises: Object.keys(draft.exerciseSets).length,
  completedSets: Object.values(draft.exerciseSets).reduce(
    (total, sets) => total + sets.filter((set) => set.completed === true).length,
    0,
  ),
});

export const summarizeCloudWorkout = (
  workout: WorkoutSession | null,
): WorkoutContentSummary | null => workout ? ({
  exercises: workout.exercises.length,
  completedSets: workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed === true).length,
    0,
  ),
}) : null;
