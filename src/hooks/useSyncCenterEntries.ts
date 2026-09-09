import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { workoutSyncQueue, type WorkoutSyncQueueEntry } from '@/lib/workout-sync-queue';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';
import { isRevisionConflictError } from '@/lib/workout-sync-conflict';

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
  const [storedDrafts, storeDrafts] = useState<ActiveWorkoutDraft[]>([]);
  const [storedQueue, storeQueue] = useState<WorkoutSyncQueueEntry[]>([]);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const owner = useRef(uid);
  owner.current = uid;
  const scanVersion = useRef(0);
  const isLoaded = loadedOwner === uid;
  const drafts = useMemo(() => isLoaded ? storedDrafts : [], [isLoaded, storedDrafts]);
  const queueEntries = useMemo(() => isLoaded ? storedQueue : [], [isLoaded, storedQueue]);
  const setDrafts = useCallback<Dispatch<SetStateAction<ActiveWorkoutDraft[]>>>(next => {
    if (owner.current === uid) storeDrafts(next);
  }, [uid]);
  const setQueueEntries = useCallback<Dispatch<SetStateAction<WorkoutSyncQueueEntry[]>>>(next => {
    if (owner.current === uid) storeQueue(next);
  }, [uid]);

  const reload = useCallback(async () => {
    if (!uid) return;
    const scan = ++scanVersion.current;
    const loadedDrafts = await workoutDraftDb.listDrafts(uid);
    if (owner.current !== uid || scan !== scanVersion.current) return;
    storeDrafts(loadedDrafts);
    storeQueue(workoutSyncQueue.list(uid));
    setLoadedOwner(uid);
  }, [uid]);

  useEffect(() => {
    void reload().catch(() => {});
    return () => { scanVersion.current += 1; };
  }, [reload]);

  useEffect(() => {
    const handleFocus = () => {
      void reload().catch(() => {});
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

  // WP-C (X38): wpisy wymagające decyzji usera (błąd trwały albo konflikt
  // rewizji). Zwykłe "czeka na sieć" obsługuje AutoSync po cichu; Sync Center
  // w Profilu renderuje się TYLKO gdy ta lista jest niepusta (zasada 6: stan
  // trwały ma wyjście: Spróbuj ponownie / Usuń szkic / Eksportuj).
  const attentionEntries = useMemo<ListedSyncEntry[]>(() => {
    const attentionIds = new Set(
      queueEntries
        .filter(entry => entry.permanent || isRevisionConflictError(entry.lastError))
        .map(entry => entry.sessionId),
    );
    return listedEntries.filter(entry => attentionIds.has(entry.sessionId));
  }, [listedEntries, queueEntries]);

  return { isLoaded, drafts, queueEntries, setDrafts, setQueueEntries, listedEntries, attentionEntries, reload };
};
