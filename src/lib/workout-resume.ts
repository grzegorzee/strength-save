import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

// Decyzja auto-resume (Z49): po zimnym starcie / powrocie z tła apka wraca do
// aktywnego treningu. Czysta funkcja — komponent ActiveWorkoutResume wykonuje skutki.

const RESUME_FRESHNESS_MS = 12 * 60 * 60 * 1000;

export type WorkoutResumeDecision =
  | { resume: true; target: string }
  | { resume: false; target?: undefined };

export const shouldResumeWorkoutDraft = (
  draft: ActiveWorkoutDraft | null,
  todayStr: string,
  now: number,
): WorkoutResumeDecision => {
  if (!draft) return { resume: false };
  // Ukończony lub czekający na finalny sync: nie ma czego wznawiać w UI treningu.
  if (draft.completedLocally || draft.finalSyncPending) return { resume: false };
  // "Żywy": niedosłane zmiany albo sesja offline (provisional).
  const isAlive = draft.dirty || draft.sessionOrigin === 'provisional';
  if (!isAlive) return { resume: false };
  const isFresh = draft.date === todayStr || now - draft.updatedAt < RESUME_FRESHNESS_MS;
  if (!isFresh) return { resume: false };

  return {
    resume: true,
    target: `/workout/${draft.dayId}?date=${draft.date}&session=${draft.sessionId}`,
  };
};
