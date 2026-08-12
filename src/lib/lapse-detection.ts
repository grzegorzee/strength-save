import type { TrainingDay } from '@/data/trainingPlan';
import {
  getScheduledTrainingForDate,
  getStartOfPlanWeek,
  type ScheduleOverrides,
} from '@/lib/plan-schedule';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { isDateInReducedMode, type ReducedMode } from '@/lib/reduced-mode';
import { isDateInVacation, type VacationMode } from '@/lib/vacation-mode';

// Tray zaległości (Runna pakiet 1, spec C2): to apka wychodzi do usera, który
// wypadł z rytmu — czysty restart w 1 tap zamiast ściany zaległości. Trigger:
// nieukończona i nieodpuszczona sesja starsza niż 2 dni ALBO pusty miniony
// tydzień planu. Świeże zaległości (1-2 dni) obsługuje baner przełożenia.

/** "Starsza niż 2 dni" = od 3 dni wstecz. */
export const LAPSE_MIN_AGE_DAYS = 3;
export const LAPSE_LOOKBACK_DAYS = 14;
/** Od tylu dni zaległości tray proponuje "Kontynuuj od dziś". */
export const LAPSE_WEEK_PLUS_DAYS = 7;

export interface Lapse {
  kind: 'stale-session' | 'empty-week';
  /** Data zaległej sesji albo poniedziałek pustego tygodnia. */
  dateISO: string;
  /** Klucz pamięci odrzucenia (empty-week ma własny prefiks — nie koliduje z datami sesji). */
  dismissKey: string;
  day: TrainingDay | null;
  weekPlus: boolean;
}

export interface LapseParams {
  planDays: TrainingDay[];
  overrides: ScheduleOverrides;
  workouts: Array<{ date: string; completed: boolean }>;
  todayISO: string;
  skippedDates?: string[];
  planStartDate?: string | null;
  dismissed?: string[];
  /** Spec C3: daty w oknie trybu "nie na 100%" nie są zaległością. */
  reducedMode?: ReducedMode | null;
  /** Spec C4: daty w oknie urlopu nie są zaległością. */
  vacation?: VacationMode | null;
}

const scheduledDayAt = (
  planDays: TrainingDay[],
  overrides: ScheduleOverrides,
  date: Date,
): TrainingDay | null => getScheduledTrainingForDate(planDays, date, overrides)?.day ?? null;

export const detectLapse = (params: LapseParams): Lapse | null => {
  const { planDays, overrides, workouts, todayISO, skippedDates = [], planStartDate, dismissed = [], reducedMode, vacation } = params;
  const completed = new Set(workouts.filter((w) => w.completed).map((w) => w.date));
  const today = parseLocalDate(todayISO);

  for (let back = LAPSE_MIN_AGE_DAYS; back <= LAPSE_LOOKBACK_DAYS; back += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - back);
    const dateISO = formatLocalDate(date);
    if (planStartDate && dateISO < planStartDate) break;
    if (isDateInReducedMode(reducedMode, dateISO) || isDateInVacation(vacation, dateISO)) continue;
    if (completed.has(dateISO) || skippedDates.includes(dateISO) || dismissed.includes(dateISO)) continue;
    const day = scheduledDayAt(planDays, overrides, date);
    if (day) {
      return {
        kind: 'stale-session',
        dateISO,
        dismissKey: dateISO,
        day,
        weekPlus: back >= LAPSE_WEEK_PLUS_DAYS,
      };
    }
  }

  // Pusty miniony tydzień planu: był plan, zero sesji, nie wszystko odpuszczone.
  const weekStart = getStartOfPlanWeek(today);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekStartISO = formatLocalDate(prevWeekStart);
  const dismissKey = `week:${prevWeekStartISO}`;
  if (!dismissed.includes(dismissKey)) {
    let hadScheduled = false;
    let hadCompleted = false;
    let allSkipped = true;
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(prevWeekStart);
      date.setDate(prevWeekStart.getDate() + offset);
      const dateISO = formatLocalDate(date);
      if (planStartDate && dateISO < planStartDate) continue;
      if (isDateInReducedMode(reducedMode, dateISO) || isDateInVacation(vacation, dateISO)) continue;
      if (completed.has(dateISO)) hadCompleted = true;
      if (scheduledDayAt(planDays, overrides, date)) {
        hadScheduled = true;
        if (!skippedDates.includes(dateISO)) allSkipped = false;
      }
    }
    if (hadScheduled && !hadCompleted && !allSkipped) {
      return { kind: 'empty-week', dateISO: prevWeekStartISO, dismissKey, day: null, weekPlus: true };
    }
  }

  return null;
};

/** Daty pod "Kontynuuj od dziś": zaległe zaplanowane sesje z okna traya. */
export const collectLapsedDates = (params: LapseParams): string[] => {
  const { planDays, overrides, workouts, todayISO, skippedDates = [], planStartDate, reducedMode, vacation } = params;
  const completed = new Set(workouts.filter((w) => w.completed).map((w) => w.date));
  const today = parseLocalDate(todayISO);
  const result: string[] = [];
  for (let back = LAPSE_MIN_AGE_DAYS; back <= LAPSE_LOOKBACK_DAYS; back += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - back);
    const dateISO = formatLocalDate(date);
    if (planStartDate && dateISO < planStartDate) continue;
    if (isDateInReducedMode(reducedMode, dateISO) || isDateInVacation(vacation, dateISO)) continue;
    if (completed.has(dateISO) || skippedDates.includes(dateISO)) continue;
    if (scheduledDayAt(planDays, overrides, date)) result.push(dateISO);
  }
  return result.sort();
};
