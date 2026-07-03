import { useState, useEffect, useCallback } from 'react';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';
import { auth } from '@/lib/firebase';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOps, setPendingOps] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Licznik pending sterowany zdarzeniami (R2-28): polling IndexedDB co 2 s konkurował
  // z zapisami draftu w trakcie treningu. Zmiany stanu syncu emitują
  // WORKOUT_SYNC_STATE_CHANGED_EVENT; focus/online łapią powrót do appki.
  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        setPendingOps(0);
        return;
      }
      const queueCount = workoutSyncQueue.pendingCount(userId);
      void workoutDraftDb.loadActiveDraft(userId).then((draft) => {
        if (cancelled) return;
        const activeCount = draft && (draft.dirty || draft.finalSyncPending || draft.sessionOrigin === 'provisional') ? 1 : 0;
        setPendingOps(queueCount + activeCount);
      });
    };

    refresh();
    window.addEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, []);

  const refreshPendingOps = useCallback(() => {
    setPendingOps(0);
  }, []);

  return { isOnline, pendingOps, refreshPendingOps };
};
