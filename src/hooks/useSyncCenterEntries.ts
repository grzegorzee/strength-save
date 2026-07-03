import { useCallback, useEffect, useMemo, useState } from 'react';
import { workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { workoutSyncQueue, type WorkoutSyncQueueEntry } from '@/lib/workout-sync-queue';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';

// Wpisy Sync Center (Z52, ekstrakcja 1:1 z SyncCenterCard): aktywne drafty i wpisy
// kolejki w jednej liście, z dedupem po sessionId (treść żyje wyłącznie w drafcie).
// Settings używa hooka do decyzji "czy w ogóle renderować kartę".

export type ListedSyncEntry = {
  sessionId: string;
  dayId: string;
  date: string;
  sessionOrigin: 'remote' | 'provisional';
  dirty: boolean;
  finalSyncPending: boolean;
  updatedAt: number;
  retryCount?: number;
  lastError?: string | null;
  lastErrorAt?: number | null;
};

export const useSyncCenterEntries = (uid: string) => {
  const [drafts, setDrafts] = useState<ActiveWorkoutDraft[]>([]);
  const [queueEntries, setQueueEntries] = useState<WorkoutSyncQueueEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!uid) return;
    const loadedDrafts = await workoutDraftDb.listDrafts(uid);
    setDrafts(loadedDrafts);
    setQueueEntries(workoutSyncQueue.list(uid));
    setIsLoaded(true);
  }, [uid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleFocus = () => {
      void reload();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    window.addEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      window.removeEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handleFocus);
    };
  }, [reload]);

  const listedEntries = useMemo<ListedSyncEntry[]>(() => {
    const draftSessionIds = new Set(drafts.map(draft => draft.sessionId));
    const dedupedQueue = queueEntries.filter(entry => !draftSessionIds.has(entry.sessionId));
    return [...drafts, ...dedupedQueue];
  }, [drafts, queueEntries]);

  return { isLoaded, drafts, queueEntries, setDrafts, setQueueEntries, listedEntries, reload };
};
