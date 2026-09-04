import type { SetData, ExerciseMetrics } from '@/types';
import type { ActiveHealthGrant } from '@/lib/legal-versions';
import type { ExerciseMetricGrants } from '@/lib/workout-health-fence';

export const LOCAL_STORAGE_WORKOUT_DRAFT_KEY = 'fittracker_workout_draft';
export const LOCAL_STORAGE_WORKOUT_DRAFT_JOURNAL_KEY = 'fittracker_workout_drafts_v2';
export const getScopedWorkoutDraftKey = (userId?: string) => (
  userId ? `${LOCAL_STORAGE_WORKOUT_DRAFT_KEY}:${userId}` : LOCAL_STORAGE_WORKOUT_DRAFT_KEY
);
export const getScopedWorkoutDraftJournalKey = (userId?: string) => (
  userId ? `${LOCAL_STORAGE_WORKOUT_DRAFT_JOURNAL_KEY}:${userId}` : LOCAL_STORAGE_WORKOUT_DRAFT_JOURNAL_KEY
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

interface WorkoutDraftJournal {
  version: 2;
  drafts: Record<string, WorkoutDraft>;
}

const isWorkoutDraft = (value: unknown): value is WorkoutDraft => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<WorkoutDraft>;
  return typeof draft.sessionId === 'string'
    && draft.sessionId.length > 0
    && !!draft.exerciseSets
    && typeof draft.exerciseSets === 'object';
};

const readLegacyDraft = (userId?: string): WorkoutDraft | null => {
  const key = getScopedWorkoutDraftKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isWorkoutDraft(parsed) ? parsed : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const readJournal = (userId?: string): WorkoutDraftJournal => {
  const key = getScopedWorkoutDraftJournalKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { version: 2, drafts: {} };
    const parsed = JSON.parse(raw) as Partial<WorkoutDraftJournal>;
    if (parsed.version !== 2 || !parsed.drafts || typeof parsed.drafts !== 'object') {
      localStorage.removeItem(key);
      return { version: 2, drafts: {} };
    }
    return {
      version: 2,
      drafts: Object.fromEntries(
        Object.entries(parsed.drafts).filter(([, draft]) => isWorkoutDraft(draft)),
      ),
    };
  } catch {
    localStorage.removeItem(key);
    return { version: 2, drafts: {} };
  }
};

const loadAllDrafts = (userId?: string): WorkoutDraft[] => {
  const bySession = new Map<string, WorkoutDraft>();
  const legacy = readLegacyDraft(userId);
  if (legacy) bySession.set(legacy.sessionId, legacy);
  Object.values(readJournal(userId).drafts).forEach((draft) => {
    bySession.set(draft.sessionId, draft);
  });
  return [...bySession.values()].sort((a, b) => b.savedAt - a.savedAt);
};

export const workoutDraft = {
  save(draft: WorkoutDraft, userId?: string): boolean {
    try {
      const journal = readJournal(userId);
      journal.drafts[draft.sessionId] = draft;
      localStorage.setItem(getScopedWorkoutDraftJournalKey(userId), JSON.stringify(journal));
      return true;
    } catch {
      return false;
    }
  },

  load(userId?: string): WorkoutDraft | null {
    return loadAllDrafts(userId)[0] ?? null;
  },

  loadAll(userId?: string): WorkoutDraft[] {
    return loadAllDrafts(userId);
  },

  loadSession(sessionId: string, userId?: string): WorkoutDraft | null {
    return loadAllDrafts(userId).find(draft => draft.sessionId === sessionId) ?? null;
  },

  clear(userId?: string): boolean {
    try {
      localStorage.removeItem(getScopedWorkoutDraftKey(userId));
      localStorage.removeItem(getScopedWorkoutDraftJournalKey(userId));
      return true;
    } catch {
      return false;
    }
  },

  clearSession(sessionId: string, userId?: string): boolean {
    try {
      const journalKey = getScopedWorkoutDraftJournalKey(userId);
      const journal = readJournal(userId);
      delete journal.drafts[sessionId];
      if (Object.keys(journal.drafts).length > 0) {
        localStorage.setItem(journalKey, JSON.stringify(journal));
      } else {
        localStorage.removeItem(journalKey);
      }

      const legacy = readLegacyDraft(userId);
      if (legacy?.sessionId === sessionId) {
        localStorage.removeItem(getScopedWorkoutDraftKey(userId));
      }
      return true;
    } catch {
      return false;
    }
  },

  exists(userId?: string): boolean {
    try {
      return loadAllDrafts(userId).length > 0;
    } catch {
      return false;
    }
  },
};
