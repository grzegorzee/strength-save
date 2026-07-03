// Jawna maszyna stanów sesji treningowej (Z57): mapowanie 1:1 z implicit flag
// WorkoutDay (26 useState). Czysta funkcja — komponent liczy phase przez useMemo
// i używa jej w renderze zamiast rozproszonych warunków.

export type WorkoutSessionPhase =
  | 'idle'
  | 'active-provisional'
  | 'active-remote'
  | 'completing'
  | 'final-pending'
  | 'completed'
  | 'editing'
  | 'conflict';

export interface WorkoutSessionPhaseInput {
  sessionId: string | null;
  sessionOrigin?: 'provisional' | 'remote';
  isCompleted: boolean;
  isEditing: boolean;
  conflictDialogOpen: boolean;
  finalSyncPending: boolean;
  isExplicitSaving: boolean;
}

export const deriveWorkoutSessionPhase = (input: WorkoutSessionPhaseInput): WorkoutSessionPhase => {
  if (!input.sessionId) return 'idle';
  if (input.conflictDialogOpen) return 'conflict';
  if (input.isEditing) return 'editing';
  if (input.isExplicitSaving) return 'completing';
  if (input.finalSyncPending) return 'final-pending';
  if (input.isCompleted) return 'completed';
  return input.sessionOrigin === 'provisional' ? 'active-provisional' : 'active-remote';
};

// Trening "w toku" (sesja żyje, nieukończona): odpowiednik dawnego
// `!!sessionId && !isCompleted && !isEditing` — editing i final-pending wymagają
// ukończonej sesji (edycja startuje tylko z widoku completed).
export const isActiveTrainingPhase = (phase: WorkoutSessionPhase): boolean =>
  phase === 'active-provisional' || phase === 'active-remote'
  || phase === 'completing' || phase === 'conflict';
