import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSession, SetData } from '@/types';
import { buildSyncCenterExercisesPayload } from '@/lib/sync-center-payload';
import {
  buildWorkoutWriteExpectation,
  matchesFinalWorkoutContent,
  validateWorkoutCloudWrite,
} from '@/lib/workout-final-sync';
import { isRevisionConflictError } from '@/lib/workout-sync-conflict';
import { draftWriteId } from '@/lib/workout-write-attempt';

// Jeden silnik syncu treningu: cała sekwencja promote -> alreadyFinalized -> save ->
// validate -> cleanup w jednym miejscu, z blokadą in-flight per (userId, sessionId).
// WorkoutDay, SyncCenterCard i AutoSyncOnReconnect są tylko cienkimi adapterami UI.
// Treść ZAWSZE z draftu (deps.loadDraft) — kolejka trzyma wyłącznie referencje.

export type SyncKind = 'checkpoint' | 'final';

export interface WorkoutSaveExercise {
  exerciseId: string;
  sets: SetData[];
  notes?: string;
  name?: string;
  rpe?: number;
  pain?: number;
  quality?: number;
}

export interface WorkoutSaveOptions {
  cycleId?: string;
  notes?: string;
  skippedExercises?: string[];
  completed?: boolean;
  dayName?: string;
  dayFocus?: string;
  durationSec?: number;
  startedAt?: number;
  completedAt?: number;
  expectedRevision: number | null;
  writeId: string;
}

export interface WorkoutSyncDeps {
  loadDraft: (userId: string, sessionId: string) => Promise<ActiveWorkoutDraft | null>;
  saveWorkout: (
    sessionId: string,
    exercises: WorkoutSaveExercise[],
    options: WorkoutSaveOptions,
  ) => Promise<{ success: boolean; error?: string; updatedAt?: number; revision?: number; alreadyApplied?: boolean }>;
  getFromServer: (sessionId: string) => Promise<WorkoutSession | null>;
  createSession: (
    dayId: string,
    date?: string,
    cycleId?: string,
  ) => Promise<{ session: WorkoutSession | null; error?: string }>;
  markPromoted: (
    userId: string,
    remoteSessionId: string,
    sessionId?: string,
    cloudState?: { updatedAt?: number; revision?: number },
  ) => Promise<void>;
  markSynced: (
    userId: string,
    syncedAt: number,
    expectedDraftVersion: number,
    sessionId?: string,
    cloudState?: { updatedAt?: number; revision?: number },
  ) => Promise<void>;
  setCloudBaseline: (
    userId: string,
    sessionId: string,
    cloudState: { updatedAt?: number; revision?: number },
  ) => Promise<void>;
  setPendingWrite: (
    userId: string,
    sessionId: string,
    pending: { writeId: string; version: number } | null,
  ) => Promise<void>;
  clearDraft: (userId: string, sessionId: string) => Promise<void>;
  queue: {
    remove: (userId: string, sessionId: string) => void;
  };
  isOnline?: () => boolean;
  now?: () => number;
}

export interface SyncOutcome {
  success: boolean;
  skipped?: boolean;          // brak draftu / nic do zrobienia
  conflict?: boolean;         // realny konflikt rewizji: UI decyduje o dialogu
  alreadyFinalized?: boolean; // finalna treść już była w chmurze (idempotencja)
  error?: string;             // surowy kod; UI mapuje przez workoutSyncErrorMessageKey
  revision?: number;
  updatedAt?: number;
  sessionId: string;          // docelowa sesja (po ewentualnej promocji)
  promotedSessionId?: string; // ustawione, gdy provisional awansował do remote
  syncedDraftVersion?: number; // wersja draftu objęta tym zapisem (dla applySyncMarkers)
  markSyncedFailed?: boolean; // chmura OK, lokalny status nieodświeżony
  cleanupFailed?: boolean;    // chmura OK, lokalny draft nieusunięty
}

const inFlight = new Map<string, Promise<SyncOutcome>>();

const lockKey = (userId: string, sessionId: string): string => `${userId}::${sessionId}`;

export const syncWorkoutSession = (
  userId: string,
  sessionId: string,
  kind: SyncKind,
  deps: WorkoutSyncDeps,
): Promise<SyncOutcome> => {
  const key = lockKey(userId, sessionId);
  const existing = inFlight.get(key);
  if (existing) {
    if (kind === 'final') {
      // Final nie może zostać połknięty przez trwający checkpoint — dołącza po nim.
      const chained: Promise<SyncOutcome> = existing
        .catch(() => undefined)
        .then(() => runSync(userId, sessionId, kind, deps));
      const tracked: Promise<SyncOutcome> = chained.finally(() => {
        if (inFlight.get(key) === tracked) inFlight.delete(key);
      });
      inFlight.set(key, tracked);
      return tracked;
    }
    // Równoległe wywołanie zwraca TĘ SAMĄ obietnicę (nie skipped-error).
    return existing;
  }

  const tracked: Promise<SyncOutcome> = runSync(userId, sessionId, kind, deps).finally(() => {
    if (inFlight.get(key) === tracked) inFlight.delete(key);
  });
  inFlight.set(key, tracked);
  return tracked;
};

const runSync = async (
  userId: string,
  sessionId: string,
  kind: SyncKind,
  deps: WorkoutSyncDeps,
): Promise<SyncOutcome> => {
  const now = deps.now ?? Date.now;
  const isOnline = deps.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine);

  try {
    let draft = await deps.loadDraft(userId, sessionId);
    if (!draft) {
      // Kolejka referencyjna: wpis bez draftu nie ma treści do zapisania.
      deps.queue.remove(userId, sessionId);
      return { success: true, skipped: true, sessionId };
    }

    let targetSessionId = sessionId;
    let promotedSessionId: string | undefined;

    if (draft.sessionOrigin === 'provisional') {
      if (!isOnline()) {
        return { success: false, error: 'OFFLINE', sessionId };
      }
      const promo = await deps.createSession(draft.dayId, draft.date, draft.cycleId ?? undefined);
      if (promo.error || !promo.session) {
        return { success: false, error: promo.error || 'PROMOTE_FAILED', sessionId };
      }
      await deps.markPromoted(userId, promo.session.id, draft.sessionId, {
        updatedAt: promo.session.updatedAt,
        revision: promo.session.revision,
      });
      deps.queue.remove(userId, sessionId);
      const promoted = await deps.loadDraft(userId, promo.session.id);
      if (!promoted) {
        return { success: false, error: 'PROMOTED_DRAFT_NOT_FOUND', sessionId };
      }
      draft = promoted;
      targetSessionId = promo.session.id;
      promotedSessionId = promo.session.id;
    }

    const requiresFinal = kind === 'final' || draft.finalSyncPending;

    // Final czyta serwer zawsze (idempotencja treści); checkpoint tylko gdy brak baseline.
    let serverWorkout: WorkoutSession | null = null;
    if (requiresFinal || (draft.sessionOrigin === 'remote' && draft.cloudRevision === undefined)) {
      serverWorkout = await deps.getFromServer(targetSessionId);
    }

    if (draft.cloudRevision === undefined && serverWorkout) {
      // Brak baseline = zapytaj serwer, nigdy nie zakładaj 0 (audyt 3.5).
      const revision = Math.max(0, Math.floor(serverWorkout.revision ?? 0));
      await deps.setCloudBaseline(userId, targetSessionId, {
        revision,
        ...(serverWorkout.updatedAt !== undefined && { updatedAt: serverWorkout.updatedAt }),
      });
      draft = {
        ...draft,
        cloudRevision: revision,
        ...(serverWorkout.updatedAt !== undefined && { cloudUpdatedAt: serverWorkout.updatedAt }),
      };
    }

    const { writeId, reused: writeIdReused } = draftWriteId(draft);
    if (!writeIdReused) {
      try {
        await deps.setPendingWrite(userId, targetSessionId, { writeId, version: draft.version });
      } catch {
        // best-effort: brak persystencji pendingWriteId nie blokuje zapisu
      }
    }

    const exercisesPayload = buildSyncCenterExercisesPayload(draft);
    const finalizedAt = requiresFinal ? draft.finalizedAt ?? now() : undefined;
    const durationSec = requiresFinal && draft.startedAt && finalizedAt
      ? Math.max(0, Math.floor((finalizedAt - draft.startedAt) / 1000))
      : undefined;
    const saveOptions: WorkoutSaveOptions = {
      cycleId: draft.cycleId ?? undefined,
      notes: draft.dayNotes || undefined,
      skippedExercises: draft.skippedExercises.length > 0 ? draft.skippedExercises : undefined,
      dayName: draft.dayName || undefined,
      dayFocus: draft.dayFocus || undefined,
      ...(requiresFinal && { completed: true }),
      ...(durationSec !== undefined && { durationSec }),
      ...(requiresFinal && draft.startedAt ? { startedAt: draft.startedAt } : {}),
      ...(finalizedAt !== undefined && { completedAt: finalizedAt }),
      expectedRevision: draft.cloudRevision ?? 0,
      writeId,
    };

    const expectation = buildWorkoutWriteExpectation(exercisesPayload, saveOptions);
    const existingFinalWorkout = requiresFinal ? serverWorkout : null;
    // Odpowiedź poprzedniego zapisu mogła zginąć po przejściu appki do tła.
    // Jeżeli finalna treść już jest w chmurze, nie nadpisujemy jej starym revisionem.
    const alreadyFinalized = matchesFinalWorkoutContent(existingFinalWorkout, expectation);
    const result = alreadyFinalized
      ? {
        success: true as const,
        updatedAt: existingFinalWorkout?.updatedAt,
        revision: existingFinalWorkout?.revision,
      }
      : await deps.saveWorkout(targetSessionId, exercisesPayload, saveOptions);

    if (!result.success) {
      const error = result.error;
      if (isRevisionConflictError(error)) {
        return { success: false, conflict: true, error, sessionId: targetSessionId, promotedSessionId };
      }
      return { success: false, error, sessionId: targetSessionId, promotedSessionId };
    }

    if (requiresFinal) {
      const confirmedWorkout = alreadyFinalized
        ? existingFinalWorkout
        : await deps.getFromServer(targetSessionId);
      const validation = alreadyFinalized
        ? { ok: true as const }
        : validateWorkoutCloudWrite(confirmedWorkout, expectation);
      if (!validation.ok) {
        const reason = 'reason' in validation && validation.reason ? validation.reason : 'unknown';
        return {
          success: false,
          error: `CLOUD_NOT_CONFIRMED: ${reason}`,
          sessionId: targetSessionId,
          promotedSessionId,
        };
      }

      let cleanupFailed: boolean | undefined;
      try {
        await deps.clearDraft(userId, targetSessionId);
      } catch {
        cleanupFailed = true;
      }
      deps.queue.remove(userId, sessionId);
      deps.queue.remove(userId, targetSessionId);
      return {
        success: true,
        ...(alreadyFinalized && { alreadyFinalized: true }),
        revision: result.revision,
        updatedAt: result.updatedAt,
        sessionId: targetSessionId,
        promotedSessionId,
        syncedDraftVersion: draft.version,
        ...(cleanupFailed && { cleanupFailed }),
      };
    }

    let markSyncedFailed: boolean | undefined;
    try {
      await deps.markSynced(userId, now(), draft.version, targetSessionId, {
        updatedAt: result.updatedAt,
        revision: result.revision,
      });
    } catch {
      markSyncedFailed = true;
    }
    deps.queue.remove(userId, targetSessionId);
    return {
      success: true,
      revision: result.revision,
      updatedAt: result.updatedAt,
      sessionId: targetSessionId,
      promotedSessionId,
      syncedDraftVersion: draft.version,
      ...(markSyncedFailed && { markSyncedFailed }),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      sessionId,
    };
  }
};
