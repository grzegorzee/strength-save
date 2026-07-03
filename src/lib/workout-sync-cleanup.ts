import { workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { workoutSyncQueue, type WorkoutSyncQueueEntry } from '@/lib/workout-sync-queue';
import type { WorkoutSession } from '@/types';

// Jednorazowe sprzątanie pozostałości sprzed R2 (Z53): tombstone (Z32) i sprzątanie
// kolejki (Z23) nie działają wstecz — u usera mogą wisieć osierocone provisional
// drafty i martwe wpisy kolejki. Guard w localStorage ustawiany PO sukcesie
// (wzorzec runCycleAutoRepair); porażka = retry przy kolejnym uruchomieniu.

const LEGACY_CLEANUP_GUARD_PREFIX = 'fittracker_legacy_cleanup_v1';

const getGuardKey = (uid: string) => `${LEGACY_CLEANUP_GUARD_PREFIX}:${uid}`;

export interface LegacyCleanupDeps {
  listDrafts: (uid: string) => Promise<ActiveWorkoutDraft[]>;
  clearDraftIfVersion: (uid: string, sessionId: string, expectedVersion: number) => Promise<boolean>;
  queue: {
    list: (uid: string) => WorkoutSyncQueueEntry[];
    remove: (uid: string, sessionId: string) => void;
  };
}

const defaultDeps: LegacyCleanupDeps = {
  listDrafts: (uid) => workoutDraftDb.listDrafts(uid),
  clearDraftIfVersion: (uid, sessionId, expectedVersion) =>
    workoutDraftDb.clearActiveDraftIfVersion(uid, sessionId, expectedVersion),
  queue: {
    list: (uid) => workoutSyncQueue.list(uid),
    remove: (uid, sessionId) => workoutSyncQueue.remove(uid, sessionId),
  },
};

export const cleanupLegacySyncLeftovers = async (
  uid: string,
  workouts: WorkoutSession[],
  deps: LegacyCleanupDeps = defaultDeps,
): Promise<void> => {
  if (!uid) return;
  try {
    if (localStorage.getItem(getGuardKey(uid))) return;
  } catch {
    return;
  }

  const drafts = await deps.listDrafts(uid);
  const draftSessionIds = new Set(drafts.map(draft => draft.sessionId));

  // (1) Wpisy kolejki bez draftu: kolejka jest referencyjna, bez treści nie ma
  // czego synchronizować — wpis tylko straszy w Sync Center.
  for (const entry of deps.queue.list(uid)) {
    if (!draftSessionIds.has(entry.sessionId)) {
      deps.queue.remove(uid, entry.sessionId);
    }
  }

  // (2) Czyste provisional drafty, których dzień/data ma już ukończony trening
  // w chmurze: pozostałość sprzed tombstone'ów promocji (Z32).
  for (const draft of drafts) {
    const isCleanProvisional = draft.sessionOrigin === 'provisional'
      && !draft.dirty
      && !draft.finalSyncPending;
    if (!isCleanProvisional) continue;
    const hasCompletedCloudTwin = workouts.some(w =>
      w.completed && w.dayId === draft.dayId && w.date === draft.date);
    if (hasCompletedCloudTwin) {
      await deps.clearDraftIfVersion(uid, draft.sessionId, draft.version);
    }
  }

  try {
    localStorage.setItem(getGuardKey(uid), String(Date.now()));
  } catch {
    // Brak localStorage: sprzątanie i tak było idempotentne.
  }
};
