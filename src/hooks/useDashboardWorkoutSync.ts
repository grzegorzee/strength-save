import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSyncCenterEntries } from '@/hooks/useSyncCenterEntries';
import { useWorkoutSyncDeps } from '@/hooks/useWorkoutSyncDeps';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { syncWorkoutSession } from '@/lib/workout-sync-engine';
import {
  recordWorkoutSyncFailure,
  syncKindForEntry,
  WORKOUT_SYNC_STATE_CHANGED_EVENT,
} from '@/lib/workout-sync-entries';

export const useDashboardWorkoutSync = (uid: string) => {
  const { listedEntries, attentionEntries, queueEntries, reload } = useSyncCenterEntries(uid);
  const { syncDeps } = useWorkoutSyncDeps(uid);
  const owner = useMemo(() => ({ uid }), [uid]);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const mounted = useRef(true);
  const running = useRef<typeof owner | null>(null);
  const [status, setStatus] = useState<{ owner: typeof owner; phase: 'syncing' | 'failed' } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const pendingEntries = useMemo(() => listedEntries.filter(entry => (
    entry.dirty || entry.finalSyncPending || entry.sessionOrigin === 'provisional'
  )), [listedEntries]);
  const pendingIds = new Set(pendingEntries.map(entry => entry.sessionId));
  const needsAttention = attentionEntries.some(entry => pendingIds.has(entry.sessionId));
  const busy = status?.owner === owner && status.phase === 'syncing';
  const failed = (status?.owner === owner && status.phase === 'failed')
    || queueEntries.some(entry => pendingIds.has(entry.sessionId) && !!entry.lastError);

  const retry = useCallback(async () => {
    if (!uid || running.current === owner || pendingEntries.length === 0) return;
    running.current = owner;
    setStatus({ owner, phase: 'syncing' });
    const isCurrent = () => mounted.current && currentOwner.current === owner;
    let incomplete = false;
    try {
      // A deliberate retry also tries permanent failures. The engine retains
      // their original revision/writeId; only the recovery dialog may resolve
      // a conflict by an explicit user choice.
      for (const entry of pendingEntries) {
        if (!isCurrent()) return;
        const outcome = await syncWorkoutSession(uid, entry.sessionId, syncKindForEntry(entry), syncDeps);
        if (!isCurrent()) return;
        if (!outcome.success) {
          incomplete = true;
          await recordWorkoutSyncFailure(uid, outcome, outcome.error || 'SYNC_FAILED', {
            queue: workoutSyncQueue,
            loadDraft: (ownerId, sessionId) => workoutDraftDb.loadDraft(ownerId, sessionId),
          });
        }
        if (outcome.healthWritePending || outcome.draftRetained || outcome.cleanupFailed || outcome.markSyncedFailed) {
          incomplete = true;
        }
      }
    } catch {
      // A storage/transport failure cannot dismiss the banner or discard data.
      incomplete = true;
    } finally {
      if (running.current === owner) running.current = null;
      if (isCurrent()) {
        setStatus(incomplete ? { owner, phase: 'failed' } : null);
        // Re-read durable state: an ACK can still retain a newer local version.
        await reload().catch(() => setStatus({ owner, phase: 'failed' }));
        if (isCurrent()) window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
      }
    }
  }, [uid, owner, pendingEntries, reload, syncDeps]);

  return { pending: pendingEntries.length > 0, busy, failed, needsAttention, retry };
};
