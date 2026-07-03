import type { WorkoutSession } from '@/types';

export interface ExerciseNoteEntry {
  date: string;
  note: string;
}

/**
 * Historia notatek per ćwiczenie (Z74): z ukończonych sesji, najnowsze pierwsze.
 * Resolver nazw niepotrzebny — id + snapshot nazwy żyją w sesji.
 */
export const getExerciseNoteHistory = (
  workouts: WorkoutSession[],
  exerciseId: string,
  limit = 5,
): ExerciseNoteEntry[] =>
  workouts
    .filter((w) => w.completed)
    .flatMap((w) => {
      const note = w.exercises.find((e) => e.exerciseId === exerciseId)?.notes?.trim();
      return note ? [{ date: w.date, note }] : [];
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
