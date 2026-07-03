import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSession } from '@/types';

// Decyzja hydracji draftu (Z57): DOSŁOWNE przeniesienie gałęzi shouldUseDraft
// + warunku czyszczenia draftu z efektu hydracji WorkoutDay. Czysta funkcja —
// efekt w komponencie woła ją i wykonuje skutki (applyWorkoutState / clearActiveDraft).

export interface WorkoutHydrationInput {
  workoutForDate: WorkoutSession | null;
  draft: ActiveWorkoutDraft | null;
  draftHasData: boolean;
  /** Wynik validateWorkoutCloudWrite dla ukończonego workoutu; null gdy nie liczono. */
  completedValidationOk: boolean | null;
}

export interface WorkoutHydrationDecision {
  useDraft: boolean;
  clearDraft: boolean;
}

export const resolveWorkoutHydration = (input: WorkoutHydrationInput): WorkoutHydrationDecision => {
  const { workoutForDate, draft, draftHasData, completedValidationOk } = input;

  const clearDraft = !!(workoutForDate?.completed && draft && !draft.finalSyncPending
    && completedValidationOk === true);

  const useDraft = (() => {
    if (!draft) return false;
    if (workoutForDate && draft.sessionId !== workoutForDate.id) return false;
    if (!workoutForDate) return draftHasData || draft.finalSyncPending || Object.keys(draft.exerciseSets).length > 0;
    if (workoutForDate.completed && !draft.finalSyncPending) return completedValidationOk === false && draftHasData;
    if (draft.finalSyncPending) return true;
    if (draft.dirty) return true;
    if (workoutForDate.exercises.length === 0 && draftHasData) return true;
    if (draft.lastFirebaseSyncAt == null) return draftHasData;
    return draft.updatedAt > draft.lastFirebaseSyncAt;
  })();

  return { useDraft, clearDraft };
};
