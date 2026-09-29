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
import { selectCompletedWorkouts } from '@/lib/completed-workouts';

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
  const completed = selectCompletedWorkouts(workouts);
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

/** Saved manual entries and imported Strava activities represent completed activity. */
export interface StatsActivity {
  id: string;
  userId: string;
  source: 'manual' | 'strava';
  type: string;
  /** YYYY-MM-DD; brak w starych kształtach = aktywność liczona (nie gubimy jej). */
  date?: string;
  stravaId?: number;
  movingTime?: number;
  elapsedTime?: number;
}

type BySource = Record<StatsActivity['source'], number>;

export interface AllTimeActivityStats {
  strength: AllTimeStats;
  /**
   * F5 (wariant A właściciela, 2026-09-29): początek okna liczenia. Pierwszy
   * ukończony trening siłowy w apce; bez niego najstarsza aktywność (wtedy nic
   * nie jest wykluczone). Import Stravy sięga 12 miesięcy PRZED połączeniem,
   * więc bez tego okna licznik mieszał okresy.
   */
  since: string | null;
  sinceSource: 'strength' | 'activity' | null;
  activityCount: number;
  cardioCount: number;
  cardioDurationSec: number;
  cardioBySource: BySource;
  /** Posortowane malejąco po liczbie, remis alfabetycznie po typie. */
  cardioByType: Array<{ type: string; count: number }>;
  /** Cardio sprzed `since`: nie wchodzi do licznika, ale istnieje (np. zakładka Strava). */
  beforeSince: BySource;
}

const dayOf = (date: string | undefined): string | null => (
  typeof date === 'string' && date.length >= 10 ? date.slice(0, 10) : null
);

/** Cardio never changes strength volume, PRs, sets or training streaks. */
export const buildAllTimeActivityStats = (
  workouts: WorkoutSession[],
  activities: StatsActivity[],
): AllTimeActivityStats => {
  const strength = buildAllTimeStats(workouts);
  const seen = new Set<string>();
  const cardio: StatsActivity[] = [];
  for (const activity of activities) {
    const type = activity.type.toLowerCase();
    // Strava may mirror the strength session already saved by Strength Save.
    if (type === 'weighttraining' || type === 'crossfit') continue;
    const key = `${activity.source}:${activity.source === 'strava' && activity.stravaId
      ? activity.stravaId : activity.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cardio.push(activity);
  }

  const strengthStart = dayOf(strength.firstWorkoutDate ?? undefined);
  const oldestActivity = cardio.reduce<string | null>((oldest, a) => {
    const day = dayOf(a.date);
    return day && (oldest === null || day < oldest) ? day : oldest;
  }, null);
  const since = strengthStart ?? oldestActivity;

  const cardioBySource: BySource = { strava: 0, manual: 0 };
  const beforeSince: BySource = { strava: 0, manual: 0 };
  const byType = new Map<string, number>();
  let cardioDurationSec = 0;
  for (const activity of cardio) {
    const day = dayOf(activity.date);
    if (since && day && day < since) {
      beforeSince[activity.source] += 1;
      continue;
    }
    cardioBySource[activity.source] += 1;
    byType.set(activity.type, (byType.get(activity.type) ?? 0) + 1);
    const duration = activity.movingTime ?? activity.elapsedTime;
    if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
      cardioDurationSec += duration;
    }
  }
  const cardioCount = cardioBySource.strava + cardioBySource.manual;
  return {
    strength,
    since,
    sinceSource: strengthStart ? 'strength' : since ? 'activity' : null,
    activityCount: strength.workoutCount + cardioCount,
    cardioCount,
    cardioDurationSec,
    cardioBySource,
    cardioByType: [...byType.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
    beforeSince,
  };
};
