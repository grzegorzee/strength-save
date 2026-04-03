import type { SetData } from '@/types';

export const LOCAL_STORAGE_WORKOUT_DRAFT_KEY = 'fittracker_workout_draft';
export const getScopedWorkoutDraftKey = (userId?: string) => (
  userId ? `${LOCAL_STORAGE_WORKOUT_DRAFT_KEY}:${userId}` : LOCAL_STORAGE_WORKOUT_DRAFT_KEY
);

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
  save(draft: WorkoutDraft, userId?: string): boolean {
    try {
      localStorage.setItem(getScopedWorkoutDraftKey(userId), JSON.stringify(draft));
      return true;
    } catch {
      return false;
    }
  },

  load(userId?: string): WorkoutDraft | null {
    try {
      const raw = localStorage.getItem(getScopedWorkoutDraftKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.sessionId || !parsed?.exerciseSets) return null;
      return parsed as WorkoutDraft;
    } catch {
      // corrupt data — clear and return null
      localStorage.removeItem(getScopedWorkoutDraftKey(userId));
      return null;
    }
  },

  clear(userId?: string): boolean {
    try {
      localStorage.removeItem(getScopedWorkoutDraftKey(userId));
      return true;
    } catch {
      return false;
    }
  },

  exists(userId?: string): boolean {
    try {
      return localStorage.getItem(getScopedWorkoutDraftKey(userId)) !== null;
    } catch {
      return false;
    }
  },
};
