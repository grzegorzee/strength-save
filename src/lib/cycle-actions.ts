import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';
import { formatLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';

export interface StartCycleDeps {
  uid: string;
  currentPlan: TrainingDay[];
  planStartDate: string | null;
  planDurationWeeks: number;
  workouts: WorkoutSession[];
  archiveCurrentPlan: (days: TrainingDay[], weeks: number, start: string, workouts: WorkoutSession[]) => Promise<string | null>;
  savePlan: (days: TrainingDay[], options?: { durationWeeks?: number; startDate?: string }) => Promise<{ success: boolean; error?: string }>;
  createActiveCycle: (days: TrainingDay[], weeks: number, start: string) => Promise<string | null>;
  backfillHistoricalWorkouts: (cycles: PlanCycle[]) => Promise<unknown>;
}

/**
 * Rozpoczyna nowy cykl z podanym planem: archiwizuje bieżący aktywny cykl (status completed
 * + dotagowanie historii), zapisuje plan i tworzy świeży aktywny cykl od najbliższego
 * poniedziałku. Wspólna logika dla: "Powtórz plan", "Zmień plan" i auto-przedłużenia.
 *
 * Wagi są kontynuowane automatycznie — pre-fill ćwiczeń bierze ostatnie treningi z historii,
 * która zostaje nienaruszona (te same exerciseId).
 */
export async function startCycleWithPlan(
  days: TrainingDay[],
  durationWeeks: number,
  deps: StartCycleDeps,
): Promise<{ success: boolean; error?: string }> {
  const newStart = formatLocalDate(getStartOfPlanWeek(new Date()));

  // Archiwizuj obecny plan jako zakończony cykl + dotaguj historię.
  if (deps.planStartDate && deps.currentPlan.length > 0) {
    const archivedId = await deps.archiveCurrentPlan(
      deps.currentPlan, deps.planDurationWeeks, deps.planStartDate, deps.workouts,
    );
    if (archivedId) {
      const archived: PlanCycle = {
        id: archivedId, userId: deps.uid, days: deps.currentPlan, durationWeeks: deps.planDurationWeeks,
        startDate: deps.planStartDate, endDate: formatLocalDate(new Date()), status: 'completed',
        createdAt: new Date().toISOString(),
        stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
      };
      await deps.backfillHistoricalWorkouts([archived]);
    }
  }

  const uniqueDays: TrainingDay[] = days.map((d, i) => ({ ...d, id: `${newStart}-d${i + 1}` }));
  const result = await deps.savePlan(uniqueDays, { durationWeeks, startDate: newStart });
  if (!result.success) return result;
  await deps.createActiveCycle(uniqueDays, durationWeeks, newStart);
  return { success: true };
}
