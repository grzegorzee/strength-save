import type { TrainingDay } from '@/data/trainingPlan';
import { translate, type LanguageCode } from '@/i18n';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { getStartOfPlanWeek } from '@/lib/plan-schedule';
import { assignCycleDayIds, getCycleStartPreview } from '@/lib/plan-cycle-utils';
import { DEFAULT_PROGRESSION, type ProgressionConfig } from '@/lib/progression-engine';

export interface StartCycleDeps {
  uid: string;
  /** Z166: język komunikatów błędów pokazywanych userowi (default PL). */
  lang?: LanguageCode;
  currentPlan: TrainingDay[];
  planStartDate: string | null;
  planDurationWeeks: number;
  /** WP-PLANS-1 (X27): status planu PRZED startem — rollback przywraca go 1:1. */
  planStatus?: 'active' | 'ended';
  workouts: WorkoutSession[];
  startDate?: string;
  /**
   * WP-PLANS-2 (X27): jawny start planu wybrany przez usera — poniedziałek,
   * walidowany (>= poniedziałek bieżącego tygodnia, <= +8 tygodni). Ma
   * pierwszeństwo przed `startDate`; wartość spoza kontraktu = ignorowana
   * (fallback do dotychczasowego snapu, zero pułapek bez wyjścia).
   */
  startDateISO?: string;
  /** WP-PLANS-2 (X27): nazwa planu zapisywana na training_plans (trim, max 60). */
  planName?: string;
  archiveCurrentPlan: (days: TrainingDay[], weeks: number, start: string, workouts: WorkoutSession[]) => Promise<string | null>;
  savePlan: (days: TrainingDay[], options?: { durationWeeks?: number; startDate?: string; syncActiveCycle?: boolean; progression?: ProgressionConfig; status?: 'active' | 'ended'; name?: string }) => Promise<{ success: boolean; error?: string }>;
  createActiveCycle: (days: TrainingDay[], weeks: number, start: string) => Promise<string | null>;
  backfillHistoricalWorkouts: (cycles: PlanCycle[]) => Promise<unknown>;
  /** B-T6: producent zdarzenia inboxa (wstrzykiwany — moduł nie dotyka Firebase). */
  emitPlanEvent?: PlanEventEmitter;
}

export type PlanEventEmitter = (
  action: 'started' | 'changed' | 'ended',
  info: { days: number; weeks: number; startDate: string },
) => void;

export interface CompleteOnboardingChoice {
  days: TrainingDay[];
  durationWeeks: number;
  startDate: string;
  level: string;
  objective: string;
  daysPerWeek: number;
  /** WP-PLANS-2 (X27): nazwa planu z kroku 5 onboardingu (trim, max 60). */
  planName?: string;
}

export interface CompleteOnboardingDeps {
  lang?: LanguageCode;
  savePlan: (days: TrainingDay[], options?: { durationWeeks?: number; startDate?: string; syncActiveCycle?: boolean; progression?: ProgressionConfig; name?: string }) => Promise<{ success: boolean; error?: string }>;
  createActiveCycle: (days: TrainingDay[], weeks: number, start: string) => Promise<string | null>;
  markOnboardingComplete: (choice: CompleteOnboardingChoice, days: TrainingDay[], startDate: string) => Promise<void>;
  /** B-T6: producent zdarzenia inboxa (wstrzykiwany — moduł nie dotyka Firebase). */
  emitPlanEvent?: PlanEventEmitter;
}

// Z86: źródłem dni dla "Powtórz plan"/przedłużenia jest ZAWSZE bieżący plan
// (training_plans, chroniony rewizją). Snapshot cyklu bywa stale (iOS po wybudzeniu
// z tła, stara karta PWA) i potrafił wskrzesić plan z poprzedniego cyklu.
export interface RepeatPlanSource {
  days: TrainingDay[];
  durationWeeks: number;
}

export const repeatPlanSource = (
  currentPlan: TrainingDay[],
  planDurationWeeks: number,
  activeCycle: Pick<PlanCycle, 'days' | 'durationWeeks'> | null,
): RepeatPlanSource => {
  if (currentPlan.length > 0) {
    return { days: currentPlan, durationWeeks: planDurationWeeks };
  }
  if (activeCycle?.days?.length) {
    return { days: activeCycle.days, durationWeeks: activeCycle.durationWeeks };
  }
  return { days: [], durationWeeks: planDurationWeeks };
};

/**
 * Rozpoczyna nowy cykl z podanym planem: archiwizuje bieżący aktywny cykl (status completed
 * + dotagowanie historii), zapisuje plan i tworzy świeży aktywny cykl od najbliższego
 * poniedziałku. Wspólna logika dla: "Powtórz plan", "Zmień plan" i auto-przedłużenia.
 *
 * Wagi są kontynuowane automatycznie — pre-fill ćwiczeń bierze ostatnie treningi z historii,
 * która zostaje nienaruszona (te same exerciseId).
 */
/**
 * WP-PLANS-2 (X27): czy iso to poniedziałek w oknie [bieżący tydzień, +8 tygodni].
 * Reuse getStartOfPlanWeek — poniedziałek to data równa startowi własnego tygodnia.
 */
export const isValidPlanStartMonday = (iso: string | undefined, now = new Date()): iso is string => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  if (formatLocalDate(getStartOfPlanWeek(parseLocalDate(iso))) !== iso) return false;
  const currentMonday = getStartOfPlanWeek(now);
  const maxMonday = new Date(currentMonday);
  maxMonday.setDate(maxMonday.getDate() + 8 * 7);
  return iso >= formatLocalDate(currentMonday) && iso <= formatLocalDate(maxMonday);
};

/** Nazwa planu do zapisu: trim + max 60; pusta = undefined (pole nie powstaje). */
const sanitizePlanNameInput = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.trim().slice(0, 60);
  return trimmed ? trimmed : undefined;
};

export async function startCycleWithPlan(
  days: TrainingDay[],
  durationWeeks: number,
  deps: StartCycleDeps,
): Promise<{ success: boolean; error?: string }> {
  // WP-PLANS-2: jawny poniedziałek startu (walidowany) ma pierwszeństwo; wartość
  // spoza kontraktu spada do dotychczasowego snapu (bug usera: wybrana data
  // startu MUSI być respektowana, nie przyciągana do bieżącego tygodnia).
  const newStart = isValidPlanStartMonday(deps.startDateISO)
    ? deps.startDateISO
    : deps.startDate
      ? getCycleStartPreview(deps.startDate).cycleStartDate
      : formatLocalDate(getStartOfPlanWeek(new Date()));
  const planName = sanitizePlanNameInput(deps.planName);

  const uniqueDays = assignCycleDayIds(days, newStart);
  // WP-PLANS-1 (X27): start nowego planu reaktywuje dokument po 'ended'.
  const result = await deps.savePlan(uniqueDays, {
    durationWeeks,
    startDate: newStart,
    syncActiveCycle: false,
    status: 'active',
    ...(planName !== undefined ? { name: planName } : {}),
  });
  if (!result.success) return result;

  const activeCycleId = await deps.createActiveCycle(uniqueDays, durationWeeks, newStart);
  if (!activeCycleId) {
    if (deps.planStartDate && deps.currentPlan.length > 0) {
      await deps.savePlan(deps.currentPlan, {
        durationWeeks: deps.planDurationWeeks,
        startDate: deps.planStartDate,
        syncActiveCycle: false,
        // Rollback przywraca też status sprzed startu (bez tego plan 'ended'
        // zostałby zombie-aktywowany przez pierwszy zapis powyżej).
        ...(deps.planStatus !== undefined ? { status: deps.planStatus } : {}),
      });
    }
    return { success: false, error: translate(deps.lang ?? 'pl', 'cycles.errActiveNotCreated') };
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

  // B-T6: zdarzenie inboxa o zmianie/starcie planu; klucz po startDate cyklu
  // jest idempotentny przy ponowieniu tej samej operacji.
  deps.emitPlanEvent?.(
    deps.planStartDate && deps.currentPlan.length > 0 ? 'changed' : 'started',
    { days: uniqueDays.length, weeks: durationWeeks, startDate: newStart },
  );

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
    if (!activeCycleId) return { success: false, error: translate(deps.lang ?? 'pl', 'cycles.errActiveNotCreated') };

    const planName = choice.planName?.trim().slice(0, 60);
    const result = await deps.savePlan(days, {
      durationWeeks: choice.durationWeeks,
      startDate: planStartDate,
      // Update the just-created active-cycle snapshot in the same plan write.
      syncActiveCycle: true,
      // Z119: nowe plany z kreatora startują z włączoną progresją programową.
      progression: DEFAULT_PROGRESSION,
      // WP-PLANS-2 (X27): nazwa planu z kroku 5 (pusta = pole nie powstaje).
      ...(planName ? { name: planName } : {}),
    });
    if (!result.success) return result;

    await deps.markOnboardingComplete(choice, days, planStartDate);
    deps.emitPlanEvent?.('started', {
      days: days.length,
      weeks: choice.durationWeeks,
      startDate: planStartDate,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : translate(deps.lang ?? 'pl', 'ob.errCompleteFailed') };
  }
}

// ── WP-PLANS-1 (X27): zakończenie planu bez wybierania nowego ──

export interface EndPlanDeps {
  uid: string;
  /** Język komunikatów błędów (default PL). */
  lang?: LanguageCode;
  currentPlan: TrainingDay[];
  planStartDate: string | null;
  planDurationWeeks: number;
  workouts: WorkoutSession[];
  archiveCurrentPlan: (days: TrainingDay[], weeks: number, start: string, workouts: WorkoutSession[]) => Promise<string | null>;
  backfillHistoricalWorkouts: (cycles: PlanCycle[]) => Promise<unknown>;
  /** Punktowy zapis statusu na training_plans/{uid} (wstrzykiwany — moduł nie dotyka Firebase). */
  setPlanStatus: (status: 'active' | 'ended') => Promise<{ success: boolean }>;
  emitPlanEvent?: PlanEventEmitter;
}

/**
 * Kończy plan w trakcie lub po terminie: archiwizuje aktywny cykl (completed),
 * dotagowuje historię i DOPIERO potem ustawia status 'ended' na dokumencie planu
 * (kolejność chroni historię — pułapka z planu X27). NIE tworzy nowego cyklu;
 * przy `chooseNew` nawigację do /new-plan wykonuje caller.
 */
export async function endPlan(
  _opts: { chooseNew: boolean },
  deps: EndPlanDeps,
): Promise<{ success: boolean; archivedCycleId?: string; error?: string }> {
  if (!deps.planStartDate || deps.currentPlan.length === 0) {
    return { success: false, error: translate(deps.lang ?? 'pl', 'cycles.endPlanFailed') };
  }

  const archivedId = await deps.archiveCurrentPlan(
    deps.currentPlan, deps.planDurationWeeks, deps.planStartDate, deps.workouts,
  );
  if (!archivedId) {
    return { success: false, error: translate(deps.lang ?? 'pl', 'cycles.endPlanFailed') };
  }

  const archived: PlanCycle = {
    id: archivedId, userId: deps.uid, days: deps.currentPlan, durationWeeks: deps.planDurationWeeks,
    startDate: deps.planStartDate, endDate: formatLocalDate(new Date()), status: 'completed',
    createdAt: new Date().toISOString(),
    stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  };
  await deps.backfillHistoricalWorkouts([archived]);

  const statusResult = await deps.setPlanStatus('ended');
  if (!statusResult.success) {
    return { success: false, error: translate(deps.lang ?? 'pl', 'cycles.endPlanFailed') };
  }

  deps.emitPlanEvent?.('ended', {
    days: deps.currentPlan.length, weeks: deps.planDurationWeeks, startDate: deps.planStartDate,
  });

  return { success: true, archivedCycleId: archivedId };
}

/**
 * WP-PLANS-1 (X27, Task P4): warunki auto-końca planu. Czysta funkcja — efekt
 * (endPlan bez nawigacji) wykonuje Dashboard przez runCycleAutoRepair z flagą
 * sesyjną. Idempotentne: po sukcesie planStatus='ended' i warunek pada.
 */
export const shouldAutoEndPlan = (opts: {
  planLoaded: boolean;
  cyclesLoaded: boolean;
  planStatus: 'active' | 'ended' | 'none';
  isPlanExpired: boolean;
  hasActiveCycle: boolean;
  /** Aktywna sesja treningowa (draft continuable) — poczekaj do następnego wejścia. */
  hasBlockingDraft: boolean;
}): boolean =>
  opts.planLoaded
  && opts.cyclesLoaded
  && opts.planStatus === 'active'
  && opts.isPlanExpired
  && opts.hasActiveCycle
  && !opts.hasBlockingDraft;

// Auto-repair cyklu (R2-27): guard trwały ustawiany PRZED create (chroni okno async
// przed remountem), ale czyszczony przy porażce (offline) — naprawa ponowi się,
// zamiast zostać wypalona na zawsze.
export const runCycleAutoRepair = async (opts: {
  guard: { get: () => boolean; set: () => void; clear: () => void };
  create: () => Promise<string | null>;
}): Promise<void> => {
  if (opts.guard.get()) return;
  opts.guard.set();
  const cycleId = await opts.create();
  if (cycleId == null) opts.guard.clear();
};
