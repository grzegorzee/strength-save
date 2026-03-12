import type { WorkoutSession } from '@/types';
import { calculate1RM } from '@/lib/pr-utils';

export interface ExerciseHistoryPoint {
  date: string;
  maxWeight: number;
  bestReps: number;
  estimated1RM: number;
  totalVolume: number;
}

export interface PlateauResult {
  isPlateau: boolean;
  sessionsSinceProgress: number;
  lastProgressDate: string | null;
}

export interface ProgressionSummary {
  startWeight: number;
  currentWeight: number;
  change: number;
  changePercent: number;
  totalSessions: number;
}

export const getExerciseHistory = (
  workouts: WorkoutSession[],
  exerciseId: string,
): ExerciseHistoryPoint[] => {
  const dayMap = new Map<string, ExerciseHistoryPoint>();

  workouts
    .filter(w => w.completed)
    .forEach(w => {
      w.exercises.forEach(ex => {
        if (ex.exerciseId !== exerciseId) return;

        const workingSets = ex.sets.filter(s => s.completed && !s.isWarmup && s.weight > 0);
        if (workingSets.length === 0) return;

        const maxWeight = Math.max(...workingSets.map(s => s.weight));
        const bestReps = Math.max(...workingSets.map(s => s.reps));
        const estimated1RM = Math.max(...workingSets.map(s => calculate1RM(s.weight, s.reps)));
        const totalVolume = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

        const existing = dayMap.get(w.date);
        if (!existing || maxWeight > existing.maxWeight) {
          dayMap.set(w.date, { date: w.date, maxWeight, bestReps, estimated1RM, totalVolume });
        }
      });
    });

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const detectPlateau = (
  history: ExerciseHistoryPoint[],
  minSessions: number = 4,
): PlateauResult => {
  if (history.length < minSessions) {
    return { isPlateau: false, sessionsSinceProgress: 0, lastProgressDate: null };
  }

  const currentMax = history[history.length - 1].maxWeight;
  let sessionsSinceProgress = 0;
  let lastProgressDate: string | null = null;

  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i].maxWeight < currentMax) {
      lastProgressDate = history[i + 1].date;
      break;
    }
    sessionsSinceProgress++;
  }

  if (!lastProgressDate && history[0].maxWeight >= currentMax) {
    sessionsSinceProgress = history.length - 1;
  }

  return {
    isPlateau: sessionsSinceProgress >= minSessions - 1,
    sessionsSinceProgress: sessionsSinceProgress + 1,
    lastProgressDate,
  };
};

export const getProgressionSummary = (
  history: ExerciseHistoryPoint[],
): ProgressionSummary => {
  if (history.length === 0) {
    return { startWeight: 0, currentWeight: 0, change: 0, changePercent: 0, totalSessions: 0 };
  }

  const startWeight = history[0].maxWeight;
  const currentWeight = history[history.length - 1].maxWeight;
  const change = currentWeight - startWeight;
  const changePercent = startWeight > 0 ? Math.round((change / startWeight) * 100) : 0;

  return { startWeight, currentWeight, change, changePercent, totalSessions: history.length };
};
