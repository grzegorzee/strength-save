import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

// Decyzja autostartu (Z141): wyciągnięta z efektu WorkoutDay do czystej funkcji.
// Root cause incydentu 2026-07-24: parametr ?autostart=true żył w historii
// przeglądarki, a świeży mount po powrocie z /plan/edit widział sessionId=null
// (hydracja ustawia go setState'em, niewidocznym w tym samym przebiegu efektów)
// i startował trening NA ŻYWEJ SESJI, wymazując odhaczone serie.

export type AutostartDecision = 'start' | 'resume' | 'scroll-only' | 'none';

export interface AutostartInput {
  autostart: boolean;
  sessionId: string | null;
  draftForPage: ActiveWorkoutDraft | null;
}

// Szersze kryterium niż hasDraftContent: prefilowane wartości serii (kg/powtórzenia
// z poprzedniego treningu) też chronią draft przed restartem — start nadpisałby je
// świeżym prefillem, a user mógł je już edytować bez odhaczania.
export const draftHasLiveContent = (draft: ActiveWorkoutDraft): boolean => {
  const anySetTouched = Object.values(draft.exerciseSets).some(sets =>
    sets.some(set => set.completed === true || set.reps > 0 || set.weight > 0
      || (set.durationSec ?? 0) > 0 || (set.distanceM ?? 0) > 0),
  );
  const anyNotes = Object.values(draft.exerciseNotes).some(note => note.trim().length > 0)
    || draft.dayNotes.trim().length > 0;
  return anySetTouched || anyNotes || draft.skippedExercises.length > 0;
};

export const shouldAutostartWorkout = (input: AutostartInput): AutostartDecision => {
  if (!input.autostart) return 'none';
  if (input.sessionId) return 'scroll-only';
  if (input.draftForPage && draftHasLiveContent(input.draftForPage)) return 'resume';
  return 'start';
};

// Zdjęcie skonsumowanego parametru z URL — wpis historii przestaje być miną.
// Zwraca null, gdy nie ma czego zdejmować (bez zbędnego replace w historii).
export const stripAutostartParam = (params: URLSearchParams): URLSearchParams | null => {
  if (!params.has('autostart')) return null;
  const next = new URLSearchParams(params);
  next.delete('autostart');
  return next;
};
