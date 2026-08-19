import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import {
  getScheduledTrainingForDate,
  getStartOfPlanWeek,
  startOfLocalDay,
  type ScheduleOverrides,
} from '@/lib/plan-schedule';
import { calculateTonnage, hasCompletedWorkingSet } from '@/lib/summary-utils';
import { formatLocalDate } from '@/lib/utils';

// Karta tygodnia (Runna pakiet 1, spec B1): dzień i tydzień jako domykane
// jednostki nad istniejącym odhaczaniem serii. Checkmarki dni, pasek "N z M
// sesji", tonaż tygodnia. Dzień przełożony przez scheduleOverrides pokazuje
// się w NOWEJ dacie (resolver kanoniczny). Stan 'skipped' strukturalnie
// gotowy — podłącza go krok 12 (jawne "Pomiń trening").

export type WeekCardDayStatus = 'done' | 'planned' | 'rest' | 'skipped';

export interface WeekCardDay {
  date: string;
  status: WeekCardDayStatus;
  isToday: boolean;
}

export interface WeekCardModel {
  /** null = plan bez startu / bez cyklu — karta się nie renderuje (bez regresu). */
  week: { current: number; total: number } | null;
  days: WeekCardDay[];
  sessionsDone: number;
  sessionsPlanned: number;
  tonnageKg: number;
}

export const buildWeekCardModel = (args: {
  planDays: TrainingDay[];
  today: Date;
  scheduleOverrides?: ScheduleOverrides;
  workouts: WorkoutSession[];
  currentWeek: number;
  planDurationWeeks: number;
  planStarted: boolean;
  skippedDates?: string[];
}): WeekCardModel => {
  const {
    planDays, today, scheduleOverrides, workouts,
    currentWeek, planDurationWeeks, planStarted, skippedDates = [],
  } = args;

  const weekStart = getStartOfPlanWeek(today);
  const todayKey = formatLocalDate(startOfLocalDay(today));
  const skipped = new Set(skippedDates);

  const completedByDate = new Map<string, WorkoutSession[]>();
  for (const w of workouts) {
    // B-T1: warmup-only nie odhacza sesji ani dnia tygodnia.
    if (!w.completed || !hasCompletedWorkingSet(w)) continue;
    const list = completedByDate.get(w.date) ?? [];
    list.push(w);
    completedByDate.set(w.date, list);
  }

  const days: WeekCardDay[] = [];
  let sessionsDone = 0;
  let sessionsPlanned = 0;
  let tonnageKg = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const date = startOfLocalDay(weekStart);
    date.setDate(weekStart.getDate() + offset);
    const dateKey = formatLocalDate(date);

    const scheduled = getScheduledTrainingForDate(planDays, date, scheduleOverrides) !== null;
    const completedHere = completedByDate.get(dateKey) ?? [];
    if (completedHere.length > 0) tonnageKg += calculateTonnage(completedHere);

    if (scheduled) sessionsPlanned += 1;
    if (scheduled && completedHere.length > 0) sessionsDone += 1;

    const status: WeekCardDayStatus = completedHere.length > 0
      ? 'done'
      : scheduled
        ? (skipped.has(dateKey) ? 'skipped' : 'planned')
        : 'rest';

    days.push({ date: dateKey, status, isToday: dateKey === todayKey });
  }

  return {
    week: planStarted && planDurationWeeks > 0
      ? { current: Math.max(1, currentWeek), total: planDurationWeeks }
      : null,
    days,
    sessionsDone,
    sessionsPlanned,
    tonnageKg,
  };
};
