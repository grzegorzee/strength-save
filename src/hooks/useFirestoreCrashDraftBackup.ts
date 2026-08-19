import { useEffect } from 'react';
import { registerFirestoreCrashDraftPreserver } from '@/lib/firestore-crash-guard';
import { workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';

/** Zabezpiecza najświeższy stan z refów WorkoutDay tuż przed hard reloadem SDK. */
export const useFirestoreCrashDraftBackup = (
  buildDraftSnapshot: () => ActiveWorkoutDraft | null,
): void => {
  useEffect(() => registerFirestoreCrashDraftPreserver(() => {
    const draft = buildDraftSnapshot();
    if (draft) workoutDraftDb.saveEmergencyFallback(draft);
  }), [buildDraftSnapshot]);
};
