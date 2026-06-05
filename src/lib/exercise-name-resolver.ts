import type { TrainingDay } from '@/data/trainingPlan';
import { trainingPlan as defaultPlan } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';
import { localizeExerciseName } from '@/data/exercise-i18n';
import type { LanguageCode } from '@/i18n';

// Resolver nazw ćwiczeń i etykiet dni dla historycznych treningów.
//
// Problem: WorkoutSession trzyma niestabilne między planami exerciseId/dayId. Gdy plan
// zostanie nadpisany, resolwowanie nazw przez AKTUALNY plan zwraca undefined lub błędną
// nazwę (kolizja id). Resolver szuka nazwy w kolejności od najpewniejszego źródła:
//   1. snapshot zapisany w samym treningu (name / dayName / dayFocus) — zawsze poprawny,
//   2. zarchiwizowany cykl, do którego należy trening (po cycleId lub zakresie dat),
//   3. aktualny plan treningowy,
//   4. domyślny plan (defaultPlan),
//   5. surowy id jako ostateczność.

export interface WorkoutResolver {
  resolveExerciseName: (workout: WorkoutSession, exerciseId: string) => string;
  resolveDayLabel: (workout: WorkoutSession) => { dayName: string; focus: string };
}

const buildNameMap = (days: TrainingDay[]): Map<string, string> =>
  new Map(days.flatMap(day => day.exercises.map(ex => [ex.id, ex.name] as [string, string])));

const buildDayMap = (days: TrainingDay[]): Map<string, { dayName: string; focus: string }> =>
  new Map(days.map(day => [day.id, { dayName: day.dayName, focus: day.focus }] as [string, { dayName: string; focus: string }]));

export const formatUnknownExerciseName = (exerciseId: string): string => {
  const match = exerciseId.match(/^ex-(\d+)-(.+)$/);
  if (match) return `Ćwiczenie ${match[1]}.${match[2]}`;

  const compact = exerciseId.trim();
  return compact ? `Ćwiczenie (${compact})` : 'Ćwiczenie';
};

export const formatUnknownDayLabel = (dayId: string): { dayName: string; focus: string } => {
  const match = dayId.match(/^day-(\d+)$/);
  if (match) return { dayName: `Dzień treningowy ${match[1]}`, focus: '' };
  return { dayName: dayId ? `Trening ${dayId}` : 'Trening', focus: '' };
};

export const buildWorkoutResolver = (
  trainingPlan: TrainingDay[],
  cycles: PlanCycle[] = [],
  lang: LanguageCode = 'pl',
): WorkoutResolver => {
  const planNames = buildNameMap(trainingPlan);
  const planDays = buildDayMap(trainingPlan);
  const defaultNames = buildNameMap(defaultPlan);
  const defaultDays = buildDayMap(defaultPlan);

  const cycleNameMaps = new Map<string, Map<string, string>>();
  const cycleDayMaps = new Map<string, Map<string, { dayName: string; focus: string }>>();
  cycles.forEach(cycle => {
    cycleNameMaps.set(cycle.id, buildNameMap(cycle.days || []));
    cycleDayMaps.set(cycle.id, buildDayMap(cycle.days || []));
  });

  // Cykl, do którego należy dany trening: najpierw po cycleId, w razie braku po zakresie dat.
  const cycleForWorkout = (workout: WorkoutSession): PlanCycle | undefined => {
    if (workout.cycleId) {
      const byId = cycles.find(c => c.id === workout.cycleId);
      if (byId) return byId;
    }
    return cycles.find(c =>
      workout.date >= c.startDate && (!c.endDate || workout.date <= c.endDate),
    );
  };

  const resolveRawExerciseName = (workout: WorkoutSession, exerciseId: string): string => {
    const snapshot = workout.exercises.find(e => e.exerciseId === exerciseId)?.name;
    if (snapshot) return snapshot;

    const cycle = cycleForWorkout(workout);
    const fromCycle = cycle && cycleNameMaps.get(cycle.id)?.get(exerciseId);
    if (fromCycle) return fromCycle;

    return planNames.get(exerciseId) || defaultNames.get(exerciseId) || formatUnknownExerciseName(exerciseId);
  };

  // Kanoniczna nazwa PL z mapy/snapshotu -> nazwa w jezyku UI (EN tylko gdy mamy tlumaczenie).
  const resolveExerciseName = (workout: WorkoutSession, exerciseId: string): string =>
    localizeExerciseName(resolveRawExerciseName(workout, exerciseId), lang);

  const resolveDayLabel = (workout: WorkoutSession): { dayName: string; focus: string } => {
    if (workout.dayName) return { dayName: workout.dayName, focus: workout.dayFocus || '' };

    const cycle = cycleForWorkout(workout);
    const fromCycle = cycle && cycleDayMaps.get(cycle.id)?.get(workout.dayId);
    if (fromCycle) return fromCycle;

    return planDays.get(workout.dayId) || defaultDays.get(workout.dayId) || formatUnknownDayLabel(workout.dayId);
  };

  return { resolveExerciseName, resolveDayLabel };
};
