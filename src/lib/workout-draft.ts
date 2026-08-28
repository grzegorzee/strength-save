import type { SetData, ExerciseMetrics } from '@/types';
import type { ActiveHealthGrant } from '@/lib/legal-versions';
import type { ExerciseMetricGrants } from '@/lib/workout-health-fence';

export const LOCAL_STORAGE_WORKOUT_DRAFT_KEY = 'fittracker_workout_draft';
export const getScopedWorkoutDraftKey = (userId?: string) => (
  userId ? `${LOCAL_STORAGE_WORKOUT_DRAFT_KEY}:${userId}` : LOCAL_STORAGE_WORKOUT_DRAFT_KEY
);

export interface WorkoutDraft {
  sessionId: string;
  dayId: string;
  date: string;
  // Tożsamość sesji i cyklu musi przeżyć awarię IDB. Pola są opcjonalne, aby
  // zachować odczyt fallbacków zapisanych przed rozszerzeniem formatu.
  cycleId?: string | null;
  sessionOrigin?: 'remote' | 'provisional';
  remoteSessionId?: string | null;
  exerciseSets: Record<string, SetData[]>;
  exerciseNotes: Record<string, string>;
  // Metryki autoregulacji RPE/ból/jakość (bug 13, X30) — pole additive; bez niego
  // wpisy dokonane po awarii IDB (sesja żyjąca na fallbacku) cicho przepadały.
  exerciseMetrics?: Record<string, ExerciseMetrics>;
  exerciseMetricGrants?: ExerciseMetricGrants;
  pendingHealthGrant?: ActiveHealthGrant | null;
  // Snapshoty nazw ćwiczeń (bug 13, X30) — historia odporna na zmiany planu także,
  // gdy sesja żyje na fallbacku (dodane w locie / swapowane ćwiczenia).
  exerciseNames?: Record<string, string>;
  dayNotes: string;
  dayName?: string;
  dayFocus?: string;
  skippedExercises: string[];
  lastTouchedExerciseId?: string;
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
  // Klucz idempotencji trwającej próby zapisu (kontrakt R2-01, bug 13, X30):
  // bez round-tripu przez fallback retry checkpointu po lost-ack szedł z NOWYM
  // writeId i kończył się fałszywym WORKOUT_CONFLICT.
  pendingWriteId?: string | null;
  pendingWriteVersion?: number | null;
  // Intencja finalizacji jest stanem trwałym, nie stanem UI. Jej utrata po
  // restarcie pozostawiała ukończony lokalnie trening bez finalnego syncu.
  lastFirebaseSyncAt?: number | null;
  dirty?: boolean;
  completedLocally?: boolean;
  finalSyncPending?: boolean;
  healthSyncPending?: boolean;
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
