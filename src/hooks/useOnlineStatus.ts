import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '@/lib/offline-queue';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { auth } from '@/lib/firebase';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOps, setPendingOps] = useState(offlineQueue.size());

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

  // Poll pending ops count
  useEffect(() => {
    const interval = setInterval(() => {
      const userId = auth.currentUser?.uid;
      const queueCount = userId ? workoutSyncQueue.pendingCount(userId) : 0;
      if (!userId) {
        setPendingOps(offlineQueue.size());
        return;
      }

      void workoutDraftDb.loadActiveDraft(userId).then((draft) => {
        const activeCount = draft && (draft.dirty || draft.finalSyncPending || draft.sessionOrigin === 'provisional') ? 1 : 0;
        setPendingOps(Math.max(offlineQueue.size(), queueCount + activeCount));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const refreshPendingOps = useCallback(() => {
    setPendingOps(offlineQueue.size());
  }, []);

  return { isOnline, pendingOps, refreshPendingOps };
};
