import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import type { PlanObjective } from '@/data/planTemplates';

export type PlanCycleChoiceLevel = 'beginner' | 'intermediate' | 'advanced';
export type PlanCycleChoiceSource = 'recommended' | 'browsed' | 'custom';
export type PlanCycleChoiceEntry = 'onboarding' | 'replan';

/**
 * WP-6 (X33): odpowiedzi z kreatora zapisane NA CYKLU w chwili jego utworzenia.
 * Każde przejście przez kroki 2-5 = nowy cykl z własnym `choice` (zero
 * nadpisywania). Stare cykle pola nie mają. Pola opcjonalne bez wartości NIE
 * powstają (Firestore odrzuca undefined). Kontrakt 1:1 z firestore.rules
 * (validPlanCycleChoice) i sanitizePlanCycleChoice (firestore-doc-guards).
 */
export interface PlanCycleChoice {
  version: number;
  /** ISO chwili zatwierdzenia w kreatorze. */
  chosenAt: string;
  level: PlanCycleChoiceLevel;
  objective: PlanObjective;
  daysPerWeek: number;
  trainingDays: Weekday[];
  planSource: PlanCycleChoiceSource;
  templateId?: string;
  recommendedTemplateId?: string;
  planName?: string;
  entry: PlanCycleChoiceEntry;
}

export interface PlanCycleStats {
  totalWorkouts: number;
  totalTonnage: number;
  prs: { exerciseName: string; weight: number; estimated1RM: number }[];
  completionRate: number;
  expectedWorkouts?: number;
  missedWorkouts?: number;
  averageWorkoutsPerWeek?: number;
  averageTonnagePerWorkout?: number;
  orphanWorkoutCount?: number;
  duplicateWorkoutsIgnored?: number;
}

export interface PlanCycle {
  id: string;
  userId: string;
  days: TrainingDay[];
  durationWeeks: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed';
  createdAt: string;
  stats: PlanCycleStats;
  technical?: boolean;
  hiddenFromInsights?: boolean;
  /** WP-6 (X33): odpowiedzi z kreatora; brak = cykl sprzed zapisu odpowiedzi. */
  choice?: PlanCycleChoice;
}
