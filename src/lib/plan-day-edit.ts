import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { WEEKDAY_ORDER, weekdayLong } from '@/lib/plan-cycle-utils';

export const MAX_PLAN_DAYS = 6;

const firstFreeWeekday = (days: TrainingDay[]): Weekday => {
  const used = new Set(days.map((d) => d.weekday));
  return WEEKDAY_ORDER.find((w) => !used.has(w)) ?? 'monday';
};

// Nowe id dnia w formacie 'day-N' (pierwszy wolny N) — format zgodny z prefiksem
// id ćwiczeń (exercisePrefixForDay w plan-cycle-utils).
const nextPlanDayId = (days: TrainingDay[]): string => {
  const used = new Set(days.map((d) => d.id));
  let n = days.length + 1;
  while (used.has(`day-${n}`)) n += 1;
  return `day-${n}`;
};

const exercisePrefixForDayId = (dayId: string): string => {
  if (dayId.startsWith('day-')) return `ex-${dayId.slice(4)}`;
  return `ex-${dayId.replace(/[^a-zA-Z0-9]+/g, '-')}`;
};

/** Dodaje pusty dzień (max 6). Bez weekday: pierwszy wolny dzień tygodnia. */
export const addPlanDay = (days: TrainingDay[], weekday?: Weekday): TrainingDay[] => {
  if (days.length >= MAX_PLAN_DAYS) return days;
  const nextWeekday = weekday ?? firstFreeWeekday(days);
  return [...days, {
    id: nextPlanDayId(days),
    dayName: weekdayLong(nextWeekday),
    weekday: nextWeekday,
    focus: '',
    exercises: [],
  }];
};

export const removePlanDay = (days: TrainingDay[], dayId: string): TrainingDay[] =>
  days.filter((d) => d.id !== dayId);

/** Duplikuje dzień: nowe id dnia i ćwiczeń (głęboka kopia), weekday = pierwszy wolny. */
export const duplicatePlanDay = (days: TrainingDay[], dayId: string): TrainingDay[] => {
  if (days.length >= MAX_PLAN_DAYS) return days;
  const source = days.find((d) => d.id === dayId);
  if (!source) return days;
  const newId = nextPlanDayId(days);
  const prefix = exercisePrefixForDayId(newId);
  const weekday = firstFreeWeekday(days);
  return [...days, {
    ...source,
    id: newId,
    weekday,
    dayName: weekdayLong(weekday),
    exercises: source.exercises.map((ex, index) => ({
      ...ex,
      id: `${prefix}-${index + 1}`,
      instructions: ex.instructions.map((inst) => ({ ...inst })),
    })),
  }];
};

/** Zmienia dzień tygodnia; kolizja = zamiana weekdayów między dniami (wzorzec PlanBuilder.setWeekday). */
export const setPlanDayWeekday = (days: TrainingDay[], dayId: string, weekday: Weekday): TrainingDay[] => {
  const target = days.find((d) => d.id === dayId);
  if (!target) return days;
  const clash = days.find((d) => d.id !== dayId && d.weekday === weekday);
  return days.map((d) => {
    if (d.id === dayId) return { ...d, weekday, dayName: weekdayLong(weekday) };
    if (clash && d.id === clash.id) return { ...d, weekday: target.weekday, dayName: weekdayLong(target.weekday) };
    return d;
  });
};

export const setPlanDayFocus = (days: TrainingDay[], dayId: string, focus: string): TrainingDay[] =>
  days.map((d) => (d.id === dayId ? { ...d, focus } : d));

/** Głęboka kopia dni szablonu z nowymi id (dni i ćwiczeń) — start buildera z szablonu (Z73). */
export const clonePlanDays = (days: TrainingDay[]): TrainingDay[] =>
  days.map((d, dayIndex) => {
    const newId = `day-${dayIndex + 1}`;
    const prefix = exercisePrefixForDayId(newId);
    return {
      ...d,
      id: newId,
      exercises: d.exercises.map((ex, i) => ({
        ...ex,
        id: `${prefix}-${i + 1}`,
        instructions: ex.instructions.map((inst) => ({ ...inst })),
      })),
    };
  });
