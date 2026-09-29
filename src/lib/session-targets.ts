import type { Exercise, TrainingDay } from '@/data/trainingPlan';
import type { SetData, WorkoutSession } from '@/types';
import {
  computeModeTargets,
  computeWeeklyTargets,
  type ProgressionConfig,
  type WeeklyTarget,
} from '@/lib/progression-engine';
import { createPrefilledSets, parseSetCount } from '@/lib/exercise-utils';
import type { ReducedMode } from '@/lib/reduced-mode';
import type { TrackingType } from '@/lib/set-tracking';

// F3 (2026-09-29): cele sesji treningowej (karta ćwiczenia, prefill startu,
// etykiety zegarka) z JEDNEGO miejsca. Tryb "nie na 100%" / urlop i rampa po
// nich trafiają do celu także bez silnika progresji i w treningu ad-hoc:
// komunikat (push końca urlopu, porada) obiecał ~85%, więc prefill to wpisuje.

export const resolveSessionTargets = (params: {
  day: TrainingDay;
  workouts: WorkoutSession[];
  progression: ProgressionConfig | null;
  week: number;
  deloadApplied: boolean;
  isAdhocDay: boolean;
  /** Okno trybu albo urlopu (vacationToAdviceWindow); null = brak. */
  reducedMode: ReducedMode | null;
  sessionDateISO: string;
  trackingByName: Record<string, TrackingType>;
}): Record<string, WeeklyTarget> | null => {
  const { day, workouts, progression, week, deloadApplied, isAdhocDay, reducedMode, sessionDateISO, trackingByName } = params;
  if (!progression?.enabled || isAdhocDay) {
    const modeTargets = computeModeTargets([day], workouts, { reducedMode, sessionDateISO, trackingByName })[day.id];
    return modeTargets && Object.keys(modeTargets).length > 0 ? modeTargets : null;
  }
  return computeWeeklyTargets([day], workouts, week, progression, {
    deloadApplied,
    trackingByName,
    reducedMode,
    sessionDateISO,
  })[day.id] ?? null;
};

/** Serie startowe ćwiczenia: cel sesji nadpisuje ciężar/powtórzenia poprzedniej sesji. */
export const buildPrefillForExercise = (
  exercise: Pick<Exercise, 'sets'>,
  target: WeeklyTarget | null | undefined,
  previousSets: SetData[] | undefined,
  isBodyweight: boolean,
): SetData[] => createPrefilledSets(
  target?.targetSets ?? parseSetCount(exercise.sets),
  previousSets,
  isBodyweight,
  target ? { weight: target.targetWeight, reps: target.targetReps } : null,
);
