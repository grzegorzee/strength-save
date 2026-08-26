import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { WorkoutSession, SetData } from '@/types';
import {
  buildWorkoutWriteExpectation,
  matchesFinalWorkoutContent,
  validateWorkoutCloudWrite,
} from '@/lib/workout-final-sync';
import { isRevisionConflictError } from '@/lib/workout-sync-conflict';
import { draftWriteId } from '@/lib/workout-write-attempt';
import { computeEffectiveDurationSec } from '@/lib/workout-duration';
import { withTimeout } from '@/lib/promise-timeout';

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
  ) => Promise<{ session: WorkoutSession | null; error?: string; existing?: boolean }>;
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
  // Czyści draft TYLKO gdy jego wersja <= expectedVersion (guard R2-03);
  // zwraca false, gdy draft ma nowszą treść i musi zostać (dirty).
  clearDraftIfVersion: (userId: string, sessionId: string, expectedVersion: number) => Promise<boolean>;
  queue: {
    remove: (userId: string, sessionId: string) => void;
  };
  isOnline?: () => boolean;
  now?: () => number;
  // WP-C (X38): limity czasu na operacje sieciowe silnika (transakcja, promocja,
  // odczyt z serwera). Bez nich zawieszona obietnica SDK trzymala inFlight
  // i runningRef do konca zycia strony (incydent 2026-08-26: skorupy ad-hoc
  // revision 0, zero bledow w telemetrii).
  timeouts?: { checkpointMs?: number; finalMs?: number };
}

export const SYNC_CHECKPOINT_TIMEOUT_MS = 20_000;
export const SYNC_FINAL_TIMEOUT_MS = 30_000;

export interface SyncOutcome {
  success: boolean;
  skipped?: boolean;          // brak draftu / nic do zrobienia
  missingDraft?: boolean;     // skipped, bo draft NIE ISTNIEJE pod tym id (bug 3, X30:
                              // np. AutoSync wypromował sesję za plecami ekranu) —
                              // UI może rozwiązać tombstone promocji i ponowić
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
  draftRetained?: boolean;    // final OK, ale draft ma nowszą treść — zostaje na follow-up
  // WP-C (X38): transakcja finalna ZATWIERDZONA (mamy revision), ale odczyt
  // potwierdzający nie doszedł albo nie zgadzał się z oczekiwaniem. To sukces
  // (chmura ma dane), nie powód do trzymania finalSyncPending; UI loguje.
  cloudUnconfirmed?: boolean;
  unconfirmedReason?: string;
}

const inFlight = new Map<string, Promise<SyncOutcome>>();

const lockKey = (userId: string, sessionId: string): string => `${userId}::${sessionId}`;

// Payload ćwiczeń budowany z draftu (jedyne źródło treści). Przeniesione z martwego
// modułu sync-center-payload.ts (R2-32) — silnik jest jedynym konsumentem.
export const buildDraftExercisesPayload = (draft: ActiveWorkoutDraft): WorkoutSaveExercise[] => (
  Object.entries(draft.exerciseSets).map(([exerciseId, sets]) => ({
    exerciseId,
    sets,
    ...(draft.exerciseNotes[exerciseId] && { notes: draft.exerciseNotes[exerciseId] }),
    ...(draft.exerciseNames?.[exerciseId] && { name: draft.exerciseNames[exerciseId] }),
    ...(draft.exerciseMetrics[exerciseId] ?? {}),
  }))
);

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
  const checkpointTimeoutMs = deps.timeouts?.checkpointMs ?? SYNC_CHECKPOINT_TIMEOUT_MS;
  const finalTimeoutMs = deps.timeouts?.finalMs ?? SYNC_FINAL_TIMEOUT_MS;
  // Odczyt/promocja: 20 s; zapis finalny: 30 s. Timeout rzuca ("... timed out
  // after N ms") -> catch na dole zwraca kod retryable 'timeout' i zwalnia lock.
  const guarded = <T>(operation: Promise<T>, label: string, timeoutMs = checkpointTimeoutMs): Promise<T> =>
    withTimeout(operation, timeoutMs, label);

  try {
    let draft = await deps.loadDraft(userId, sessionId);
    if (!draft) {
      // Kolejka referencyjna: wpis bez draftu nie ma treści do zapisania.
      // missingDraft odróżnia ten przypadek od "nic do zrobienia" (bug 3, X30).
      deps.queue.remove(userId, sessionId);
      return { success: true, skipped: true, missingDraft: true, sessionId };
    }

    let targetSessionId = sessionId;
    let promotedSessionId: string | undefined;

    if (draft.sessionOrigin === 'provisional') {
      if (!isOnline()) {
        return { success: false, error: 'OFFLINE', sessionId };
      }
      const promo = await guarded(deps.createSession(draft.dayId, draft.date, draft.cycleId ?? undefined), 'promote-session');
      if (promo.error || !promo.session) {
        return { success: false, error: promo.error || 'PROMOTE_FAILED', sessionId };
      }
      // Promocja na ISTNIEJĄCĄ sesję: createSession zwraca kopię z pamięci
      // (onSnapshot/persistentLocalCache) — revision może być stale. Baseline
      // precondition musi pochodzić z serwera (R2-20).
      let promoCloudState: { updatedAt?: number; revision?: number } = {
        ...(promo.session.updatedAt !== undefined && { updatedAt: promo.session.updatedAt }),
        ...(promo.session.revision !== undefined && { revision: promo.session.revision }),
      };
      if (promo.existing) {
        const serverSession = await guarded(deps.getFromServer(promo.session.id), 'promote-read');
        if (serverSession) {
          promoCloudState = {
            revision: Math.max(0, Math.floor(serverSession.revision ?? 0)),
            ...(serverSession.updatedAt !== undefined && { updatedAt: serverSession.updatedAt }),
          };
          await deps.setCloudBaseline(userId, promo.session.id, promoCloudState);
        }
      }
      await deps.markPromoted(userId, promo.session.id, draft.sessionId, promoCloudState);
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
      serverWorkout = await guarded(deps.getFromServer(targetSessionId), 'server-read');
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

    const exercisesPayload = buildDraftExercisesPayload(draft);
    const finalizedAt = requiresFinal ? draft.finalizedAt ?? now() : undefined;
    // Z142: duration do ostatniej realnej aktywności (clamp porzuconej sesji);
    // completedAt ZOSTAJE momentem faktycznego zapisu (porządek syncu i historia).
    const durationSec = requiresFinal
      ? computeEffectiveDurationSec({
        startedAt: draft.startedAt,
        finalizedAt,
        lastActivityAt: draft.lastActivityAt,
      })
      : undefined;
    const saveOptions: WorkoutSaveOptions = {
      cycleId: draft.cycleId ?? undefined,
      notes: draft.dayNotes || undefined,
      skippedExercises: draft.skippedExercises.length > 0 ? draft.skippedExercises : undefined,
      dayName: draft.dayName || undefined,
      dayFocus: draft.dayFocus || undefined,
      ...(requiresFinal && { completed: true }),
      ...(durationSec !== undefined && { durationSec }),
      // Z155: checkpointy też niosą startedAt — backend rozpoznaje aktywny trening.
      ...(draft.startedAt ? { startedAt: draft.startedAt } : {}),
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
      : await guarded(
        deps.saveWorkout(targetSessionId, exercisesPayload, saveOptions),
        requiresFinal ? 'final-save' : 'checkpoint-save',
        requiresFinal ? finalTimeoutMs : checkpointTimeoutMs,
      );

    if (!result.success) {
      const error = result.error;
      if (isRevisionConflictError(error)) {
        return { success: false, conflict: true, error, sessionId: targetSessionId, promotedSessionId };
      }
      return { success: false, error, sessionId: targetSessionId, promotedSessionId };
    }

    if (requiresFinal) {
      // WP-C (X38): odczyt potwierdzajacy po ZATWIERDZONEJ transakcji jest
      // dodatkowa asercja, nie warunkiem sukcesu. Transakcja z revision = chmura
      // ma dane; brak potwierdzenia (timeout, offline tuz po commicie, rozjazd)
      // NIE trzyma draftu w finalSyncPending (wczesniej: CLOUD_NOT_CONFIRMED
      // ponawial caly final i sciagal "stale" konflikty). Jedna proba ponowna
      // samego odczytu, potem sukces z flaga cloudUnconfirmed.
      let cloudUnconfirmed = false;
      let unconfirmedReason: string | undefined;
      if (!alreadyFinalized) {
        const committed = result.revision !== undefined;
        let confirmedWorkout: WorkoutSession | null = null;
        let readFailed: string | undefined;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            confirmedWorkout = await guarded(deps.getFromServer(targetSessionId), 'confirm-read');
            readFailed = undefined;
            break;
          } catch (err) {
            readFailed = err instanceof Error ? err.message : String(err);
          }
        }
        const validation = readFailed === undefined
          ? validateWorkoutCloudWrite(confirmedWorkout, expectation)
          : { ok: false as const, reason: `read-failed: ${readFailed}` };
        if (!validation.ok) {
          const reason = 'reason' in validation && validation.reason ? validation.reason : 'unknown';
          if (!committed) {
            return {
              success: false,
              error: `CLOUD_NOT_CONFIRMED: ${reason}`,
              sessionId: targetSessionId,
              promotedSessionId,
            };
          }
          cloudUnconfirmed = true;
          unconfirmedReason = reason;
        }
      }

      let cleanupFailed: boolean | undefined;
      let draftRetained: boolean | undefined;
      try {
        const cleared = await deps.clearDraftIfVersion(userId, targetSessionId, draft.version);
        if (!cleared) draftRetained = true;
      } catch {
        cleanupFailed = true;
      }
      if (draftRetained) {
        // Seria odhaczona w trakcie finalnego RTT: draft (dirty) i wpis kolejki zostają
        // na checkpoint follow-up. Fakt serwera musi trafić na draft, inaczej kolejny
        // zapis idzie ze stale expectedRevision i kończy się fałszywym konfliktem —
        // markSynced przy niezgodnej wersji zapisuje wyłącznie znaczniki chmury.
        try {
          await deps.markSynced(userId, now(), draft.version, targetSessionId, {
            updatedAt: result.updatedAt,
            revision: result.revision,
          });
        } catch {
          // best-effort: brak markerów nie unieważnia zapisu w chmurze
        }
      } else {
        deps.queue.remove(userId, sessionId);
        deps.queue.remove(userId, targetSessionId);
      }
      return {
        success: true,
        ...(alreadyFinalized && { alreadyFinalized: true }),
        revision: result.revision,
        updatedAt: result.updatedAt,
        sessionId: targetSessionId,
        promotedSessionId,
        syncedDraftVersion: draft.version,
        ...(cleanupFailed && { cleanupFailed }),
        ...(draftRetained && { draftRetained }),
        ...(cloudUnconfirmed && { cloudUnconfirmed, unconfirmedReason }),
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
