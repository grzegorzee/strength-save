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

// Bug 27 (X30): listener background->active wraca do treningu TYLKO, gdy user
// był na ekranie treningu w chwili zejścia do tła (iOS mógł potem przeładować
// WebView i zresetować trasę — wtedy resume mountowy i tak zadziała na świeżym
// mouncie). Świadome wyjście z treningu przed zgaszeniem ekranu (Z49: "nie
// wracamy"; masowe po WP-D z widocznym bottom navem) nie jest już nadpisywane
// auto-nawigacją przy każdym unlocku.
export const shouldResumeOnForegroundPath = (lastPathBeforeBackground: string | null): boolean => (
  !!lastPathBeforeBackground && lastPathBeforeBackground.startsWith('/workout/')
);

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
