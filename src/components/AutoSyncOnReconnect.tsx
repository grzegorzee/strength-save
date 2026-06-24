import { useEffect, useRef } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { buildSyncCenterExercisesPayload, buildSyncCenterSaveOptions } from '@/lib/sync-center-payload';
import { buildWorkoutWriteExpectation, matchesFinalWorkoutContent, validateWorkoutCloudWrite } from '@/lib/workout-final-sync';
import { trackTelemetryEvent } from '@/lib/app-telemetry';

// Po powrocie online (i na starcie sesji) automatycznie domyka zaległe final-synci
// z kolejki — wcześniej wymagało to ręcznego "Ponów" w Sync Center w Ustawieniach.
// Przetwarza WYŁĄCZNIE wpisy finalSyncPending (ukończone treningi); aktywne drafty
// w trakcie treningu obsługuje WorkoutDay. Konflikt wersji (WORKOUT_CONFLICT) zostaje
// w kolejce do ręcznego rozwiązania dialogiem w treningu.
export const AutoSyncOnReconnect = () => {
  const { uid } = useCurrentUser();
  const { createWorkoutSession, batchSaveWorkout, getWorkoutSessionFromServer } = useFirebaseWorkouts(uid);
  const { toast } = useToast();
  const { t } = useTranslation();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!uid) return;

    const processQueue = async () => {
      if (runningRef.current || !navigator.onLine) return;
      const entries = workoutSyncQueue.list(uid).filter((entry) => entry.finalSyncPending);
      if (entries.length === 0) return;

      runningRef.current = true;
      let synced = 0;
      try {
        for (const entry of entries) {
          let working = entry;

          if (working.sessionOrigin === 'provisional') {
            const promo = await createWorkoutSession(working.dayId, working.date, working.cycleId ?? undefined);
            if (promo.error || !promo.session) {
              workoutSyncQueue.markRetry(uid, entry.sessionId, promo.error || 'PROMOTE_FAILED');
              continue;
            }
            workoutSyncQueue.remove(uid, entry.sessionId);
            working = {
              ...working,
              sessionId: promo.session.id,
              sessionOrigin: 'remote',
              remoteSessionId: promo.session.id,
            };
            workoutSyncQueue.upsertFromDraft(working);
            trackTelemetryEvent(uid, 'provisional_session_promoted');
          }

          const payload = buildSyncCenterExercisesPayload(working);
          const options = buildSyncCenterSaveOptions(working);
          const expectation = buildWorkoutWriteExpectation(payload, options);
          const existingFinalWorkout = await getWorkoutSessionFromServer(working.sessionId);
          const alreadyFinalized = matchesFinalWorkoutContent(existingFinalWorkout, expectation);
          const result = alreadyFinalized
            ? { success: true }
            : await batchSaveWorkout(working.sessionId, payload, options);
          if (!result.success) {
            workoutSyncQueue.markRetry(uid, working.sessionId, result.error || 'SYNC_FAILED');
            continue;
          }

          const confirmed = alreadyFinalized
            ? existingFinalWorkout
            : await getWorkoutSessionFromServer(working.sessionId);
          const validation = alreadyFinalized
            ? { ok: true }
            : validateWorkoutCloudWrite(confirmed, expectation);
          if (!validation.ok) {
            workoutSyncQueue.markRetry(uid, working.sessionId, validation.reason ?? 'VALIDATION_FAILED');
            trackTelemetryEvent(uid, 'sync_validation_failed');
            continue;
          }

          try {
            await workoutDraftDb.clearActiveDraft(uid, working.sessionId);
          } catch {
            // Draft lokalny mógł już nie istnieć — wpis kolejki i tak czyścimy niżej.
          }
          workoutSyncQueue.remove(uid, entry.sessionId);
          workoutSyncQueue.remove(uid, working.sessionId);
          synced += 1;
        }
      } finally {
        runningRef.current = false;
      }

      if (synced > 0) {
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
  }, [uid, createWorkoutSession, batchSaveWorkout, getWorkoutSessionFromServer, toast, t]);

  return null;
};
