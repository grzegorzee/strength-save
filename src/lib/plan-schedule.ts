import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

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

const JS_DAY_TO_WEEKDAY: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Weekday daty lokalnej (do kropek tygodnia liczonych z harmonogramu, nie z planu). */
export const weekdayOfDate = (date: Date): Weekday => JS_DAY_TO_WEEKDAY[startOfLocalDay(date).getDay()];

export const getTrainingDayForDate = (planDays: TrainingDay[], date: Date): TrainingDay | null => {
  const jsDay = startOfLocalDay(date).getDay();
  return planDays.find((day) => WEEKDAY_TO_JS_DAY[day.weekday] === jsDay) ?? null;
};

/**
 * Przełożenia treningów (spec 2026-08-11): mapa data -> dayId obowiązujący tego
 * dnia; null = dzień wolny (domyślny trening przeniesiono gdzie indziej).
 * Wpis dotyczy KONKRETNEJ daty (YYYY-MM-DD), nie weekday.
 */
export type ScheduleOverrides = Record<string, string | null>;

/**
 * Kanoniczny resolver data -> dzień planu (kontrakt między serwisami; lustrzana
 * kopia w functions/src/garmin-day.ts, parity pilnowane wspólnym fixture
 * fixtures/cross-platform/schedule-overrides-v1.json):
 * 0. (WP-PLANS-2, X27) dzień planowy istnieje dopiero od startu planu — data
 *    przed planStartDateISO = null, override też nie wskrzesza dnia;
 * 1. wpis w scheduleOverrides[dateISO]: null = dzień wolny; dayId spoza planu
 *    (osierocony po zmianie planu) = wpis ignorowany, spada do reguły 2;
 * 2. brak wpisu: dotychczasowa reguła po weekday.
 */
export const resolvePlannedDay = (
  dateISO: string,
  planDays: TrainingDay[],
  scheduleOverrides?: ScheduleOverrides | null,
  planStartDateISO?: string | null,
): TrainingDay | null => {
  if (planStartDateISO && dateISO < planStartDateISO) return null;
  if (scheduleOverrides && Object.prototype.hasOwnProperty.call(scheduleOverrides, dateISO)) {
    const overrideDayId = scheduleOverrides[dateISO];
    if (overrideDayId === null) return null;
    const overridden = planDays.find((day) => day.id === overrideDayId);
    if (overridden) return overridden;
  }
  return getTrainingDayForDate(planDays, parseLocalDate(dateISO));
};

export const getScheduledTrainingForDate = (
  planDays: TrainingDay[],
  date: Date,
  overrides?: ScheduleOverrides,
  // WP-PLANS-2 (X27): start planu — daty przed nim nie mają dnia planowego.
  startDateISO?: string | null,
): ScheduledTrainingDay | null => {
  const localDate = startOfLocalDay(date);
  if (startDateISO && formatLocalDate(localDate) < startDateISO) return null;
  const day = overrides
    ? resolvePlannedDay(formatLocalDate(localDate), planDays, overrides, startDateISO)
    : getTrainingDayForDate(planDays, date);
  if (!day) return null;

  return {
    day,
    date: localDate,
    dateKey: formatLocalDate(localDate),
  };
};

export const getScheduledTrainingWeek = (
  planDays: TrainingDay[],
  referenceDate: Date,
  overrides?: ScheduleOverrides,
  // WP-B (X28): start planu — dni tygodnia sprzed startu nie istnieją.
  startDateISO?: string | null,
): ScheduledTrainingDay[] => {
  const weekStart = getStartOfPlanWeek(referenceDate);

  // Przełożenia: iteracja po 7 dniach tygodnia przez resolver — override może
  // postawić trening na dacie bez dnia planu (np. sobota). Bez overrides stara
  // ścieżka zostaje bez zmian (niezmiennik zasady #5).
  if (overrides && Object.keys(overrides).length > 0) {
    const week: ScheduledTrainingDay[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = startOfLocalDay(weekStart);
      date.setDate(weekStart.getDate() + offset);
      const scheduled = getScheduledTrainingForDate(planDays, date, overrides, startDateISO);
      if (scheduled) week.push(scheduled);
    }
    return week;
  }

  return [...planDays]
    .sort((left, right) => WEEKDAY_TO_OFFSET_FROM_MONDAY[left.weekday] - WEEKDAY_TO_OFFSET_FROM_MONDAY[right.weekday])
    .map((day) => {
      const date = getScheduledDateForDay(weekStart, day.weekday);
      return {
        day,
        date,
        dateKey: formatLocalDate(date),
      };
    })
    .filter((entry) => !startDateISO || entry.dateKey >= startDateISO);
};

export const getNextScheduledTraining = (
  planDays: TrainingDay[],
  fromDate: Date,
  options: { includeSameDay?: boolean; searchDays?: number; overrides?: ScheduleOverrides; startDateISO?: string | null } = {}
): ScheduledTrainingDay | null => {
  const { includeSameDay = false, searchDays = 14, overrides, startDateISO } = options;
  const start = startOfLocalDay(fromDate);

  for (let offset = includeSameDay ? 0 : 1; offset <= searchDays; offset += 1) {
    const date = startOfLocalDay(start);
    date.setDate(start.getDate() + offset);
    const scheduled = getScheduledTrainingForDate(planDays, date, overrides, startDateISO);
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

// E-T4: kafel "Pozostało" liczy TRENINGI, nie tygodnie — zaplanowane dni od
// dziś (włącznie, jeśli nieukończony) do końca planu; skip i urlop odpadają.
export const countRemainingWorkouts = (params: {
  planDays: TrainingDay[];
  today: Date;
  planStartDate: Date;
  durationWeeks: number;
  completedDates: ReadonlySet<string>;
  skippedDates?: readonly string[];
  isDateBlocked?: (dateKey: string) => boolean;
  overrides?: ScheduleOverrides;
}): number => {
  if (params.planDays.length === 0 || params.durationWeeks <= 0) return 0;
  const planStart = startOfLocalDay(params.planStartDate);
  const weekStart = getStartOfPlanWeek(params.planStartDate);
  const end = startOfLocalDay(weekStart);
  end.setDate(end.getDate() + params.durationWeeks * 7 - 1);
  const from = startOfLocalDay(params.today);
  if (from > end) return 0;
  const cursor = from < planStart ? planStart : from;
  const skipped = new Set(params.skippedDates ?? []);
  // WP-B (X28): start jawnie w resolverze (spójność z resztą biblioteki);
  // kursor i tak zaczyna od startu planu, to domknięcie przed override'ami.
  const startISO = formatLocalDate(planStart);
  let total = 0;
  for (const day = new Date(cursor); day <= end; day.setDate(day.getDate() + 1)) {
    const scheduled = getScheduledTrainingForDate(params.planDays, day, params.overrides, startISO);
    if (!scheduled) continue;
    if (params.completedDates.has(scheduled.dateKey)) continue;
    if (skipped.has(scheduled.dateKey)) continue;
    if (params.isDateBlocked?.(scheduled.dateKey)) continue;
    total += 1;
  }
  return total;
};

// T9 (feedback 2026-08-20): kolejność timeline "od najbliższego" w tygodniu
// zawierającym dziś — dziś pierwszy, potem przyszłe rosnąco, minione dni na
// dole (też rosnąco). Klucze = daty ISO (porównanie stringów = chronologia).
export const orderTimelineDayKeys = (dayKeys: string[], todayISO: string): string[] => {
  const upcoming = dayKeys.filter((key) => key >= todayISO).sort();
  const past = dayKeys.filter((key) => key < todayISO).sort();
  return [...upcoming, ...past];
};

// T17 (feedback 2026-08-20): procent postępu planu z TRENINGÓW, nie z numeru
// tygodnia — "tydzień 12/12" pokazywał 100% mimo czekającego piątku. Konstrukcja
// completed/(completed+remaining) z natury nigdy nie przekracza 100.
export const computePlanProgressPercent = (params: {
  completedCount: number;
  remainingCount: number;
  planStarted: boolean;
}): number => {
  if (!params.planStarted) return 0;
  const total = params.completedCount + params.remainingCount;
  if (total <= 0) return 0;
  return Math.round((params.completedCount / total) * 100);
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
