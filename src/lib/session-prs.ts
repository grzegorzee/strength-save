// E-T1: PR-y sesji liczone DETERMINISTYCZNIE z danych, nie z ulotnego stanu.
// Bug z buildu 107: sessionPRs (useState) ustawiany tylko w przepływie
// zakończenia — każdy remount ekranu ukończonego treningu (wejście z Historii,
// restart appki, powrót po share) pokazywał 0 PR-ów.
import { detectNewPRs, type PRComparison } from '@/lib/pr-utils';
import { filterPRsAgainstBackfill } from '@/lib/pr-backfill';
import type { SetData, WorkoutSession } from '@/types';
import type { TrackingType } from '@/lib/set-tracking';

export interface SessionPRContext {
  sessionId: string;
  /** Serie sesji (stan widoku ukończonego = zhydratowany z zapisu). */
  exerciseSets: Record<string, SetData[]>;
  workouts: WorkoutSession[];
  dayExercises: { id: string; name: string }[];
  resolveIsBodyweight: (name: string) => boolean;
  resolveTracking: (name: string) => TrackingType;
  bodyWeightKg: number | null;
  backfillWeightOf: (exerciseId: string) => number;
}

// Sesja porównuje się wyłącznie z tym, co było PRZED nią chronologicznie —
// dzięki temu wynik nie zmienia się po dopisaniu późniejszych treningów
// (remount tygodnie później daje te same PR-y co w momencie zakończenia).
const isChronologicallyBefore = (w: WorkoutSession, current: WorkoutSession): boolean => {
  if (w.date < current.date) return true;
  if (w.date > current.date) return false;
  const a = w.completedAt ?? w.startedAt;
  const b = current.completedAt ?? current.startedAt;
  if (typeof a === 'number' && typeof b === 'number') return a < b;
  // Ten sam dzień bez znaczników czasu: konserwatywnie nie liczymy jako
  // wcześniejszy (drugi trening dnia nie kradnie PR-u pierwszemu).
  return false;
};

export const computeSessionPRs = (ctx: SessionPRContext): PRComparison[] => {
  const current = ctx.workouts.find(w => w.id === ctx.sessionId);
  if (!current) return [];
  const previous = ctx.workouts.filter(w =>
    w.completed && w.id !== current.id && isChronologicallyBefore(w, current));
  const exerciseNames = new Map(ctx.dayExercises.map(e => [e.id, e.name]));
  const bodyweightIds = new Set(
    ctx.dayExercises.filter(e => ctx.resolveIsBodyweight(e.name)).map(e => e.id));
  const newPRs = detectNewPRs(
    { ...current, exercises: Object.entries(ctx.exerciseSets).map(([id, sets]) => ({ exerciseId: id, sets })) },
    previous,
    exerciseNames,
    bodyweightIds,
    {
      trackingByExerciseId: new Map(ctx.dayExercises.map(e => [e.id, ctx.resolveTracking(e.name)])),
      bodyWeightKg: ctx.bodyWeightKg,
    },
  );
  return filterPRsAgainstBackfill(newPRs, ctx.backfillWeightOf);
};
