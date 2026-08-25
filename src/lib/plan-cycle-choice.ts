import type { Weekday } from '@/data/trainingPlan';
import type { PlanObjective } from '@/data/planTemplates';
import type {
  PlanCycleChoice,
  PlanCycleChoiceEntry,
  PlanCycleChoiceLevel,
  PlanCycleChoiceSource,
} from '@/types/cycles';

// WP-6 (X33): odpowiedzi z kreatora -> plan_cycles.choice. Kazde przejscie przez
// kroki 2-5 tworzy NOWY cykl z wlasnym `choice` (zero nadpisywania);
// users.onboardingAnswers (X30) zostaje snapshotem PIERWSZEGO onboardingu.
// Czysty modul — zero importow Firebase.

export const PLAN_CYCLE_CHOICE_VERSION = 1;

/** Podzbior PlanWizardChoice potrzebny do zapisu (PlanWizardChoice jest przypisywalny). */
export interface PlanCycleChoiceInput {
  level: PlanCycleChoiceLevel;
  objective: PlanObjective;
  daysPerWeek: number;
  trainingDays?: readonly Weekday[];
  planSource?: PlanCycleChoiceSource;
  templateId?: string;
  recommendedTemplateId?: string;
  planName?: string;
}

/**
 * Buduje `choice` cyklu z zatwierdzonego wyboru kreatora. Pola opcjonalne bez
 * wartosci NIE powstaja (Firestore odrzuca undefined). Fallbacki jak w
 * buildOnboardingAnswers: brak planSource = szablon -> recommended, brak
 * szablonu -> custom; brak trainingDays = []. planName trim + max 60 (ten sam
 * limit co training_plans.name i sanitizePlanCycleChoice).
 */
export const buildPlanCycleChoice = (
  choice: PlanCycleChoiceInput,
  entry: PlanCycleChoiceEntry,
  now: Date = new Date(),
): PlanCycleChoice => {
  const planName = choice.planName?.trim().slice(0, 60);
  return {
    version: PLAN_CYCLE_CHOICE_VERSION,
    chosenAt: now.toISOString(),
    level: choice.level,
    objective: choice.objective,
    daysPerWeek: choice.daysPerWeek,
    trainingDays: [...(choice.trainingDays ?? [])],
    planSource: choice.planSource ?? (choice.templateId ? 'recommended' : 'custom'),
    ...(choice.templateId ? { templateId: choice.templateId } : {}),
    ...(choice.recommendedTemplateId ? { recommendedTemplateId: choice.recommendedTemplateId } : {}),
    ...(planName ? { planName } : {}),
    entry,
  };
};
