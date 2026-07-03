import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Cloud, CloudOff, Download, ExternalLink, Loader2, RefreshCw, Trash2, Layers3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { workoutDraftDb, type ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { workoutSyncQueue, type WorkoutSyncQueueEntry } from '@/lib/workout-sync-queue';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { buildWorkoutWriteExpectation, matchesFinalWorkoutContent, validateWorkoutCloudWrite } from '@/lib/workout-final-sync';
import { useTranslation } from '@/contexts/LanguageContext';
import { buildSyncCenterExercisesPayload, buildSyncCenterSaveOptions } from '@/lib/sync-center-payload';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT, collectRetryableSyncEntries } from '@/lib/workout-sync-entries';
import { dateLocale } from '@/i18n';
import type { WorkoutSession } from '@/types';
import {
  classifyWorkoutSyncError,
  isRevisionConflictError,
  summarizeCloudWorkout,
  summarizeLocalDraft,
} from '@/lib/workout-sync-conflict';
import { draftWriteId } from '@/lib/workout-write-attempt';

interface SyncCenterCardProps {
  uid: string;
}

// Active draft (no retry metadata) and queued entries are rendered in one list.
// Queue-only fields are optional so the active draft is assignable too.
type ListedSyncEntry = ActiveWorkoutDraft & Partial<Pick<WorkoutSyncQueueEntry, 'retryCount' | 'lastError' | 'lastErrorAt'>>;

interface SyncConflict {
  draft: ActiveWorkoutDraft;
  source: 'active' | 'queue';
  cloud: WorkoutSession | null;
  error: string;
}

export const SyncCenterCard = ({ uid }: SyncCenterCardProps) => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const { createWorkoutSession, batchSaveWorkout, getWorkoutSessionFromServer } = useFirebaseWorkouts(uid);
  const [drafts, setDrafts] = useState<ActiveWorkoutDraft[]>([]);
  const [queueEntries, setQueueEntries] = useState<WorkoutSyncQueueEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncingSessionIds, setSyncingSessionIds] = useState<string[]>([]);
  const [discardingSessionIds, setDiscardingSessionIds] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<Record<string, SyncConflict>>({});

  const loadDraft = useCallback(async () => {
    if (!uid) return;
    const loadedDrafts = await workoutDraftDb.listDrafts(uid);
    setDrafts(loadedDrafts);
    setQueueEntries(workoutSyncQueue.list(uid));
    setIsLoaded(true);
  }, [uid]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    const handleFocus = () => {
      void loadDraft();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    window.addEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      window.removeEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, handleFocus);
    };
  }, [loadDraft]);

  const status = useCallback((targetDraft: ActiveWorkoutDraft) => (
    targetDraft.finalSyncPending
      ? { label: t('strava.statusCompletedLocally'), tone: 'bg-fitness-warning text-fitness-warning border-fitness-warning' }
      : targetDraft.sessionOrigin === 'provisional'
        ? { label: t('strava.statusLocalOnly'), tone: 'bg-fitness-cyan/15 text-fitness-cyan border-fitness-cyan/30' }
        : targetDraft.dirty
          ? { label: t('strava.statusWaitingSync'), tone: 'bg-fitness-warning/15 text-fitness-warning border-fitness-warning/30' }
          : { label: t('strava.statusSynced'), tone: 'bg-fitness-success/15 text-fitness-success border-fitness-success/30' }
  ), [t]);

  const listedEntries = useMemo<ListedSyncEntry[]>(() => {
    const draftSessionIds = new Set(drafts.map(draft => draft.sessionId));
    const dedupedQueue = queueEntries.filter(entry => !draftSessionIds.has(entry.sessionId));
    return [...drafts, ...dedupedQueue];
  }, [drafts, queueEntries]);

  const registerConflict = useCallback(async (
    targetDraft: ActiveWorkoutDraft,
    source: 'active' | 'queue',
    error: string,
    knownCloud?: WorkoutSession | null,
  ) => {
    const cloud = knownCloud === undefined
      ? await getWorkoutSessionFromServer(targetDraft.sessionId)
      : knownCloud;
    workoutSyncQueue.upsertFromDraft(targetDraft, { lastError: error });
    setQueueEntries(workoutSyncQueue.list(uid));
    setConflicts((current) => ({
      ...current,
      [targetDraft.sessionId]: { draft: targetDraft, source, cloud, error },
    }));
    trackTelemetryEvent(uid, 'revision_conflict');
  }, [getWorkoutSessionFromServer, uid]);

  const syncOne = useCallback(async (targetDraft: ActiveWorkoutDraft, source: 'active' | 'queue') => {
    let workingDraft = targetDraft;

    try {
      if (workingDraft.sessionOrigin === 'provisional') {
        if (!isOnline) {
          toast({
            title: t('strava.toastNoInternetTitle'),
            description: t('strava.toastNoInternetDesc'),
            variant: 'destructive',
          });
          return false;
        }

        const promoteResult = await createWorkoutSession(
          workingDraft.dayId,
          workingDraft.date,
          workingDraft.cycleId ?? undefined,
        );

        if (promoteResult.error || !promoteResult.session) {
          toast({
            title: t('strava.toastPromoteFailTitle'),
            description: promoteResult.error || t('strava.tryAgainShortly'),
            variant: 'destructive',
          });
          workoutSyncQueue.markRetry(uid, targetDraft.sessionId, promoteResult.error || 'PROMOTE_FAILED');
          trackTelemetryEvent(uid, 'sync_failure');
          return false;
        }

        if (source === 'active') {
          await workoutDraftDb.markPromotedToRemote(uid, promoteResult.session.id, targetDraft.sessionId, {
            updatedAt: promoteResult.session.updatedAt,
            revision: promoteResult.session.revision,
          });
          workingDraft = await workoutDraftDb.loadDraft(uid, promoteResult.session.id) ?? {
            ...workingDraft,
            sessionId: promoteResult.session.id,
            sessionOrigin: 'remote',
            remoteSessionId: promoteResult.session.id,
            updatedAt: Date.now(),
            version: workingDraft.version + 1,
            cloudUpdatedAt: promoteResult.session.updatedAt,
            cloudRevision: promoteResult.session.revision,
          };
          setDrafts(current => current.map(draft => draft.sessionId === targetDraft.sessionId ? workingDraft : draft));
        } else {
          workingDraft = {
            ...workingDraft,
            sessionId: promoteResult.session.id,
            sessionOrigin: 'remote',
            remoteSessionId: promoteResult.session.id,
            updatedAt: Date.now(),
            version: workingDraft.version + 1,
            cloudUpdatedAt: promoteResult.session.updatedAt,
            cloudRevision: promoteResult.session.revision,
          };
        }
        workoutSyncQueue.remove(uid, targetDraft.sessionId);
        if (workingDraft.finalSyncPending) {
          workoutSyncQueue.upsertFromDraft(workingDraft);
        }
        trackTelemetryEvent(uid, 'provisional_session_promoted');
      }

      const exercisesPayload = buildSyncCenterExercisesPayload(workingDraft);
      const { writeId, reused: writeIdReused } = draftWriteId(workingDraft);
      if (source === 'active' && !writeIdReused) {
        try {
          await workoutDraftDb.setPendingWrite(uid, workingDraft.sessionId, { writeId, version: workingDraft.version });
        } catch {
          // best-effort: brak persystencji pendingWriteId nie blokuje zapisu
        }
      }
      const saveOptions = { ...buildSyncCenterSaveOptions(workingDraft), writeId };
      const expectation = buildWorkoutWriteExpectation(exercisesPayload, saveOptions);
      const shouldReadServerFirst = workingDraft.finalSyncPending
        || (workingDraft.sessionOrigin === 'remote' && workingDraft.cloudRevision === undefined);
      const existingFinalWorkout = shouldReadServerFirst
        ? await getWorkoutSessionFromServer(workingDraft.sessionId)
        : null;
      const alreadyFinalized = matchesFinalWorkoutContent(existingFinalWorkout, expectation);
      if (
        workingDraft.sessionOrigin === 'remote'
        && workingDraft.cloudRevision === undefined
        && !alreadyFinalized
      ) {
        await registerConflict(
          workingDraft,
          source,
          existingFinalWorkout ? 'WORKOUT_REVISION_UNKNOWN' : 'WORKOUT_NOT_FOUND',
          existingFinalWorkout,
        );
        return false;
      }
      const result = alreadyFinalized
        ? {
          success: true,
          updatedAt: existingFinalWorkout?.updatedAt,
          revision: existingFinalWorkout?.revision,
        }
        : await batchSaveWorkout(workingDraft.sessionId, exercisesPayload, saveOptions);

      if (!result.success) {
        if (isRevisionConflictError(result.error)) {
          await registerConflict(workingDraft, source, result.error || 'WORKOUT_CONFLICT');
          return false;
        }
        toast({
          title: t('strava.toastSyncFailTitle'),
          description: result.error || t('strava.tryAgainShortly'),
          variant: 'destructive',
        });
        if (source === 'queue') {
          workoutSyncQueue.markRetry(uid, targetDraft.sessionId, result.error || 'SYNC_FAILED');
        }
        trackTelemetryEvent(uid, 'sync_failure');
        return false;
      }

      if (workingDraft.finalSyncPending) {
        const confirmedWorkout = alreadyFinalized
          ? existingFinalWorkout
          : await getWorkoutSessionFromServer(workingDraft.sessionId);
        const validation = alreadyFinalized
          ? { ok: true }
          : validateWorkoutCloudWrite(confirmedWorkout, expectation);

        if (!validation.ok) {
          const errorMessage = t('strava.cloudNotConfirmed', { reason: validation.reason ?? 'unknown' });
          toast({
            title: t('strava.toastUnconfirmedTitle'),
            description: t('strava.toastUnconfirmedDesc'),
            variant: 'destructive',
          });
          workoutSyncQueue.upsertFromDraft(workingDraft, { lastError: errorMessage });
          trackTelemetryEvent(uid, 'sync_validation_failed');
          return false;
        }

        if (source === 'active') {
          await workoutDraftDb.clearActiveDraft(uid, workingDraft.sessionId);
          setDrafts(current => current.filter(draft => draft.sessionId !== workingDraft.sessionId));
        }
        workoutSyncQueue.remove(uid, targetDraft.sessionId);
        workoutSyncQueue.remove(uid, workingDraft.sessionId);
        setQueueEntries(workoutSyncQueue.list(uid));
        window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
        toast({
          title: t('strava.toastWorkoutSyncedTitle'),
          description: t('strava.toastWorkoutSyncedDesc'),
        });
        trackTelemetryEvent(uid, 'sync_success');
        return true;
      }

      if (source === 'active') {
        await workoutDraftDb.markDraftSynced(uid, Date.now(), workingDraft.version, workingDraft.sessionId, {
          updatedAt: result.updatedAt,
          revision: result.revision,
        });
      }
      workoutSyncQueue.remove(uid, targetDraft.sessionId);
      await loadDraft();
      window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
      toast({
        title: t('strava.toastSyncDoneTitle'),
        description: t('strava.toastSyncDoneDesc'),
      });
      trackTelemetryEvent(uid, 'sync_success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('strava.syncDraftFailed');
      toast({
        title: t('strava.toastSyncErrorTitle'),
        description: message,
        variant: 'destructive',
      });
      if (source === 'queue') {
        workoutSyncQueue.markRetry(uid, targetDraft.sessionId, message);
      }
      trackTelemetryEvent(uid, 'sync_failure');
      return false;
    } finally {
      setQueueEntries(workoutSyncQueue.list(uid));
    }
  }, [batchSaveWorkout, createWorkoutSession, getWorkoutSessionFromServer, isOnline, loadDraft, registerConflict, toast, uid, t]);

  const handleKeepLocal = useCallback(async (conflict: SyncConflict) => {
    const sessionId = conflict.draft.sessionId;
    if (syncingSessionIds.includes(sessionId)) return;
    setSyncingSessionIds((current) => [...current, sessionId]);
    try {
      const cloud = await getWorkoutSessionFromServer(sessionId);
      if (!cloud) {
        await registerConflict(conflict.draft, conflict.source, 'WORKOUT_NOT_FOUND', null);
        return;
      }

      const exercises = buildSyncCenterExercisesPayload(conflict.draft);
      const options = {
        ...buildSyncCenterSaveOptions(conflict.draft),
        expectedRevision: cloud.revision ?? 0,
        // keepLocal: baseline świeżo z serwera, świadome nadpisanie — nowa próba, nowy klucz.
        writeId: crypto.randomUUID(),
      };
      const expectation = buildWorkoutWriteExpectation(exercises, options);
      const result = await batchSaveWorkout(sessionId, exercises, options);
      if (!result.success) {
        if (isRevisionConflictError(result.error)) {
          await registerConflict(conflict.draft, conflict.source, result.error || 'WORKOUT_CONFLICT');
        } else {
          workoutSyncQueue.upsertFromDraft(conflict.draft, { lastError: result.error || 'SYNC_FAILED' });
        }
        return;
      }

      if (conflict.draft.finalSyncPending) {
        const confirmed = await getWorkoutSessionFromServer(sessionId);
        const validation = validateWorkoutCloudWrite(confirmed, expectation);
        if (!validation.ok) {
          workoutSyncQueue.upsertFromDraft(conflict.draft, {
            lastError: `VALIDATION_FAILED:${validation.reason ?? 'unknown'}`,
          });
          trackTelemetryEvent(uid, 'sync_validation_failed');
          return;
        }
        if (conflict.source === 'active') {
          await workoutDraftDb.clearActiveDraft(uid, sessionId);
        }
      } else if (conflict.source === 'active') {
        await workoutDraftDb.markDraftSynced(
          uid,
          Date.now(),
          conflict.draft.version,
          sessionId,
          { updatedAt: result.updatedAt, revision: result.revision },
        );
      }

      workoutSyncQueue.remove(uid, sessionId);
      setConflicts((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
      await loadDraft();
      window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
      trackTelemetryEvent(uid, 'sync_success');
      toast({
        title: t('strava.toastWorkoutSyncedTitle'),
        description: t('strava.toastWorkoutSyncedDesc'),
      });
    } finally {
      setSyncingSessionIds((current) => current.filter((id) => id !== sessionId));
      setQueueEntries(workoutSyncQueue.list(uid));
    }
  }, [
    batchSaveWorkout,
    getWorkoutSessionFromServer,
    loadDraft,
    registerConflict,
    syncingSessionIds,
    t,
    toast,
    uid,
  ]);

  const handleKeepCloud = useCallback(async (conflict: SyncConflict) => {
    const sessionId = conflict.draft.sessionId;
    if (discardingSessionIds.includes(sessionId)) return;
    setDiscardingSessionIds((current) => [...current, sessionId]);
    try {
      const confirmedCloud = await getWorkoutSessionFromServer(sessionId);
      if (!confirmedCloud) {
        await registerConflict(conflict.draft, conflict.source, 'WORKOUT_NOT_FOUND', null);
        return;
      }
      if (conflict.source === 'active') {
        await workoutDraftDb.clearActiveDraft(uid, sessionId);
      }
      workoutSyncQueue.remove(uid, sessionId);
      setConflicts((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
      await loadDraft();
      window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
      toast({
        title: t('strava.cloudVersionKeptTitle'),
        description: t('strava.cloudVersionKeptDesc'),
      });
    } finally {
      setDiscardingSessionIds((current) => current.filter((id) => id !== sessionId));
      setQueueEntries(workoutSyncQueue.list(uid));
    }
  }, [
    discardingSessionIds,
    getWorkoutSessionFromServer,
    loadDraft,
    registerConflict,
    t,
    toast,
    uid,
  ]);

  const handleRetrySync = async (targetDraft: ActiveWorkoutDraft, source: 'active' | 'queue') => {
    if (syncingSessionIds.includes(targetDraft.sessionId)) return;
    setSyncingSessionIds(prev => [...prev, targetDraft.sessionId]);
    trackTelemetryEvent(uid, 'sync_retry_manual');
    try {
      await syncOne(targetDraft, source);
    } finally {
      setSyncingSessionIds(prev => prev.filter(sessionId => sessionId !== targetDraft.sessionId));
    }
  };

  const handleRetryAll = async () => {
    const retryTargets = collectRetryableSyncEntries(drafts, queueEntries);
    if (retryTargets.length === 0) return;

    trackTelemetryEvent(uid, 'sync_retry_batch', retryTargets.length);

    for (const { entry, source } of retryTargets) {
      setSyncingSessionIds(prev => [...prev, entry.sessionId]);
      try {
        await syncOne(entry, source);
      } finally {
        setSyncingSessionIds(prev => prev.filter(sessionId => sessionId !== entry.sessionId));
      }
    }
  };

  const handleDiscardDraft = async (targetDraft: ActiveWorkoutDraft, source: 'active' | 'queue') => {
    if (discardingSessionIds.includes(targetDraft.sessionId)) return;

    setDiscardingSessionIds(prev => [...prev, targetDraft.sessionId]);
    try {
      if (source === 'active') {
        await workoutDraftDb.clearActiveDraft(uid, targetDraft.sessionId);
        setDrafts(current => current.filter(draft => draft.sessionId !== targetDraft.sessionId));
      }
      workoutSyncQueue.remove(uid, targetDraft.sessionId);
      setQueueEntries(workoutSyncQueue.list(uid));
      window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
      toast({
        title: t('strava.toastDraftDiscardedTitle'),
        description: t('strava.toastDraftDiscardedDesc'),
      });
    } catch {
      toast({
        title: t('strava.toastDiscardFailTitle'),
        description: t('strava.tryAgainShortly'),
        variant: 'destructive',
      });
    } finally {
      setDiscardingSessionIds(prev => prev.filter(sessionId => sessionId !== targetDraft.sessionId));
    }
  };

  const handleOpenWorkout = (targetDraft: ActiveWorkoutDraft) => {
    navigate(`/workout/${targetDraft.dayId}?date=${targetDraft.date}&session=${targetDraft.sessionId}`);
  };

  const handleExportDraft = (targetDraft: ActiveWorkoutDraft) => {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      source: 'strength-save-sync-center',
      draft: targetDraft,
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `strength-save-draft-${targetDraft.date}-${targetDraft.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isOnline ? <Cloud className="h-5 w-5 text-primary" /> : <CloudOff className="h-5 w-5 text-muted-foreground" />}
          {t('strava.syncCenter')}
        </CardTitle>
        <CardDescription>
          {t('strava.syncCenterDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLoaded ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : listedEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {t('strava.noPendingSessions')}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Layers3 className="h-4 w-4 text-primary" />
                <span>{listedEntries.length === 1 ? t('strava.pendingSessionsOne', { n: listedEntries.length }) : t('strava.pendingSessionsMany', { n: listedEntries.length })}</span>
                <Badge variant="secondary">{isOnline ? t('strava.online') : t('strava.offline')}</Badge>
              </div>
              <Button
                onClick={handleRetryAll}
                disabled={!isOnline || listedEntries.every(entry => syncingSessionIds.includes(entry.sessionId))}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('strava.retryAll')}
              </Button>
            </div>

            <div className="space-y-3">
              {listedEntries.map((entry) => {
                const entryStatus = status(entry);
                const isActiveEntry = drafts.some(draft => draft.sessionId === entry.sessionId);
                const isSyncing = syncingSessionIds.includes(entry.sessionId);
                const isDiscarding = discardingSessionIds.includes(entry.sessionId);
                const source = isActiveEntry ? 'active' : 'queue';

                return (
                  <div key={entry.sessionId} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn('border', entryStatus.tone)}>
                        {entryStatus.label}
                      </Badge>
                      {isActiveEntry && <Badge>{t('strava.activeDraft')}</Badge>}
                      {!isActiveEntry && <Badge variant="secondary">{t('strava.queue')}</Badge>}
                      {(entry.retryCount ?? 0) > 0 && (
                        <Badge variant="secondary">{t('strava.retryCount', { n: entry.retryCount ?? 0 })}</Badge>
                      )}
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">{t('strava.fieldDay')}</span> {entry.dayId}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('strava.fieldDate')}</span> {entry.date}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('strava.fieldSession')}</span> {entry.sessionOrigin === 'provisional' ? t('strava.sessionProvisional') : t('strava.sessionRemote')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('strava.fieldLastChange')}</span> {new Date(entry.updatedAt).toLocaleString(dateLocale(lang))}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {entry.sessionOrigin === 'provisional'
                        ? t('strava.descProvisional')
                        : entry.finalSyncPending
                          ? t('strava.descFinalPending')
                          : entry.dirty
                            ? t('strava.descDirty')
                            : t('strava.descSynced')}
                    </p>

                    {entry.lastError && (
                      <div className="space-y-1 text-xs text-destructive">
                        <p>{t('strava.lastError', { msg: entry.lastError })}</p>
                        <p>
                          {t('strava.errorCode', { code: classifyWorkoutSyncError(entry.lastError) })}
                          {entry.lastErrorAt
                            ? ` · ${new Date(entry.lastErrorAt).toLocaleString(dateLocale(lang))}`
                            : ''}
                        </p>
                      </div>
                    )}

                    {conflicts[entry.sessionId] && (() => {
                      const conflict = conflicts[entry.sessionId];
                      const localSummary = summarizeLocalDraft(conflict.draft);
                      const cloudSummary = summarizeCloudWorkout(conflict.cloud);
                      return (
                        <div className="space-y-3 rounded-lg border border-fitness-warning/40 bg-fitness-warning/5 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-fitness-warning" />
                            <div>
                              <p className="text-sm font-medium">{t('strava.conflictTitle')}</p>
                              <p className="text-xs text-muted-foreground">{t('strava.conflictDesc')}</p>
                            </div>
                          </div>
                          <div className="grid gap-2 text-xs sm:grid-cols-2">
                            <div className="rounded border bg-background p-2">
                              <p className="font-medium">{t('strava.localVersion')}</p>
                              <p>{t('strava.versionSummary', {
                                exercises: localSummary.exercises,
                                sets: localSummary.completedSets,
                              })}</p>
                            </div>
                            <div className="rounded border bg-background p-2">
                              <p className="font-medium">{t('strava.cloudVersion')}</p>
                              <p>{cloudSummary
                                ? t('strava.versionSummary', {
                                  exercises: cloudSummary.exercises,
                                  sets: cloudSummary.completedSets,
                                })
                                : t('strava.cloudVersionMissing')}</p>
                            </div>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              onClick={() => void handleKeepLocal(conflict)}
                              disabled={isSyncing || !conflict.cloud}
                            >
                              {t('workout.conflict.keepMine')}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => void handleKeepCloud(conflict)}
                              disabled={isDiscarding || !conflict.cloud}
                            >
                              {t('workout.conflict.useCloud')}
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid gap-2 sm:grid-cols-4">
                      <Button variant="outline" onClick={() => handleOpenWorkout(entry)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('strava.openWorkout')}
                      </Button>
                      <Button variant="outline" onClick={() => handleExportDraft(entry)}>
                        <Download className="h-4 w-4 mr-2" />
                        {t('strava.exportJson')}
                      </Button>
                      <Button
                        onClick={() => void handleRetrySync(entry, source)}
                        disabled={isSyncing || (!isOnline && entry.sessionOrigin === 'provisional')}
                      >
                        {isSyncing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {t('strava.syncNow')}
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => void handleDiscardDraft(entry, source)}
                        disabled={isDiscarding}
                      >
                        {isDiscarding ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        {t('strava.deleteDraft')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
