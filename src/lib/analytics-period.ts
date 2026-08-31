import { getMonthBounds, getWeekBounds } from '@/lib/summary-utils';

export type AnalyticsPeriod = 'week' | 'month';

const endOfDay = (date: Date): Date => new Date(
  date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999,
);

const shiftBounds = (period: AnalyticsPeriod, offset: number, now: Date) => {
  if (period === 'week') {
    const shifted = new Date(now);
    shifted.setDate(shifted.getDate() + offset * 7);
    return getWeekBounds(shifted);
  }
  return getMonthBounds(new Date(now.getFullYear(), now.getMonth() + offset, 1));
};

export const getAnalyticsPeriodWindow = (
  period: AnalyticsPeriod,
  offset: number,
  now = new Date(),
) => {
  const safeOffset = Math.min(0, Math.max(-120, Math.trunc(offset)));
  const bounds = shiftBounds(period, safeOffset, now);
  const previous = shiftBounds(period, safeOffset - 1, now);
  const currentEnd = safeOffset === 0 ? endOfDay(now) : bounds.end;

  const elapsedCalendarDays = Math.round((Date.UTC(
    currentEnd.getFullYear(), currentEnd.getMonth(), currentEnd.getDate(),
  ) - Date.UTC(
    bounds.start.getFullYear(), bounds.start.getMonth(), bounds.start.getDate(),
  )) / 86_400_000);
  const previousComparableEnd = new Date(previous.start);
  previousComparableEnd.setDate(previousComparableEnd.getDate() + elapsedCalendarDays);

  return {
    offset: safeOffset,
    bounds,
    comparisonCurrent: { start: bounds.start, end: currentEnd < bounds.end ? currentEnd : bounds.end },
    comparisonPrevious: {
      start: previous.start,
      end: previousComparableEnd < previous.end ? endOfDay(previousComparableEnd) : previous.end,
    },
    canGoNext: safeOffset < 0,
  };
};
