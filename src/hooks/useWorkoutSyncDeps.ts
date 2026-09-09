import { useEffect, useMemo, useRef } from 'react';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import type { WorkoutSyncDeps } from '@/lib/workout-sync-engine';

// Dashboard retry and reconnect use the same durable engine as WorkoutDay.
// Keep the original draft grant, revision and writeId; never repair a conflict
// by replacing its baseline. A stale owner cannot begin another adapter step.
export const useWorkoutSyncDeps = (uid: string) => {
  const owner = useRef(uid);
  owner.current = uid;
  const mounted = useRef(true);
  useEffect(() => {
    // StrictMode replays setup after cleanup; logout leaves the old adapter
    // permanently inactive even if a different account mounts a fresh hook.
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const { createWorkoutSession, batchSaveWorkout, getWorkoutSessionFromServer, workouts, isLoaded } =
    useFirebaseWorkouts(uid, { measurements: 'none', workouts: 'recent' });

  const syncDeps = useMemo<WorkoutSyncDeps>(() => {
    const assertOwner = (ownerId = uid) => {
      if (!mounted.current || !uid || owner.current !== uid || ownerId !== uid) throw new Error('WORKOUT_SYNC_OWNER_CHANGED');
    };
    return {
      loadDraft: (ownerId, sessionId) => { assertOwner(ownerId); return workoutDraftDb.loadDraft(ownerId, sessionId); },
      saveWorkout: (...args) => { assertOwner(); return batchSaveWorkout(...args); },
      getFromServer: sessionId => { assertOwner(); return getWorkoutSessionFromServer(sessionId); },
      createSession: (...args) => { assertOwner(); return createWorkoutSession(...args); },
      markPromoted: (ownerId, ...args) => { assertOwner(ownerId); return workoutDraftDb.markPromotedToRemote(ownerId, ...args); },
      markSynced: (ownerId, ...args) => { assertOwner(ownerId); return workoutDraftDb.markDraftSynced(ownerId, ...args); },
      setCloudBaseline: (ownerId, ...args) => { assertOwner(ownerId); return workoutDraftDb.setCloudBaseline(ownerId, ...args); },
      setPendingWrite: (ownerId, ...args) => { assertOwner(ownerId); return workoutDraftDb.setPendingWrite(ownerId, ...args); },
      markHealthPending: (ownerId, ...args) => { assertOwner(ownerId); return workoutDraftDb.markHealthWritePending(ownerId, ...args); },
      clearDraftIfVersion: (ownerId, ...args) => { assertOwner(ownerId); return workoutDraftDb.clearActiveDraftIfVersion(ownerId, ...args); },
      queue: {
        remove: (ownerId, sessionId) => { assertOwner(ownerId); workoutSyncQueue.remove(ownerId, sessionId); },
        upsertFromDraft: (draft, options) => { assertOwner(draft.userId); return workoutSyncQueue.upsertFromDraft(draft, options); },
      },
      // A reconnect/resume or explicit retry is the probe. WKWebView can keep
      // navigator.onLine=false after native connectivity has already returned.
      isOnline: () => true,
    };
  }, [uid, batchSaveWorkout, createWorkoutSession, getWorkoutSessionFromServer]);

  return { syncDeps, workouts, isLoaded };
};
