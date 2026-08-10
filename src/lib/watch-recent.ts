import type { WorkoutSession } from '@/types';
import type { WatchRecentExercisePayload } from '@/lib/watch-bridge';

/** Bezpieczna lista klasycznych ćwiczeń do lokalnego quick workout na Watch. */
export function buildRecentWatchExercises(
  workouts: WorkoutSession[],
  limit = 8,
): WatchRecentExercisePayload[] {
  const result: WatchRecentExercisePayload[] = [];
  const seenNames = new Set<string>();
  const sorted = [...workouts]
    .filter((workout) => workout.completed)
    .sort((a, b) => b.date.localeCompare(a.date)
      || (b.completedAt ?? b.updatedAt ?? 0) - (a.completedAt ?? a.updatedAt ?? 0));

  for (const workout of sorted) {
    for (const exercise of workout.exercises) {
      const name = (exercise.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
      const id = exercise.exerciseId.trim().slice(0, 120);
      if (!name || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(id)) continue;
      const key = name.toLocaleLowerCase();
      if (seenNames.has(key)) continue;
      const working = exercise.sets.filter((set) => !set.isWarmup);
      if (working.length === 0 || working.some((set) =>
        set.durationSec !== undefined || set.distanceM !== undefined || set.assistWeight !== undefined
      )) continue;
      const last = [...working].reverse().find((set) => set.completed && set.reps > 0);
      if (!last || !Number.isFinite(last.weight) || last.weight < 0) continue;
      seenNames.add(key);
      result.push({
        id,
        name,
        setCount: Math.max(1, Math.min(6, working.length)),
        reps: Math.max(1, Math.min(1000, Math.round(last.reps))),
        weight: Math.max(0, Math.min(2000, last.weight)),
      });
      if (result.length >= Math.max(1, Math.min(12, limit))) return result;
    }
  }
  return result;
}
