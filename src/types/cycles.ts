import type { TrainingDay } from '@/data/trainingPlan';

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
}
