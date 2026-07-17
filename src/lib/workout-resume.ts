import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

// Decyzja auto-resume (Z49): po zimnym starcie / powrocie z tła apka wraca do
// aktywnego treningu. Czysta funkcja — komponent ActiveWorkoutResume wykonuje skutki.

const RESUME_FRESHNESS_MS = 12 * 60 * 60 * 1000;

export type WorkoutResumeDecision =
  | { resume: true; target: string }
  | { resume: false; target?: undefined };

// Z88: warunek karty "Dzisiejszy trening" na Dashboardzie. Łagodniejszy niż auto-resume:
// KAŻDY nieukończony dzisiejszy szkic jest kontynuowalny, także w pełni zsynchronizowany
// (dirty=false). Auto-nawigacja (shouldResumeWorkoutDraft) celowo zostaje ostrzejsza.
export const isDraftContinuableToday = (
  draft: ActiveWorkoutDraft | null,
  todayStr: string,
): draft is ActiveWorkoutDraft => {
  if (!draft) return false;
  if (draft.completedLocally || draft.finalSyncPending) return false;
  return draft.date === todayStr;
};

export const continuableDraftTarget = (draft: ActiveWorkoutDraft): string =>
  `/workout/${draft.dayId}?date=${draft.date}&session=${draft.sessionId}`;

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
