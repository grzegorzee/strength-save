import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { formatLocalDate } from '@/lib/utils';

const WEEKDAY_TO_JS_DAY: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const WEEKDAY_TO_OFFSET_FROM_MONDAY: Record<Weekday, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

export interface ScheduledTrainingDay {
  day: TrainingDay;
  date: Date;
  dateKey: string;
}

export const startOfLocalDay = (date: Date): Date => (
  new Date(date.getFullYear(), date.getMonth(), date.getDate())
);

export const getStartOfPlanWeek = (date: Date): Date => {
  const localDate = startOfLocalDay(date);
  const dayOfWeek = localDate.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  localDate.setDate(localDate.getDate() - daysSinceMonday);
  return localDate;
};

export const getScheduledDateForDay = (weekStart: Date, weekday: Weekday): Date => {
  const date = startOfLocalDay(weekStart);
  date.setDate(date.getDate() + WEEKDAY_TO_OFFSET_FROM_MONDAY[weekday]);
  return date;
};

export const getTrainingDayForDate = (planDays: TrainingDay[], date: Date): TrainingDay | null => {
  const jsDay = startOfLocalDay(date).getDay();
  return planDays.find((day) => WEEKDAY_TO_JS_DAY[day.weekday] === jsDay) ?? null;
};

export const getScheduledTrainingForDate = (planDays: TrainingDay[], date: Date): ScheduledTrainingDay | null => {
  const day = getTrainingDayForDate(planDays, date);
  if (!day) return null;

  const localDate = startOfLocalDay(date);
  return {
    day,
    date: localDate,
    dateKey: formatLocalDate(localDate),
  };
};

export const getScheduledTrainingWeek = (planDays: TrainingDay[], referenceDate: Date): ScheduledTrainingDay[] => {
  const weekStart = getStartOfPlanWeek(referenceDate);

  return [...planDays]
    .sort((left, right) => WEEKDAY_TO_OFFSET_FROM_MONDAY[left.weekday] - WEEKDAY_TO_OFFSET_FROM_MONDAY[right.weekday])
    .map((day) => {
      const date = getScheduledDateForDay(weekStart, day.weekday);
      return {
        day,
        date,
        dateKey: formatLocalDate(date),
      };
    });
};

export const getNextScheduledTraining = (
  planDays: TrainingDay[],
  fromDate: Date,
  options: { includeSameDay?: boolean; searchDays?: number } = {}
): ScheduledTrainingDay | null => {
  const { includeSameDay = false, searchDays = 14 } = options;
  const start = startOfLocalDay(fromDate);

  for (let offset = includeSameDay ? 0 : 1; offset <= searchDays; offset += 1) {
    const date = startOfLocalDay(start);
    date.setDate(start.getDate() + offset);
    const scheduled = getScheduledTrainingForDate(planDays, date);
    if (scheduled) {
      return scheduled;
    }
  }

  return null;
};

export const countScheduledTrainingsInRange = (
  planDays: TrainingDay[],
  startDate: Date,
  endDate: Date
): number => {
  if (planDays.length === 0) return 0;

  const start = startOfLocalDay(startDate);
  const end = startOfLocalDay(endDate);
  let total = 0;

  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    if (getTrainingDayForDate(planDays, day)) {
      total += 1;
    }
  }

  return total;
};

export const buildTrainingSchedule = (
  planDays: TrainingDay[],
  startDate: Date,
  weeks: number
): Array<{ date: Date; dayId: string }> => {
  const normalizedStart = getStartOfPlanWeek(startDate);
  const schedule: Array<{ date: Date; dayId: string }> = [];

  for (let week = 0; week < weeks; week += 1) {
    const weekStart = startOfLocalDay(normalizedStart);
    weekStart.setDate(normalizedStart.getDate() + (week * 7));

    for (const item of getScheduledTrainingWeek(planDays, weekStart)) {
      schedule.push({ date: item.date, dayId: item.day.id });
    }
  }

  return schedule;
};
