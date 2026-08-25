import type { Weekday } from '@/data/trainingPlan';

// WP-O (X30): trwały snapshot odpowiedzi onboardingu na users/{uid}.onboardingAnswers.
// Zapisywany RAZ przy markOnboardingComplete; replan go nie nadpisuje (aktualizuje
// tylko trainingProfile). Czysty moduł — zero importów Firebase.

/** Skąd wziął się plan zatwierdzony w kreatorze. */
export type OnboardingPlanSource = 'recommended' | 'browsed' | 'custom';

/** Profil treningowy na users/{uid}.trainingProfile (onboarding + replan). */
export interface TrainingProfileSnapshot {
  level?: string;
  objective?: string;
  daysPerWeek?: number;
}

export interface OnboardingAnswers {
  version: number;
  completedAt: string;
  /** Imię z kroku Welcome (pole nie powstaje, gdy user je pominął). */
  name?: string;
  accentColor: string;
  level: string;
  objective: string;
  daysPerWeek: number;
  /** Dni tygodnia wybrane w kroku 4 (jawna odpowiedź, nie pochodna planu). */
  trainingDays: Weekday[];
  planSource: OnboardingPlanSource;
  /** Id zatwierdzonego szablonu (brak = plan własny z PlanBuildera). */
  templateId?: string;
  /** Co rekomendował silnik w chwili zatwierdzenia (do oceny trafności). */
  recommendedTemplateId?: string;
  durationWeeks: number;
  /** Rzeczywisty start cyklu (poniedziałek po snapie), nie surowa data z kroku 5. */
  startDate: string;
  planName?: string;
}

export const ONBOARDING_ANSWERS_VERSION = 2;

export interface OnboardingAnswersInput {
  level: string;
  objective: string;
  daysPerWeek: number;
  durationWeeks: number;
  name?: string;
  trainingDays?: Weekday[];
  planSource?: OnboardingPlanSource;
  templateId?: string;
  recommendedTemplateId?: string;
  planName?: string;
}

/**
 * Buduje snapshot odpowiedzi z zatwierdzonego wyboru kreatora. Pola opcjonalne
 * bez wartości NIE powstają (Firestore odrzuca undefined w updateDoc).
 * Fallback planSource dla starych szkiców bez pola: templateId = rekomendacja,
 * brak templateId = plan własny.
 */
export const buildOnboardingAnswers = (
  choice: OnboardingAnswersInput,
  opts: { accentColor: string; startDate: string; now?: Date },
): OnboardingAnswers => ({
  version: ONBOARDING_ANSWERS_VERSION,
  completedAt: (opts.now ?? new Date()).toISOString(),
  ...(choice.name ? { name: choice.name } : {}),
  accentColor: opts.accentColor,
  level: choice.level,
  objective: choice.objective,
  daysPerWeek: choice.daysPerWeek,
  trainingDays: choice.trainingDays ?? [],
  planSource: choice.planSource ?? (choice.templateId ? 'recommended' : 'custom'),
  ...(choice.templateId ? { templateId: choice.templateId } : {}),
  ...(choice.recommendedTemplateId ? { recommendedTemplateId: choice.recommendedTemplateId } : {}),
  durationWeeks: choice.durationWeeks,
  startDate: opts.startDate,
  ...(choice.planName ? { planName: choice.planName } : {}),
});
