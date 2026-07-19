import type { WorkoutSession } from '@/types';
import { slugifyExercise } from '@/lib/exercise-media';

export interface ExerciseNoteEntry {
  date: string;
  note: string;
}

/**
 * Przypięta notatka per ćwiczenie (Z103): trwała, niezależna od planu i sesji.
 * Klucz = kanoniczna NAZWA ćwiczenia (exerciseId jest niestabilne między planami).
 */
export interface ExerciseNote {
  userId: string;
  exerciseName: string;
  note: string;
  machineSettings?: string;
  updatedAt: number;
}

export const EXERCISE_NOTE_MAX_LENGTH = 500;
export const MACHINE_SETTINGS_MAX_LENGTH = 200;
const NOTE_DOC_SLUG_MAX_LENGTH = 150;

/** Deterministyczny doc id notatki: `${userId}_${slug(nazwa)}` — idempotentne zapisy, brak duplikatów. */
export const exerciseNoteDocId = (userId: string, exerciseName: string): string =>
  `${userId}_${slugifyExercise(exerciseName).slice(0, NOTE_DOC_SLUG_MAX_LENGTH)}`;

/** Sanityzacja przed zapisem do Firestore: trim, limity długości, zero undefined w obiekcie. */
export const sanitizeExerciseNote = (
  input: { note?: string; machineSettings?: string },
): { note: string; machineSettings?: string } => {
  const note = (input.note ?? '').trim().slice(0, EXERCISE_NOTE_MAX_LENGTH);
  const machineSettings = (input.machineSettings ?? '').trim().slice(0, MACHINE_SETTINGS_MAX_LENGTH);
  return machineSettings ? { note, machineSettings } : { note };
};

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
