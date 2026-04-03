import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import type { PlanCycle, PlanCycleStats } from '@/types/cycles';
import { calculate1RM } from '@/lib/pr-utils';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

export interface CycleRecommendation {
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'info';
}

export interface CycleComparison {
  completionRateDelta: number;
  tonnageDelta: number;
  prDelta: number;
}

export const computeCycleStats = (
  workouts: WorkoutSession[],
  planDays: TrainingDay[],
  startDate: string,
  endDate: string,
  durationWeeks: number,
  cycleId?: string | null,
): PlanCycleStats => {
  const cycleWorkouts = workouts.filter(
    (workout) => {
      if (!workout.completed) return false;
      if (cycleId && workout.cycleId === cycleId) return true;
      return !workout.cycleId && workout.date >= startDate && workout.date <= endDate;
    },
  );

  const totalWorkouts = cycleWorkouts.length;
  const totalTonnage = cycleWorkouts.reduce((sum, workout) =>
    sum + workout.exercises.reduce((exerciseSum, exercise) =>
      exerciseSum + exercise.sets.reduce((setSum, set) => setSum + (set.completed ? set.reps * set.weight : 0), 0), 0), 0);

  const exerciseBests = new Map<string, { weight: number; estimated1RM: number }>();
  const exerciseNames = new Map(planDays.flatMap(day => day.exercises.map(exercise => [exercise.id, exercise.name])));

  cycleWorkouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (!set.completed || set.isWarmup) return;
        const estimated1RM = calculate1RM(set.weight, set.reps);
        const current = exerciseBests.get(exercise.exerciseId);
        if (!current || estimated1RM > current.estimated1RM) {
          exerciseBests.set(exercise.exerciseId, { weight: set.weight, estimated1RM });
        }
      });
    });
  });

  const prs = Array.from(exerciseBests.entries())
    .map(([exerciseId, data]) => ({
      exerciseName: exerciseNames.get(exerciseId) || exerciseId,
      weight: data.weight,
      estimated1RM: Math.round(data.estimated1RM * 10) / 10,
    }))
    .sort((a, b) => b.estimated1RM - a.estimated1RM)
    .slice(0, 10);

  const expectedWorkouts = Math.max(planDays.length * durationWeeks, 0);
  const completionRate = expectedWorkouts > 0 ? Math.round((totalWorkouts / expectedWorkouts) * 100) : 0;
  const missedWorkouts = Math.max(expectedWorkouts - totalWorkouts, 0);

  return {
    totalWorkouts,
    totalTonnage,
    prs,
    completionRate,
    expectedWorkouts,
    missedWorkouts,
    averageWorkoutsPerWeek: durationWeeks > 0 ? Math.round((totalWorkouts / durationWeeks) * 10) / 10 : 0,
    averageTonnagePerWorkout: totalWorkouts > 0 ? Math.round(totalTonnage / totalWorkouts) : 0,
  };
};

export const buildCycleComparison = (cycle: PlanCycle, previousCycle: PlanCycle | null): CycleComparison | null => {
  if (!previousCycle) return null;

  return {
    completionRateDelta: cycle.stats.completionRate - previousCycle.stats.completionRate,
    tonnageDelta: cycle.stats.totalTonnage - previousCycle.stats.totalTonnage,
    prDelta: cycle.stats.prs.length - previousCycle.stats.prs.length,
  };
};

export const buildCycleRecommendation = (cycle: PlanCycle, previousCycle: PlanCycle | null, now = new Date()): CycleRecommendation => {
  const isExpired = !!cycle.endDate && parseLocalDate(cycle.endDate) <= now;
  const comparison = buildCycleComparison(cycle, previousCycle);

  if (cycle.status === 'active' && cycle.stats.completionRate < 60) {
    return {
      title: 'Ustabilizuj realizację planu',
      description: 'Frekwencja jest niska. Zanim zwiększysz objętość, dopracuj regularność i rytm tygodnia.',
      tone: 'warning',
    };
  }

  if (cycle.status === 'active' && cycle.stats.prs.length >= 3 && cycle.stats.completionRate >= 80) {
    return {
      title: 'Cykl dowozi progres',
      description: 'Masz dobrą frekwencję i realny progres. Możesz kontynuować plan albo przygotować kolejny cykl z wyższym bodźcem.',
      tone: 'success',
    };
  }

  if (isExpired || cycle.status === 'completed') {
    return {
      title: 'Czas na closeout i decyzję co dalej',
      description: comparison && comparison.completionRateDelta < 0
        ? 'Ten cykl wypadł słabiej niż poprzedni. Rozważ deload albo prostszy układ tygodnia przed kolejnym planem.'
        : 'Podsumuj wyniki cyklu i wygeneruj kolejny plan na bazie aktualnego poziomu.',
      tone: 'info',
    };
  }

  return {
    title: 'Monitoruj progres tygodniowy',
    description: 'Sprawdzaj frekwencję, tonaż i PR-y. Jeśli przestają rosnąć przez kilka tygodni, przygotuj nowy blok.',
    tone: 'info',
  };
};

export const buildActiveCyclePreview = (
  activeCycle: PlanCycle | null,
  workouts: WorkoutSession[],
  today = new Date(),
): PlanCycle | null => {
  if (!activeCycle) return null;

  const endDate = formatLocalDate(today);
  return {
    ...activeCycle,
    endDate,
    stats: computeCycleStats(
      workouts,
      activeCycle.days,
      activeCycle.startDate,
      endDate,
      activeCycle.durationWeeks,
      activeCycle.id,
    ),
  };
};
