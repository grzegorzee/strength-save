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
  // Anomalia danych (2 aktywne cykle na tę datę) nie może BLOKOWAĆ startu treningu.
  // Wybierz deterministycznie najnowszy (createdAt, tie-break po id) i ostrzeż w logu.
  if (activeCycles.length > 1) {
    console.warn(
      `[workout-start] ${activeCycles.length} aktywne cykle na ${date}; wybrano najnowszy deterministycznie`,
      activeCycles.map((cycle) => cycle.id),
    );
  }
  const chosenCycle = [...activeCycles].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  )[0] ?? null;

  return {
    date,
    activeCycleId: chosenCycle?.id ?? null,
    day: {
      ...day,
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        instructions: exercise.instructions?.map((instruction) => ({ ...instruction })) ?? [],
      })),
    },
  };
};
