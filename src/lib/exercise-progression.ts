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
  isBodyweight?: boolean,
): ExerciseHistoryPoint[] => {
  const dayMap = new Map<string, ExerciseHistoryPoint>();

  workouts
    .filter(w => w.completed)
    .forEach(w => {
      w.exercises.forEach(ex => {
        if (ex.exerciseId !== exerciseId) return;

        const workingSets = isBodyweight
          ? ex.sets.filter(s => s.completed && !s.isWarmup)
          : ex.sets.filter(s => s.completed && !s.isWarmup && s.weight > 0);
        if (workingSets.length === 0) return;

        const maxWeight = Math.max(...workingSets.map(s => s.weight));
        const bestReps = Math.max(...workingSets.map(s => s.reps));
        const estimated1RM = isBodyweight ? 0 : Math.max(...workingSets.map(s => calculate1RM(s.weight, s.reps)));
        const totalVolume = isBodyweight
          ? workingSets.reduce((sum, s) => sum + s.reps, 0)
          : workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

        const existing = dayMap.get(w.date);
        const compareValue = isBodyweight ? bestReps : maxWeight;
        const existingCompare = isBodyweight ? (existing?.bestReps ?? 0) : (existing?.maxWeight ?? 0);
        if (!existing || compareValue > existingCompare) {
          dayMap.set(w.date, { date: w.date, maxWeight, bestReps, estimated1RM, totalVolume });
        }
      });
    });

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const detectPlateau = (
  history: ExerciseHistoryPoint[],
  minSessions: number = 4,
  isBodyweight?: boolean,
): PlateauResult => {
  if (history.length < minSessions) {
    return { isPlateau: false, sessionsSinceProgress: 0, lastProgressDate: null };
  }

  const getValue = (h: ExerciseHistoryPoint) => isBodyweight ? h.bestReps : h.maxWeight;
  const currentMax = getValue(history[history.length - 1]);
  let sessionsSinceProgress = 0;
  let lastProgressDate: string | null = null;

  for (let i = history.length - 2; i >= 0; i--) {
    if (getValue(history[i]) < currentMax) {
      lastProgressDate = history[i + 1].date;
      break;
    }
    sessionsSinceProgress++;
  }

  if (!lastProgressDate && getValue(history[0]) >= currentMax) {
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
  isBodyweight?: boolean,
): ProgressionSummary => {
  if (history.length === 0) {
    return { startWeight: 0, currentWeight: 0, change: 0, changePercent: 0, totalSessions: 0 };
  }

  const startWeight = isBodyweight ? history[0].bestReps : history[0].maxWeight;
  const currentWeight = isBodyweight ? history[history.length - 1].bestReps : history[history.length - 1].maxWeight;
  const change = currentWeight - startWeight;
  const changePercent = startWeight > 0 ? Math.round((change / startWeight) * 100) : 0;

  return { startWeight, currentWeight, change, changePercent, totalSessions: history.length };
};
