import type { TrainingDay } from '@/data/trainingPlan';
import { trainingPlan as defaultPlan } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { translate, type LanguageCode } from '@/i18n';

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

export const formatUnknownExerciseName = (exerciseId: string, lang: LanguageCode = 'pl'): string => {
  const match = exerciseId.match(/^ex-(\d+)-(.+)$/);
  if (match) return translate(lang, 'resolver.exerciseNum', { n: match[1], sub: match[2] });

  const compact = exerciseId.trim();
  return compact ? translate(lang, 'resolver.exerciseId', { id: compact }) : translate(lang, 'resolver.exercise');
};

export const formatUnknownDayLabel = (dayId: string, lang: LanguageCode = 'pl'): { dayName: string; focus: string } => {
  const match = dayId.match(/^day-(\d+)$/);
  if (match) return { dayName: translate(lang, 'resolver.dayNum', { n: match[1] }), focus: '' };
  return { dayName: dayId ? translate(lang, 'resolver.trainingId', { id: dayId }) : translate(lang, 'resolver.training'), focus: '' };
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

    return planNames.get(exerciseId) || defaultNames.get(exerciseId) || formatUnknownExerciseName(exerciseId, lang);
  };

  // Kanoniczna nazwa PL z mapy/snapshotu -> nazwa w jezyku UI (EN tylko gdy mamy tlumaczenie).
  const resolveExerciseName = (workout: WorkoutSession, exerciseId: string): string =>
    localizeExerciseName(resolveRawExerciseName(workout, exerciseId), lang);

  const resolveRawDayLabel = (workout: WorkoutSession): { dayName: string; focus: string } => {
    if (workout.dayName) return { dayName: workout.dayName, focus: workout.dayFocus || '' };

    const cycle = cycleForWorkout(workout);
    const fromCycle = cycle && cycleDayMaps.get(cycle.id)?.get(workout.dayId);
    if (fromCycle) return fromCycle;

    return planDays.get(workout.dayId) || defaultDays.get(workout.dayId) || formatUnknownDayLabel(workout.dayId, lang);
  };

  const resolveDayLabel = (workout: WorkoutSession): { dayName: string; focus: string } => {
    const raw = resolveRawDayLabel(workout);
    return { dayName: localizeDayName(raw.dayName, lang), focus: localizeFocus(raw.focus, lang) };
  };

  return { resolveExerciseName, resolveDayLabel };
};
