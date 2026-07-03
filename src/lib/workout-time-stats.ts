import type { WorkoutSession } from '@/types';

// Czas trwania i gęstość treningu + statystyka pomijanych ćwiczeń (Z76).
// Dane już zbierane (durationSec, skippedExercises) — tu zaczynają pracować dla usera.

export interface DurationTrendPoint {
  /** Miesiąc YYYY-MM. */
  month: string;
  avgMinutes: number;
  /** Gęstość = tonaż roboczy (bez rozgrzewek) na minutę treningu. */
  densityKgPerMin: number;
}

export const getDurationTrend = (workouts: WorkoutSession[], months = 6): DurationTrendPoint[] => {
  const byMonth = new Map<string, { totalSec: number; sessions: number; tonnage: number }>();

  workouts
    .filter((w) => w.completed && typeof w.durationSec === 'number' && w.durationSec > 0)
    .forEach((w) => {
      const month = w.date.slice(0, 7);
      const bucket = byMonth.get(month) ?? { totalSec: 0, sessions: 0, tonnage: 0 };
      bucket.totalSec += w.durationSec as number;
      bucket.sessions += 1;
      bucket.tonnage += w.exercises.reduce(
        (sum, ex) => sum + ex.sets.reduce(
          (setSum, s) => setSum + (s.completed && !s.isWarmup ? s.reps * s.weight : 0), 0),
        0,
      );
      byMonth.set(month, bucket);
    });

  return Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-months)
    .map(([month, b]) => {
      const totalMinutes = b.totalSec / 60;
      return {
        month,
        avgMinutes: Math.round(totalMinutes / b.sessions),
        densityKgPerMin: totalMinutes > 0 ? Math.round((b.tonnage / totalMinutes) * 10) / 10 : 0,
      };
    });
};

export interface SkippedStat {
  exerciseName: string;
  count: number;
}

/** Najczęściej pomijane ćwiczenia (Z76): zliczane po id, nazwa przez resolver historii. */
export const getSkippedStats = (
  workouts: WorkoutSession[],
  resolver: { resolveExerciseName: (workout: WorkoutSession, exerciseId: string) => string },
  limit = 5,
): SkippedStat[] => {
  const counts = new Map<string, { count: number; name: string }>();

  workouts
    .filter((w) => w.completed)
    .forEach((w) => {
      (w.skippedExercises ?? []).forEach((exerciseId) => {
        const entry = counts.get(exerciseId) ?? { count: 0, name: resolver.resolveExerciseName(w, exerciseId) };
        entry.count += 1;
        counts.set(exerciseId, entry);
      });
    });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ name, count }) => ({ exerciseName: name, count }));
};
