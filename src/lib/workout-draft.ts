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
  // Odhaczenia rozgrzewki (Z162) — pole additive, przeżywa round-trip przez fallback.
  warmupChecked?: string[];
  // Swapy "tylko dziś" (Z185) — pole additive, przeżywa round-trip przez fallback.
  sessionSwaps?: Record<string, { id: string; name: string; sets: string; videoUrl?: string }>;
  savedAt: number;
  // Znaczniki chmury i wersja draftu — bez nich roundtrip przez fallback
  // gubi baseline rewizji i produkuje fałszywe konflikty.
  cloudRevision?: number;
  cloudUpdatedAt?: number;
  version?: number;
  // Znaczniki czasu sesji (incydent 2026-08-13): gdy IDB umiera w trakcie treningu,
  // cała sesja żyje w fallbacku — bez tych pól merge dziedziczył stęchły
  // lastActivityAt z IDB i clamp Z142 ścinał czas 1h19m do 180 s.
  startedAt?: number;
  lastActivityAt?: number;
  finalizedAt?: number;
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
