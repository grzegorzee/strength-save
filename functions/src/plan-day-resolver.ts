const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const weekdayOf = (date: string): string => {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
};

export type ScheduleOverrides = Record<string, string | null>;

/** Kanoniczny resolver dnia planu po stronie Functions. */
export const resolvePlannedDayForDate = <T extends { id?: string; weekday?: string }>(
  date: string,
  planDays: T[],
  scheduleOverrides?: ScheduleOverrides | null,
  planStartDate?: string | null,
): T | null => {
  if (planStartDate && date < planStartDate) return null;
  if (scheduleOverrides && Object.prototype.hasOwnProperty.call(scheduleOverrides, date)) {
    const overrideDayId = scheduleOverrides[date];
    if (overrideDayId === null) return null;
    if (typeof overrideDayId === "string") {
      const overridden = planDays.find((candidate) => candidate.id === overrideDayId);
      if (overridden) return overridden;
    }
  }
  const weekday = weekdayOf(date);
  return planDays.find((candidate) => candidate.weekday === weekday) ?? null;
};
