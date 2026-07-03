import { useEffect, useMemo, useRef } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT, collectRetryableSyncEntries } from '@/lib/workout-sync-entries';
import { isRevisionConflictError } from '@/lib/workout-sync-conflict';
import { syncWorkoutSession, type WorkoutSyncDeps } from '@/lib/workout-sync-engine';

// Po powrocie online (i na starcie sesji) automatycznie domyka zaległe final-synci
// z kolejki — wcześniej wymagało to ręcznego "Ponów" w Sync Center w Ustawieniach.
// Przetwarza WYŁĄCZNIE wpisy finalSyncPending (ukończone treningi), także aktywny
// draft widoczny na Dashboardzie. Aktywne drafty w trakcie treningu obsługuje WorkoutDay.
// Konflikt wersji (WORKOUT_CONFLICT) zostaje
// w kolejce do ręcznego rozwiązania dialogiem w treningu.
export const AutoSyncOnReconnect = () => {
  const { uid } = useCurrentUser();
  const { createWorkoutSession, batchSaveWorkout, getWorkoutSessionFromServer } = useFirebaseWorkouts(uid);
  const { toast } = useToast();
  const { t } = useTranslation();
  const runningRef = useRef(false);

  const syncDeps = useMemo<WorkoutSyncDeps>(() => ({
    loadDraft: (ownerId, sessionId) => workoutDraftDb.loadDraft(ownerId, sessionId),
    saveWorkout: batchSaveWorkout,
    getFromServer: getWorkoutSessionFromServer,
    createSession: createWorkoutSession,
    markPromoted: (ownerId, remoteSessionId, sessionId, cloudState) =>
      workoutDraftDb.markPromotedToRemote(ownerId, remoteSessionId, sessionId, cloudState),
    markSynced: (ownerId, syncedAt, expectedDraftVersion, sessionId, cloudState) =>
      workoutDraftDb.markDraftSynced(ownerId, syncedAt, expectedDraftVersion, sessionId, cloudState),
    setCloudBaseline: (ownerId, sessionId, cloudState) =>
      workoutDraftDb.setCloudBaseline(ownerId, sessionId, cloudState),
    setPendingWrite: (ownerId, sessionId, pending) =>
      workoutDraftDb.setPendingWrite(ownerId, sessionId, pending),
    clearDraft: (ownerId, sessionId) => workoutDraftDb.clearActiveDraft(ownerId, sessionId),
    queue: workoutSyncQueue,
  }), [batchSaveWorkout, getWorkoutSessionFromServer, createWorkoutSession]);

  useEffect(() => {
    if (!uid) return;

    const processQueue = async () => {
      if (runningRef.current || !navigator.onLine) return;
      const [activeDrafts, queueEntries] = await Promise.all([
        workoutDraftDb.listDrafts(uid),
        Promise.resolve(workoutSyncQueue.list(uid)),
      ]);
      const conflictSessionIds = new Set(
        queueEntries
          .filter((entry) => isRevisionConflictError(entry.lastError))
          .map((entry) => entry.sessionId),
      );
      const entries = collectRetryableSyncEntries(activeDrafts, queueEntries)
        .filter(({ entry }) => entry.finalSyncPending && !conflictSessionIds.has(entry.sessionId));
      if (entries.length === 0) return;

      runningRef.current = true;
      let synced = 0;
      try {
        for (const { entry } of entries) {
          const outcome = await syncWorkoutSession(uid, entry.sessionId, 'final', syncDeps);
          if (outcome.promotedSessionId) {
            trackTelemetryEvent(uid, 'provisional_session_promoted');
          }
          if (!outcome.success) {
            workoutSyncQueue.markRetry(uid, entry.sessionId, outcome.error || 'SYNC_FAILED');
            if (outcome.conflict) {
              trackTelemetryEvent(uid, 'revision_conflict');
            } else if (outcome.error?.startsWith('CLOUD_NOT_CONFIRMED')) {
              trackTelemetryEvent(uid, 'sync_validation_failed');
            }
            continue;
          }
          if (!outcome.skipped) {
            synced += 1;
          }
        }
      } finally {
        runningRef.current = false;
      }

      if (synced > 0) {
        window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
        trackTelemetryEvent(uid, 'sync_retry_auto', synced);
        toast({
          title: t('sync.autoSyncedTitle'),
          description: t('sync.autoSyncedDesc', { n: synced }),
        });
      }
    };

    const onOnline = () => { void processQueue(); };
    window.addEventListener('online', onOnline);
    void processQueue();
    return () => window.removeEventListener('online', onOnline);
  }, [uid, syncDeps, toast, t]);

  return null;
};
