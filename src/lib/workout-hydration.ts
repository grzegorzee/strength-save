import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSession } from '@/types';
import { isAdhocDayId } from '@/lib/adhoc-workout';

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

/** Warmup state is local UI data, absent from every cloud revision. A newer
 * cloud checkpoint may replace sets, but must not close this session's dialog. */
export const warmupStateForCloudWorkout = (
  workout: WorkoutSession,
  draft: ActiveWorkoutDraft | null,
): Pick<ActiveWorkoutDraft, 'warmupChecked' | 'warmupOpen'> => (
  draft?.sessionId === workout.id && !workout.completed
    ? { warmupChecked: draft.warmupChecked, warmupOpen: draft.warmupOpen }
    : {}
);

export const resolveWorkoutHydration = (input: WorkoutHydrationInput): WorkoutHydrationDecision => {
  const { workoutForDate, draft, draftHasData, completedValidationOk } = input;
  // Bazowy dokument nie potwierdza prywatnego sidecara. Jego retry musi zachować
  // draft i grant nawet wtedy, gdy wszystkie zwykłe serie są już w chmurze.
  const healthWritePending = !!(draft?.pendingHealthGrant || draft?.healthSyncPending);

  // Draft BEZ treści przy ukończonym treningu w chmurze jest śmieciem: nie ma czego
  // stracić, a trzymany z finalSyncPending wisiałby wiecznie (incydent 2026-07-20 —
  // pusty szybki trening nigdy nie przejdzie walidacji 'empty-final-payload').
  const emptyDraftOnCompleted = !!(!healthWritePending && workoutForDate?.completed && draft && !draftHasData
    && Object.keys(draft.exerciseSets).length === 0);

  const clearDraft = emptyDraftOnCompleted || !!(workoutForDate?.completed && draft
    && !draft.finalSyncPending && !healthWritePending && completedValidationOk === true);

  const useDraft = (() => {
    if (!draft) return false;
    if (emptyDraftOnCompleted) return false;
    if (healthWritePending) return true;
    // Z183: rozjazd sessionId nie może wskrzeszać starszej chmury — dirty draft
    // NOWSZY niż workout w chmurze wygrywa (force-quit tuż po promocji sesji).
    // Draft czysty albo starszy: chmura wygrywa (ochrona przed zombie-draftem).
    if (workoutForDate && draft.sessionId !== workoutForDate.id) {
      return draft.dirty && draft.updatedAt > (workoutForDate.updatedAt ?? 0);
    }
    // Z104: szybki trening startuje z zerem ćwiczeń — żywy (dirty) pusty draft
    // ad-hoc jest hydratowalny, inaczej reset sesji zaraz po starcie.
    if (!workoutForDate) {
      return draftHasData || draft.finalSyncPending || Object.keys(draft.exerciseSets).length > 0
        || (draft.dirty && isAdhocDayId(draft.dayId));
    }
    if (workoutForDate.completed && !draft.finalSyncPending) return completedValidationOk === false && draftHasData;
    if (draft.finalSyncPending) return true;
    if (draft.dirty) return true;
    // Checkpoints do not send warmup/UI state to the cloud. Keep the local
    // snapshot after its ACK until a genuinely newer remote revision arrives.
    if (draft.cloudRevision !== undefined && draft.cloudRevision === workoutForDate.revision) return true;
    if (workoutForDate.exercises.length === 0 && draftHasData) return true;
    if (draft.lastFirebaseSyncAt == null) return draftHasData;
    return draft.updatedAt > draft.lastFirebaseSyncAt;
  })();

  return { useDraft, clearDraft };
};
