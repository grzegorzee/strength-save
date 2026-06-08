import type { TrainingDay } from '@/data/trainingPlan';
import { trainingPlan as defaultPlan } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import type { PlanCycle, PlanCycleStats } from '@/types/cycles';
import { calculate1RM, detectNewPRs } from '@/lib/pr-utils';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { translate, type LanguageCode } from '@/i18n';

export interface CycleRecommendation {
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'info';
  // Czy to moment na zamknięcie cyklu (pokazać akcję "Domknij/Powtórz"). False w trakcie cyklu.
  canCloseout: boolean;
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
      // With a real cycleId, count ONLY workouts tagged with it — a fresh cycle starts empty
      // and must not retroactively claim untagged workouts that fall in its date range.
      if (cycleId) return workout.cycleId === cycleId;
      // Legacy/aggregate path (no cycleId supplied): attribute untagged workouts by date range.
      return !workout.cycleId && workout.date >= startDate && workout.date <= endDate;
    },
  );

  const totalWorkouts = cycleWorkouts.length;
  const totalTonnage = cycleWorkouts.reduce((sum, workout) =>
    sum + workout.exercises.reduce((exerciseSum, exercise) =>
      exerciseSum + exercise.sets.reduce((setSum, set) => setSum + (set.completed ? set.reps * set.weight : 0), 0), 0), 0);

  const exerciseBests = new Map<string, { weight: number; estimated1RM: number }>();
  // Resolve names from this cycle's days first, then fall back to the default plan
  // (covers legacy workouts whose exercise ids aren't in the current cycle).
  const exerciseNames = new Map<string, string>([
    ...defaultPlan.flatMap(day => day.exercises.map(exercise => [exercise.id, exercise.name] as [string, string])),
    ...planDays.flatMap(day => day.exercises.map(exercise => [exercise.id, exercise.name] as [string, string])),
  ]);
  // Snapshot nazw z samych treningów ma najwyższy priorytet (odporny na zmianę planu).
  const snapshotNames = new Map<string, string>();

  cycleWorkouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      if (exercise.name && !snapshotNames.has(exercise.exerciseId)) {
        snapshotNames.set(exercise.exerciseId, exercise.name);
      }
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

  // PR-y = RZECZYWISTE rekordy: ćwiczenia, które w którymś treningu cyklu pobiły dotychczasowy
  // najlepszy wynik z CAŁEJ historii sprzed tego treningu (nie top-N najmocniejszych ćwiczeń cyklu).
  const prExerciseIds = new Set<string>();
  for (const w of cycleWorkouts) {
    const before = workouts.filter((x) => x.completed && x.date < w.date);
    for (const pr of detectNewPRs(w, before, exerciseNames)) {
      prExerciseIds.add(pr.exerciseId);
    }
  }

  const prs = Array.from(exerciseBests.entries())
    .filter(([exerciseId]) => prExerciseIds.has(exerciseId))
    .map(([exerciseId, data]) => ({
      exerciseName: snapshotNames.get(exerciseId) || exerciseNames.get(exerciseId) || exerciseId,
      weight: data.weight,
      estimated1RM: Math.round(data.estimated1RM * 10) / 10,
    }))
    .sort((a, b) => b.estimated1RM - a.estimated1RM);

  // Expected sessions are based on time ELAPSED so far (capped at plan length),
  // not the whole plan — a fresh/active cycle shouldn't show all future sessions as "missed".
  const todayStr = formatLocalDate(new Date());
  // Plan startujący w przyszłości jeszcze nie ruszył → 0 oczekiwanych sesji, 0% (nic nie "ominięte").
  if (startDate > todayStr) {
    return {
      totalWorkouts,
      totalTonnage,
      prs,
      completionRate: 0,
      expectedWorkouts: 0,
      missedWorkouts: 0,
      averageWorkoutsPerWeek: 0,
      averageTonnagePerWorkout: totalWorkouts > 0 ? Math.round(totalTonnage / totalWorkouts) : 0,
    };
  }
  // Active cycles persist endDate='' — treat empty/future end as today (avoids parseLocalDate NaN).
  const effectiveEndStr = (endDate && endDate < todayStr) ? endDate : todayStr; // min(endDate, today)
  const elapsedDays = Math.floor(
    (parseLocalDate(effectiveEndStr).getTime() - parseLocalDate(startDate).getTime()) / 86_400_000,
  );
  const elapsedWeeks = elapsedDays < 0 ? 0 : Math.floor(elapsedDays / 7) + 1;
  const effectiveWeeks = Math.min(elapsedWeeks, durationWeeks);
  const expectedWorkouts = Math.max(planDays.length * effectiveWeeks, 0);
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
  // Świeży cykl bez treningów nie ma czego porównywać — inaczej pokazywałby tylko ujemne delty
  // (np. -50000 kg) względem zakończonego cyklu. Porównanie pojawi się po pierwszym treningu.
  if (cycle.stats.totalWorkouts === 0) return null;

  return {
    completionRateDelta: cycle.stats.completionRate - previousCycle.stats.completionRate,
    // Porównujemy tonaż NA TRENING (niezależny od długości/postępu cyklu), nie sumę —
    // suma świeżego cyklu vs zakończonego zawsze dawała absurdalny minus.
    tonnageDelta: (cycle.stats.averageTonnagePerWorkout ?? 0) - (previousCycle.stats.averageTonnagePerWorkout ?? 0),
    prDelta: cycle.stats.prs.length - previousCycle.stats.prs.length,
  };
};

export const buildCycleRecommendation = (cycle: PlanCycle, previousCycle: PlanCycle | null, now = new Date(), lang: LanguageCode = 'pl'): CycleRecommendation => {
  // Aktywny cykl uznajemy za "wygasły" (czas na closeout) DOPIERO gdy minął jego planowany
  // koniec (startDate + durationWeeks), a NIE na podstawie endDate — bo buildActiveCyclePreview
  // ustawia endDate=dziś, co fałszywie wyzwalało closeout dla świeżo rozpoczętych cykli.
  const plannedEnd = new Date(parseLocalDate(cycle.startDate).getTime() + cycle.durationWeeks * 7 * 86_400_000);
  const isExpired = cycle.status === 'completed'
    ? (!!cycle.endDate && parseLocalDate(cycle.endDate) <= now)
    : plannedEnd <= now;
  // Akcję zamknięcia/powtórzenia pokazujemy TYLKO gdy cykl wygasł lub jest zakończony —
  // nie w trakcie (wtedy user ma tylko monitorować).
  const canCloseout = isExpired || cycle.status === 'completed';
  const comparison = buildCycleComparison(cycle, previousCycle);

  if (cycle.status === 'active' && cycle.stats.completionRate < 60) {
    return {
      title: translate(lang, 'cyclerec.stabilize.title'),
      description: translate(lang, 'cyclerec.stabilize.desc'),
      tone: 'warning',
      canCloseout,
    };
  }

  // "Cykl dowozi progres" z akcjami closeoutu pokazujemy dopiero po zakończeniu
  // cyklu (isExpired), nie w jego trakcie — w trakcie spada do neutralnego statusu.
  if (cycle.status === 'active' && isExpired && cycle.stats.prs.length >= 3 && cycle.stats.completionRate >= 80) {
    return {
      title: translate(lang, 'cyclerec.progress.title'),
      description: translate(lang, 'cyclerec.progress.desc'),
      tone: 'success',
      canCloseout,
    };
  }

  if (isExpired || cycle.status === 'completed') {
    return {
      title: translate(lang, 'cyclerec.closeout.title'),
      description: comparison && comparison.completionRateDelta < 0
        ? translate(lang, 'cyclerec.closeout.descWorse')
        : translate(lang, 'cyclerec.closeout.descOk'),
      tone: 'info',
      canCloseout,
    };
  }

  return {
    title: translate(lang, 'cyclerec.monitor.title'),
    description: translate(lang, 'cyclerec.monitor.desc'),
    tone: 'info',
    canCloseout,
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
