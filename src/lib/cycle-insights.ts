import type { TrainingDay } from '@/data/trainingPlan';
import { trainingPlan as defaultPlan } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import type { PlanCycle, PlanCycleStats } from '@/types/cycles';
import { calculate1RM, detectNewPRs } from '@/lib/pr-utils';
import { addCalendarDays, calendarDayDiff, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { translate, type LanguageCode } from '@/i18n';

export interface CycleRecommendation {
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'info';
  // Czy to moment na zamknięcie cyklu (pokazać akcję "Domknij/Powtórz"). False w trakcie cyklu.
  canCloseout: boolean;
  // Świeży cykl tuż po starcie (powitanie zamiast oceny frekwencji).
  isKickoff?: boolean;
}

export interface CycleComparison {
  completionRateDelta: number;
  tonnageDelta: number;
  prDelta: number;
}

const weekdayOffset: Record<TrainingDay['weekday'], number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

interface ExpectedPlanSession {
  date: string;
  dayId: string;
}

const buildExpectedPlanSessions = (
  planDays: TrainingDay[],
  startDate: string,
  endDate: string,
  durationWeeks: number,
): ExpectedPlanSession[] => {
  if (planDays.length === 0 || durationWeeks <= 0 || startDate > endDate) return [];

  const expected: ExpectedPlanSession[] = [];
  const scheduledDays = planDays
    .map(day => ({ dayId: day.id, offset: weekdayOffset[day.weekday] }))
    .filter((entry) => Number.isInteger(entry.offset))
    .sort((left, right) => left.offset - right.offset);
  const start = parseLocalDate(startDate);
  const dayOfWeek = start.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const firstWeekMonday = addCalendarDays(startDate, -daysSinceMonday);

  for (let week = 0; week < durationWeeks; week += 1) {
    const weekStart = addCalendarDays(firstWeekMonday, week * 7);
    for (const scheduledDay of scheduledDays) {
      const sessionDate = addCalendarDays(weekStart, scheduledDay.offset);
      if (sessionDate >= startDate && sessionDate <= endDate) {
        expected.push({ date: sessionDate, dayId: scheduledDay.dayId });
      }
    }
  }

  return expected;
};

export const computeCycleStats = (
  workouts: WorkoutSession[],
  planDays: TrainingDay[],
  startDate: string,
  endDate: string,
  durationWeeks: number,
  cycleId?: string | null,
): PlanCycleStats => {
  const todayStr = formatLocalDate(new Date());
  const effectiveEndStr = (endDate && endDate < todayStr) ? endDate : todayStr;
  const expectedSessions = buildExpectedPlanSessions(planDays, startDate, effectiveEndStr, durationWeeks);
  const expectedSlotKeys = new Set(
    expectedSessions.map((session) => `${session.date}:${session.dayId}`),
  );
  const eligibleWorkouts = workouts.filter((workout) => {
    if (!workout.completed || workout.date < startDate || workout.date > effectiveEndStr) return false;
    if (!cycleId) return !workout.cycleId;
    if (workout.cycleId === cycleId) return true;
    // Ukończony orphan może potwierdzić obecność tylko w dokładnym slocie planu.
    return !workout.cycleId && expectedSlotKeys.has(`${workout.date}:${workout.dayId}`);
  });

  const completedSetCount = (workout: WorkoutSession) => workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
    0,
  );
  const uniqueWorkouts = new Map<string, WorkoutSession>();
  eligibleWorkouts.forEach((workout) => {
    const key = `${workout.date}:${workout.dayId}`;
    const current = uniqueWorkouts.get(key);
    if (
      !current
      || (workout.cycleId === cycleId && current.cycleId !== cycleId)
      || completedSetCount(workout) > completedSetCount(current)
    ) {
      uniqueWorkouts.set(key, workout);
    }
  });
  const cycleWorkouts = [...uniqueWorkouts.values()];

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
      orphanWorkoutCount: 0,
      duplicateWorkoutsIgnored: 0,
    };
  }
  const expectedWorkouts = expectedSessions.length;
  const attendedSlots = new Set(
    cycleWorkouts
      .map((workout) => `${workout.date}:${workout.dayId}`)
      .filter((key) => expectedSlotKeys.has(key)),
  ).size;
  const completionRate = expectedWorkouts > 0
    ? Math.min(100, Math.round((attendedSlots / expectedWorkouts) * 100))
    : 0;
  const missedWorkouts = Math.max(expectedWorkouts - attendedSlots, 0);
  const orphanWorkoutCount = cycleId
    ? cycleWorkouts.filter((workout) => !workout.cycleId).length
    : 0;

  return {
    totalWorkouts,
    totalTonnage,
    prs,
    completionRate,
    expectedWorkouts,
    missedWorkouts,
    averageWorkoutsPerWeek: durationWeeks > 0 ? Math.round((totalWorkouts / durationWeeks) * 10) / 10 : 0,
    averageTonnagePerWorkout: totalWorkouts > 0 ? Math.round(totalTonnage / totalWorkouts) : 0,
    orphanWorkoutCount,
    duplicateWorkoutsIgnored: Math.max(0, eligibleWorkouts.length - cycleWorkouts.length),
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

export const buildCycleRecommendation = (
  cycle: PlanCycle,
  previousCycle: PlanCycle | null,
  now = new Date(),
  lang: LanguageCode = 'pl',
  options: { hasPendingFinalSync?: boolean } = {},
): CycleRecommendation => {
  // Aktywny cykl uznajemy za "wygasły" (czas na closeout) DOPIERO gdy minął jego planowany
  // koniec (startDate + durationWeeks), a NIE na podstawie endDate — bo buildActiveCyclePreview
  // ustawia endDate=dziś, co fałszywie wyzwalało closeout dla świeżo rozpoczętych cykli.
  const plannedEnd = parseLocalDate(addCalendarDays(cycle.startDate, cycle.durationWeeks * 7));
  const isExpired = cycle.status === 'completed'
    ? (!!cycle.endDate && parseLocalDate(cycle.endDate) <= now)
    : plannedEnd <= now;
  // Akcję zamknięcia/powtórzenia pokazujemy TYLKO gdy cykl wygasł lub jest zakończony —
  // nie w trakcie (wtedy user ma tylko monitorować).
  const canCloseout = isExpired || cycle.status === 'completed';
  const comparison = buildCycleComparison(cycle, previousCycle);

  // Ile dni minęło od startu cyklu. Pierwszy tydzień = okres karencji:
  // nie oceniamy frekwencji (świeży cykl po onboardingu zawsze miałby 0% i fałszywy alarm).
  const elapsedDays = calendarDayDiff(cycle.startDate, formatLocalDate(now));
  const inFirstWeek = elapsedDays < 7;

  if ((cycle.stats.orphanWorkoutCount ?? 0) > 0 || options.hasPendingFinalSync) {
    return {
      title: translate(lang, 'cyclerec.sync.title'),
      description: translate(lang, 'cyclerec.sync.desc'),
      tone: 'info',
      canCloseout: false,
    };
  }

  // Świeży, aktywny cykl bez treningów → POWITANIE (kick-off), a nie ostrzeżenie o frekwencji.
  if (cycle.status === 'active' && cycle.stats.totalWorkouts === 0 && inFirstWeek) {
    return {
      title: translate(lang, 'cyclerec.kickoff.title'),
      description: translate(lang, 'cyclerec.kickoff.desc'),
      tone: 'success',
      canCloseout: false,
      isKickoff: true,
    };
  }

  // Ostrzeżenie o niskiej frekwencji DOPIERO po pierwszym tygodniu (po karencji).
  if (cycle.status === 'active' && !inFirstWeek && cycle.stats.completionRate < 60) {
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
