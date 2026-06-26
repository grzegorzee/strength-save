import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';
import { formatLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';
import { assignCycleDayIds, getCycleStartPreview } from '@/lib/plan-cycle-utils';

export interface StartCycleDeps {
  uid: string;
  currentPlan: TrainingDay[];
  planStartDate: string | null;
  planDurationWeeks: number;
  workouts: WorkoutSession[];
  startDate?: string;
  archiveCurrentPlan: (days: TrainingDay[], weeks: number, start: string, workouts: WorkoutSession[]) => Promise<string | null>;
  savePlan: (days: TrainingDay[], options?: { durationWeeks?: number; startDate?: string; syncActiveCycle?: boolean }) => Promise<{ success: boolean; error?: string }>;
  createActiveCycle: (days: TrainingDay[], weeks: number, start: string) => Promise<string | null>;
  backfillHistoricalWorkouts: (cycles: PlanCycle[]) => Promise<unknown>;
}

export interface CompleteOnboardingChoice {
  days: TrainingDay[];
  durationWeeks: number;
  startDate: string;
  level: string;
  objective: string;
  daysPerWeek: number;
}

export interface CompleteOnboardingDeps {
  savePlan: (days: TrainingDay[], options?: { durationWeeks?: number; startDate?: string; syncActiveCycle?: boolean }) => Promise<{ success: boolean; error?: string }>;
  createActiveCycle: (days: TrainingDay[], weeks: number, start: string) => Promise<string | null>;
  markOnboardingComplete: (choice: CompleteOnboardingChoice, days: TrainingDay[], startDate: string) => Promise<void>;
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
  const newStart = deps.startDate
    ? getCycleStartPreview(deps.startDate).cycleStartDate
    : formatLocalDate(getStartOfPlanWeek(new Date()));

  const uniqueDays = assignCycleDayIds(days, newStart);
  const result = await deps.savePlan(uniqueDays, { durationWeeks, startDate: newStart, syncActiveCycle: false });
  if (!result.success) return result;

  const activeCycleId = await deps.createActiveCycle(uniqueDays, durationWeeks, newStart);
  if (!activeCycleId) {
    if (deps.planStartDate && deps.currentPlan.length > 0) {
      await deps.savePlan(deps.currentPlan, {
        durationWeeks: deps.planDurationWeeks,
        startDate: deps.planStartDate,
        syncActiveCycle: false,
      });
    }
    return { success: false, error: 'Active cycle was not created' };
  }

  // Archiwizuj poprzedni plan dopiero po utworzeniu nowego aktywnego cyklu. Jeśli ten krok
  // zostanie ponowiony, archiveCurrentPlan ma zachować idempotencję po startDate.
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

  return { success: true };
}

export async function completeOnboardingPlan(
  choice: CompleteOnboardingChoice,
  deps: CompleteOnboardingDeps,
): Promise<{ success: boolean; error?: string }> {
  try {
    const planStartDate = getCycleStartPreview(choice.startDate).cycleStartDate;
    const days = assignCycleDayIds(choice.days, planStartDate);
    // The deterministic cycle is the workflow anchor. If the plan write loses a
    // response, a retry observes this same cycle instead of creating a duplicate.
    const activeCycleId = await deps.createActiveCycle(days, choice.durationWeeks, planStartDate);
    if (!activeCycleId) return { success: false, error: 'Active cycle was not created' };

    const result = await deps.savePlan(days, {
      durationWeeks: choice.durationWeeks,
      startDate: planStartDate,
      // Update the just-created active-cycle snapshot in the same plan write.
      syncActiveCycle: true,
    });
    if (!result.success) return result;

    await deps.markOnboardingComplete(choice, days, planStartDate);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not complete onboarding' };
  }
}
