import type { WorkoutSession } from '@/types';
import type { StravaActivity } from '@/types/strava';
import type { TrainingDay } from '@/data/trainingPlan';
import { getWeekBounds, calculateTonnage, filterWorkoutsByPeriod } from '@/lib/summary-utils';
import { detectNewPRs } from '@/lib/pr-utils';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

// --- Types ---

export interface WeeklySummaryStats {
  workoutCount: number;
  tonnageKg: number;
  runKm: number;
  totalTimeMinutes: number;
  prs: { exerciseName: string; type: string; newValue: number }[];
}

export interface WeeklySummary {
  id: string;
  userId: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  generatedAt: string; // ISO
  summary: string;
  stats: WeeklySummaryStats;
}

// --- Prepare weekly data ---

export function prepareWeeklyData(
  weekDate: Date,
  workouts: WorkoutSession[],
  stravaActivities: StravaActivity[],
  trainingPlan: TrainingDay[],
): { stats: WeeklySummaryStats; weekStart: string; weekEnd: string; hasData: boolean } {
  const bounds = getWeekBounds(weekDate);
  const weekStart = formatLocalDate(bounds.start);
  const weekEnd = formatLocalDate(bounds.end);

  // Strength workouts
  const weekWorkouts = filterWorkoutsByPeriod(workouts, bounds);
  const tonnageKg = calculateTonnage(weekWorkouts);

  // PRs
  const allNames = new Map(trainingPlan.flatMap(d => d.exercises.map(e => [e.id, e.name])));
  // Wzbogać o nazwy-snapshoty z samych treningów (ćwiczenia spoza bieżącego planu
  // nie są w trainingPlan i bez tego renderowałyby się jako surowe id, np. "EX-3-1").
  weekWorkouts.forEach(w => w.exercises.forEach(ex => {
    if (ex.name && !allNames.has(ex.exerciseId)) allNames.set(ex.exerciseId, ex.name);
  }));
  const historicalWorkouts = workouts.filter(w => w.completed && parseLocalDate(w.date) < bounds.start);
  const prs: WeeklySummaryStats['prs'] = [];
  weekWorkouts.forEach(w => {
    const detected = detectNewPRs(w, historicalWorkouts, allNames);
    detected.forEach(pr => prs.push({ exerciseName: pr.exerciseName, type: pr.type, newValue: pr.newValue }));
  });

  // Strava activities this week
  const weekStrava = stravaActivities.filter(a => a.date >= weekStart && a.date <= weekEnd);
  const runKm = weekStrava
    .filter(a => a.type === 'Run' || a.sportType?.includes('Run'))
    .reduce((sum, a) => sum + ((a.distance || 0) / 1000), 0);
  const totalTimeMinutes = weekStrava.reduce((sum, a) => sum + ((a.movingTime || 0) / 60), 0)
    + weekWorkouts.length * 60; // estimate ~60min per strength session

  const stats: WeeklySummaryStats = {
    workoutCount: weekWorkouts.length,
    tonnageKg: Math.round(tonnageKg),
    runKm: Math.round(runKm * 10) / 10,
    totalTimeMinutes: Math.round(totalTimeMinutes),
    prs,
  };

  const hasData = weekWorkouts.length > 0 || weekStrava.length > 0;

  return { stats, weekStart, weekEnd, hasData };
}
