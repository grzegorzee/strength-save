import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import type { PlanObjective } from '@/data/planTemplates';

// X33 (WP-6/WP-7): odpowiedzi z kreatora zapisane na cyklu
export interface PlanCycleChoice {
  version: 1;
  chosenAt: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  objective: PlanObjective;
  daysPerWeek: number;
  trainingDays: Weekday[];
  planSource: 'recommended' | 'browsed' | 'custom';
  templateId?: string;
  recommendedTemplateId?: string;
  planName?: string;
  entry: 'onboarding' | 'replan';
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
  choice?: PlanCycleChoice;
}
