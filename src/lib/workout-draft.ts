import type { SetData } from '@/types';

const DRAFT_KEY = 'fittracker_workout_draft';

export interface WorkoutDraft {
  sessionId: string;
  dayId: string;
  date: string;
  exerciseSets: Record<string, SetData[]>;
  exerciseNotes: Record<string, string>;
  dayNotes: string;
  skippedExercises: string[];
  savedAt: number;
}

export const workoutDraft = {
  save(draft: WorkoutDraft): void {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // localStorage full or unavailable — silently fail
    }
  },

  load(): WorkoutDraft | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.sessionId || !parsed?.exerciseSets) return null;
      return parsed as WorkoutDraft;
    } catch {
      // corrupt data — clear and return null
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // silently fail
    }
  },

  exists(): boolean {
    try {
      return localStorage.getItem(DRAFT_KEY) !== null;
    } catch {
      return false;
    }
  },
};
