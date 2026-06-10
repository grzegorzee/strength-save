import type { WorkoutSession } from '@/types';
import { calculate1RM, getExerciseBest1RM } from './pr-utils';

// Daty treningów to 'YYYY-MM-DD', więc porównanie leksykograficzne stringów == porównanie chronologiczne.

export interface OneRMProgress {
  best1RM: number;
  bestDate: string;
  /** Najlepszy 1RM ustanowiony PRZED dniem rekordu (0 gdy rekord to pierwszy wynik). */
  prevBest1RM: number;
  /** best1RM - prevBest1RM, zaokrąglone; 0 gdy brak wcześniejszego wyniku. */
  delta: number;
}

/** Postęp życiowego rekordu 1RM: aktualny rekord + przyrost względem poprzedniego najlepszego. */
export const getExercise1RMProgress = (
  workouts: WorkoutSession[],
  exerciseId: string,
): OneRMProgress => {
  const best = getExerciseBest1RM(workouts, exerciseId);
  if (best.best1RM <= 0) {
    return { best1RM: 0, bestDate: '', prevBest1RM: 0, delta: 0 };
  }

  let prevBest1RM = 0;
  workouts.forEach(w => {
    if (w.date >= best.bestDate) return; // tylko treningi ściśle wcześniejsze
    w.exercises.forEach(ex => {
      if (ex.exerciseId !== exerciseId) return;
      ex.sets.forEach(set => {
        if (!set.completed || set.isWarmup || set.weight <= 0) return;
        const est = calculate1RM(set.weight, set.reps);
        if (est > prevBest1RM) prevBest1RM = est;
      });
    });
  });

  const delta = prevBest1RM > 0 ? Math.round((best.best1RM - prevBest1RM) * 10) / 10 : 0;
  return { best1RM: best.best1RM, bestDate: best.bestDate, prevBest1RM, delta };
};

export interface MonthlyTonnage {
  /** 'YYYY-MM' */
  month: string;
  tonnage: number;
}

/**
 * Tonaż (Σ reps×weight ukończonych serii) w rozbiciu na ostatnie `monthsBack` miesięcy,
 * włącznie z miesiącem `refDate`. Zwraca chronologicznie, z zerami dla pustych miesięcy.
 */
export const getMonthlyTonnage = (
  workouts: WorkoutSession[],
  monthsBack: number,
  refDate: Date,
): MonthlyTonnage[] => {
  const buckets = new Map<string, number>();
  const order: string[] = [];
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, 0);
    order.push(key);
  }

  workouts.forEach(w => {
    const key = w.date.slice(0, 7);
    if (!buckets.has(key)) return;
    let tonnage = 0;
    w.exercises.forEach(ex => ex.sets.forEach(set => {
      if (set.completed) tonnage += set.reps * set.weight;
    }));
    buckets.set(key, (buckets.get(key) ?? 0) + tonnage);
  });

  return order.map(key => ({ month: key, tonnage: buckets.get(key) ?? 0 }));
};

export interface Plateau {
  exerciseId: string;
  name: string;
  sessionCount: number;
  best1RM: number;
  bestDate: string;
}

/**
 * Wykrywa zastój: ćwiczenia z min. `minSessions` sesjami, w których życiowy rekord 1RM
 * jest STARSZY niż ostatnie `staleSessions` sesji (brak poprawy w ostatnich treningach).
 * Sortowanie: najczęściej trenowane pierwsze.
 */
export const detectPlateaus = (
  workouts: WorkoutSession[],
  exerciseNames: Map<string, string>,
  opts?: { minSessions?: number; staleSessions?: number },
): Plateau[] => {
  const minSessions = opts?.minSessions ?? 4;
  const staleSessions = opts?.staleSessions ?? 3;

  // exId -> (date -> najlepszy 1RM tego dnia)
  const byExercise = new Map<string, Map<string, number>>();
  workouts.forEach(w => {
    w.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (!set.completed || set.isWarmup || set.weight <= 0) return;
        const est = calculate1RM(set.weight, set.reps);
        let dateMap = byExercise.get(ex.exerciseId);
        if (!dateMap) { dateMap = new Map(); byExercise.set(ex.exerciseId, dateMap); }
        if (est > (dateMap.get(w.date) ?? 0)) dateMap.set(w.date, est);
      });
    });
  });

  const plateaus: Plateau[] = [];
  byExercise.forEach((dateMap, exId) => {
    const sessions = Array.from(dateMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    if (sessions.length < minSessions) return;

    const overallBest = Math.max(...sessions.map(s => s[1]));
    const bestSession = sessions.find(s => s[1] === overallBest)!;
    const recentMax = Math.max(...sessions.slice(-staleSessions).map(s => s[1]));

    if (recentMax < overallBest) {
      plateaus.push({
        exerciseId: exId,
        name: exerciseNames.get(exId) ?? exId,
        sessionCount: sessions.length,
        best1RM: overallBest,
        bestDate: bestSession[0],
      });
    }
  });

  return plateaus.sort((a, b) => b.sessionCount - a.sessionCount);
};

export type MilestoneCategory = 'workouts' | 'tonnage' | 'records';

export interface Milestone {
  id: string;
  category: MilestoneCategory;
  threshold: number;
  achieved: boolean;
  /** Aktualna wartość statystyki (pasek postępu do progu na zablokowanej odznace). */
  current: number;
  /** Postęp 0-100 względem progu. */
  progress: number;
}

const MILESTONE_THRESHOLDS: Record<MilestoneCategory, number[]> = {
  workouts: [1, 10, 25, 50, 100],
  tonnage: [1000, 10000, 50000, 100000, 250000],
  records: [1, 5, 10, 20],
};

/** Lista odznak (achieved/locked) na podstawie podstawowych statystyk. */
export const computeMilestones = (stats: {
  completedWorkouts: number;
  totalTonnage: number;
  exercisesWithRecord: number;
}): Milestone[] => {
  const valueFor: Record<MilestoneCategory, number> = {
    workouts: stats.completedWorkouts,
    tonnage: stats.totalTonnage,
    records: stats.exercisesWithRecord,
  };

  return (Object.keys(MILESTONE_THRESHOLDS) as MilestoneCategory[]).flatMap(category =>
    MILESTONE_THRESHOLDS[category].map(threshold => ({
      id: `${category}-${threshold}`,
      category,
      threshold,
      achieved: valueFor[category] >= threshold,
      current: valueFor[category],
      progress: Math.min(100, Math.round((valueFor[category] / threshold) * 100)),
    })),
  );
};
