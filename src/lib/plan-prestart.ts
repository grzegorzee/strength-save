// WP-F (X35a): stan "plan jeszcze nie wystartował" wyciągnięty z Dashboardu
// (T3 / X28 WP-B) do czystego modułu, żeby Plan pokazywał TĘ SAMĄ kartę.
// Zero Reacta: wejście = plan + data startu + dziś + przełożenia.

import type { TrainingDay } from '@/data/trainingPlan';
import { getNextScheduledTraining, type ScheduledTrainingDay, type ScheduleOverrides } from '@/lib/plan-schedule';
import { parseLocalDate } from '@/lib/utils';

export interface PreStartInfo {
  startDateISO: string;
  /** Pierwszy trening liczony OD daty startu (nie od dziś); null = plan bez dni. */
  firstEntry: ScheduledTrainingDay | null;
}

export interface PreStartInput {
  planDays: TrainingDay[];
  planStartDate: string | null;
  /** "Dziś" wywołującego (Dashboard: useToday = początek dnia). */
  today: Date;
  scheduleOverrides?: ScheduleOverrides;
}

/** null = brak daty startu albo plan już wystartował (dziś >= start). */
export const buildPreStartInfo = ({ planDays, planStartDate, today, scheduleOverrides }: PreStartInput): PreStartInfo | null => {
  if (!planStartDate) return null;
  if (!(today < parseLocalDate(planStartDate))) return null;
  const dayBeforeStart = parseLocalDate(planStartDate);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  const firstEntry = getNextScheduledTraining(planDays, dayBeforeStart, {
    overrides: scheduleOverrides,
    startDateISO: planStartDate,
  });
  return { startDateISO: planStartDate, firstEntry };
};
