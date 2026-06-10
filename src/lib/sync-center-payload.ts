import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

export const buildSyncCenterExercisesPayload = (draft: ActiveWorkoutDraft) => (
  Object.entries(draft.exerciseSets).map(([exerciseId, sets]) => ({
    exerciseId,
    sets,
    ...(draft.exerciseNotes[exerciseId] && { notes: draft.exerciseNotes[exerciseId] }),
    ...(draft.exerciseNames?.[exerciseId] && { name: draft.exerciseNames[exerciseId] }),
    ...(draft.exerciseMetrics[exerciseId] ?? {}),
  }))
);

export const buildSyncCenterSaveOptions = (draft: ActiveWorkoutDraft, now = Date.now()) => ({
  notes: draft.dayNotes || undefined,
  skippedExercises: draft.skippedExercises.length > 0 ? draft.skippedExercises : undefined,
  dayName: draft.dayName || undefined,
  dayFocus: draft.dayFocus || undefined,
  durationSec: draft.finalSyncPending && draft.startedAt
    ? Math.max(0, Math.floor((now - draft.startedAt) / 1000))
    : undefined,
  startedAt: draft.finalSyncPending ? draft.startedAt : undefined,
  ...(draft.finalSyncPending && { completed: true }),
  expectedUpdatedAt: draft.cloudUpdatedAt ?? null,
});
