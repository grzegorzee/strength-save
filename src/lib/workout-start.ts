import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';

export interface WorkoutStartLoadState {
  workoutsLoaded: boolean;
  planLoaded: boolean;
  cyclesLoaded: boolean;
  draftLoaded: boolean;
}

export interface WorkoutStartSnapshot {
  day: TrainingDay;
  date: string;
  activeCycleId: string | null;
}

export const areWorkoutStartSourcesReady = (state: WorkoutStartLoadState): boolean => (
  state.workoutsLoaded
  && state.planLoaded
  && state.cyclesLoaded
  && state.draftLoaded
);

const cycleEndDate = (cycle: PlanCycle): string => {
  if (cycle.endDate) return cycle.endDate;
  const start = new Date(`${cycle.startDate}T12:00:00`);
  start.setDate(start.getDate() + Math.max(1, cycle.durationWeeks) * 7 - 1);
  return [
    start.getFullYear(),
    String(start.getMonth() + 1).padStart(2, '0'),
    String(start.getDate()).padStart(2, '0'),
  ].join('-');
};

const cycleContainsDate = (cycle: PlanCycle, date: string): boolean => (
  date >= cycle.startDate && date <= cycleEndDate(cycle)
);

export const findUniqueCycleForDate = (
  cycles: PlanCycle[],
  date: string,
): PlanCycle | null => {
  const matching = cycles.filter((cycle) => cycleContainsDate(cycle, date));
  return matching.length === 1 ? matching[0] : null;
};

export const buildWorkoutStartSnapshot = (
  day: TrainingDay,
  date: string,
  cycles: PlanCycle[],
): WorkoutStartSnapshot => {
  const activeCycles = cycles.filter(
    (cycle) => cycle.status === 'active' && cycleContainsDate(cycle, date),
  );
  if (activeCycles.length > 1) {
    throw new Error('MULTIPLE_ACTIVE_CYCLES');
  }

  return {
    date,
    activeCycleId: activeCycles[0]?.id ?? null,
    day: {
      ...day,
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        instructions: exercise.instructions?.map((instruction) => ({ ...instruction })) ?? [],
      })),
    },
  };
};
