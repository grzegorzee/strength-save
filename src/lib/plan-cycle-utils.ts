import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';
import { calendarDayDiff, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';

export const WEEKDAY_ORDER: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const weekdayLabel: Record<Weekday, string> = {
  monday: 'Poniedziałek',
  tuesday: 'Wtorek',
  wednesday: 'Środa',
  thursday: 'Czwartek',
  friday: 'Piątek',
  saturday: 'Sobota',
  sunday: 'Niedziela',
};

export const uniqueSortedWeekdays = (weekdays: Weekday[]): Weekday[] => {
  const selected = new Set(weekdays);
  return WEEKDAY_ORDER.filter(day => selected.has(day));
};

export const hasExactWeekdaySelection = (weekdays: Weekday[], daysPerWeek: number): boolean =>
  uniqueSortedWeekdays(weekdays).length === daysPerWeek;

export const applyWeekdaysToPlanDays = (days: TrainingDay[], weekdays: Weekday[]): TrainingDay[] => {
  const selected = uniqueSortedWeekdays(weekdays);
  return days.slice(0, selected.length).map((day, index) => {
    const weekday = selected[index];
    return { ...day, weekday, dayName: weekdayLabel[weekday] };
  });
};

export const getCycleStartPreview = (selectedDate: string): { selectedDate: string; cycleStartDate: string } => ({
  selectedDate,
  cycleStartDate: formatLocalDate(getStartOfPlanWeek(parseLocalDate(selectedDate))),
});

export const assignCycleDayIds = (days: TrainingDay[], startDate: string): TrainingDay[] =>
  days.map((day, index) => ({ ...day, id: `${startDate}-d${index + 1}` }));

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const exercisePrefixForDay = (dayId: string): string => {
  if (dayId.startsWith('day-')) return `ex-${dayId.slice(4)}`;
  return `ex-${dayId.replace(/[^a-zA-Z0-9]+/g, '-')}`;
};

export const nextExerciseIdForDay = (day: TrainingDay): string => {
  const prefix = exercisePrefixForDay(day.id);
  const matcher = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)`);
  const maxExisting = day.exercises.reduce((max, exercise) => {
    const match = exercise.id.match(matcher);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${maxExisting + 1}`;
};

const normalizedExerciseKey = (name: string): string =>
  name.trim().toLocaleLowerCase('pl-PL').replace(/\s+/g, ' ');

export const planExerciseOverlap = (left: TrainingDay[], right: TrainingDay[]): number => {
  const leftNames = new Set(left.flatMap(day => day.exercises.map(ex => normalizedExerciseKey(ex.name))));
  const rightNames = new Set(right.flatMap(day => day.exercises.map(ex => normalizedExerciseKey(ex.name))));
  if (leftNames.size === 0 || rightNames.size === 0) return 0;
  let common = 0;
  leftNames.forEach(name => {
    if (rightNames.has(name)) common += 1;
  });
  return common / Math.max(leftNames.size, rightNames.size);
};

export const planTemplateHash = (days: TrainingDay[]): string =>
  days
    .map(day => [
      day.weekday,
      normalizedExerciseKey(day.focus),
      ...day.exercises.map(ex => `${normalizedExerciseKey(ex.name)}:${ex.sets.trim()}`),
    ].join('|'))
    .join('||');

export const shouldMergeContinuousCycles = (previous: PlanCycle, next: PlanCycle): boolean => {
  if (!previous.endDate || !next.startDate || next.startDate < previous.endDate) return false;
  const daysBetween = calendarDayDiff(previous.endDate, next.startDate);
  if (daysBetween > 14) return false;

  const previousTemplateId = (previous as PlanCycle & { templateId?: string }).templateId;
  const nextTemplateId = (next as PlanCycle & { templateId?: string }).templateId;
  if (previousTemplateId && nextTemplateId) return previousTemplateId === nextTemplateId;
  if (planTemplateHash(previous.days) === planTemplateHash(next.days)) return true;
  return planExerciseOverlap(previous.days, next.days) >= 0.7;
};

export const buildActiveCyclePlanPatch = (
  days: TrainingDay[],
  durationWeeks: number,
  startDate: string | null,
): { days: TrainingDay[]; durationWeeks: number; startDate?: string } => ({
  days,
  durationWeeks,
  ...(startDate ? { startDate } : {}),
});

/** Firestore allows 500 writes per batch; reserve headroom for future metadata writes. */
export const chunkForFirestoreWrite = <T>(items: T[], size = 450): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
};
