// Statystyki WSZYSTKICH treningów (X17D Z138). Czysta agregacja, zero backendu.
//
// Prośba usera: po tapnięciu w licznik treningów w nagłówku zobaczyć, ile czasu
// spędził na siłowni i ile ton podniósł.
//
// REUŻYCIE, nie przepisywanie: tonaż z `calculateTonnage` (reguła Z106 — bez
// rozgrzewki, tylko ukończone), czas z `workoutDurationSec` (fallback na znaczniki),
// streaki z `summary-utils`, PR z `buildHistoryRowMeta`. Dzięki temu ekran „Twoje
// liczby" pokazuje DOKŁADNIE te same liczby co reszta apki.

import type { WorkoutSession } from '@/types';
import { calculateTonnage, calculateStreakDetails, calculateLongestStreak } from '@/lib/summary-utils';
import { workoutDurationSec } from '@/lib/monthly-stats';
import { buildHistoryRowMeta } from '@/lib/history-stats';

export interface AllTimeStats {
  workoutCount: number;
  /** Sesje, które MAJĄ zmierzony czas — treningi sprzed M32 go nie mają. */
  workoutsWithDuration: number;
  totalDurationSec: number;
  totalTonnageKg: number;
  /** Ukończone serie ROBOCZE (bez rozgrzewki) — dotąd nigdzie nie liczone zbiorczo. */
  totalSets: number;
  totalReps: number;
  currentStreak: number;
  longestStreak: number;
  totalPRs: number;
  favoriteExercise: { name: string; sessions: number } | null;
  firstWorkoutDate: string | null;
}

const EMPTY: AllTimeStats = {
  workoutCount: 0,
  workoutsWithDuration: 0,
  totalDurationSec: 0,
  totalTonnageKg: 0,
  totalSets: 0,
  totalReps: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalPRs: 0,
  favoriteExercise: null,
  firstWorkoutDate: null,
};

export const buildAllTimeStats = (workouts: WorkoutSession[]): AllTimeStats => {
  const completed = workouts.filter((w) => w.completed);
  if (completed.length === 0) return { ...EMPTY };

  let workoutsWithDuration = 0;
  let totalDurationSec = 0;
  let totalSets = 0;
  let totalReps = 0;
  const exerciseSessions = new Map<string, number>();

  for (const workout of completed) {
    const duration = workoutDurationSec(workout);
    if (duration !== null) {
      workoutsWithDuration += 1;
      totalDurationSec += duration;
    }

    const seenInWorkout = new Set<string>();
    // Kształt danych z Firestore bywa niepełny (przerwany szybki trening, stara
    // sesja, częściowy sync). Ten moduł liczy się na KAŻDEJ stronie z nagłówkiem,
    // więc jeden uszkodzony rekord nie może wywrócić całej apki — crash 2026-07-20.
    for (const exercise of Array.isArray(workout.exercises) ? workout.exercises : []) {
      const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
      // Ta sama reguła co tonaż: liczy się WYŁĄCZNIE ukończona seria robocza.
      const working = sets.filter((s) => s?.completed && !s?.isWarmup);
      totalSets += working.length;
      totalReps += working.reduce((sum, s) => sum + (Number(s?.reps) || 0), 0);

      const name = exercise?.name ?? exercise?.exerciseId ?? '';
      if (working.length > 0 && !seenInWorkout.has(name)) {
        seenInWorkout.add(name);
        exerciseSessions.set(name, (exerciseSessions.get(name) ?? 0) + 1);
      }
    }
  }

  const favorite = [...exerciseSessions.entries()].sort((a, b) => b[1] - a[1])[0];
  const meta = buildHistoryRowMeta(completed);
  const totalPRs = [...meta.values()].reduce((sum, m) => sum + m.prCount, 0);

  return {
    workoutCount: completed.length,
    workoutsWithDuration,
    totalDurationSec,
    totalTonnageKg: calculateTonnage(completed),
    totalSets,
    totalReps,
    currentStreak: calculateStreakDetails(completed).streak,
    longestStreak: calculateLongestStreak(completed),
    totalPRs,
    favoriteExercise: favorite ? { name: favorite[0], sessions: favorite[1] } : null,
    firstWorkoutDate: completed.reduce<string | null>(
      (oldest, w) => (oldest === null || w.date < oldest ? w.date : oldest),
      null,
    ),
  };
};
