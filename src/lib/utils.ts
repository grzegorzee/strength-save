import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDate = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`Invalid date-only value: ${value}`);

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (formatLocalDate(parsed) !== value) throw new RangeError(`Invalid date-only value: ${value}`);
  return parsed;
};

/** Difference between date-only values, independent of local daylight-saving offsets. */
export const calendarDayDiff = (from: string, to: string): number => {
  const fromDate = parseLocalDate(from);
  const toDate = parseLocalDate(to);
  return Math.round((
    Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
    - Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  ) / 86_400_000);
};

/** Adds calendar days without assuming a local day has 24 hours. */
export const addCalendarDays = (value: string, days: number): string => {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
};
