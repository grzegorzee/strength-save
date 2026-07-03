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
import { useTranslation } from '@/contexts/LanguageContext';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT, collectRetryableSyncEntries, recordWorkoutSyncFailure } from '@/lib/workout-sync-entries';
import { dateLocale } from '@/i18n';
import type { WorkoutSession } from '@/types';
import {
  classifyWorkoutSyncError,
  summarizeCloudWorkout,
  summarizeLocalDraft,
  workoutSyncErrorMessageKey,
} from '@/lib/workout-sync-conflict';
import { syncWorkoutSession, type WorkoutSyncDeps } from '@/lib/workout-sync-engine';
import { reportClientError } from '@/lib/error-telemetry';

interface SyncCenterCardProps {
  uid: string;
}

// Active draft (no retry metadata) and queued entries are rendered in one list.
// Wspólne pola obu kształtów; treść (serie/notatki) żyje wyłącznie w drafcie.
type ListedSyncEntry = {
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

  // Zależności silnika syncu — Sync Center jest tylko adapterem UI.
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
    clearDraftIfVersion: (ownerId, sessionId, expectedVersion) =>
      workoutDraftDb.clearActiveDraftIfVersion(ownerId, sessionId, expectedVersion),
    queue: workoutSyncQueue,
  }), [batchSaveWorkout, getWorkoutSessionFromServer, createWorkoutSession]);

  const status = useCallback((targetDraft: ListedSyncEntry) => (
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
    // Konflikt wykryty PODCZAS syncu raportuje fazę tego syncu; 'conflict-resolve'
    // zostaje dla akcji rozwiązywania konfliktu przez usera (R2-19).
    phase: 'checkpoint' | 'final' | 'conflict-resolve' = 'conflict-resolve',
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
    void reportClientError(uid, {
      code: classifyWorkoutSyncError(error),
      phase,
      detail: error,
      sessionId: targetDraft.sessionId,
    });
  }, [getWorkoutSessionFromServer, uid]);

  const syncOne = useCallback(async (entry: ListedSyncEntry, source: 'active' | 'queue') => {
    try {
      if (entry.sessionOrigin === 'provisional' && !isOnline) {
        toast({
          title: t('strava.toastNoInternetTitle'),
          description: t('strava.toastNoInternetDesc'),
          variant: 'destructive',
        });
        return false;
      }

      const outcome = await syncWorkoutSession(uid, entry.sessionId, 'checkpoint', syncDeps);

      if (outcome.promotedSessionId) {
        trackTelemetryEvent(uid, 'provisional_session_promoted');
      }

      if (!outcome.success) {
        if (outcome.conflict) {
          const conflictDraft = await workoutDraftDb.loadDraft(uid, outcome.sessionId);
          if (conflictDraft) {
            // Konflikt wykryty w trakcie syncu (kind=checkpoint), nie przy resolve.
            await registerConflict(conflictDraft, source, outcome.error || 'WORKOUT_CONFLICT', undefined, 'checkpoint');
          } else {
            workoutSyncQueue.markRetry(uid, outcome.sessionId, outcome.error || 'WORKOUT_CONFLICT');
          }
          return false;
        }
        toast({
          title: t('strava.toastSyncFailTitle'),
          description: t(workoutSyncErrorMessageKey(outcome.error)),
          variant: 'destructive',
        });
        // Porażka pod DOCELOWYM sessionId (po promocji NOWY id, R2-16).
        await recordWorkoutSyncFailure(uid, outcome, outcome.error || 'SYNC_FAILED', {
          queue: workoutSyncQueue,
          loadDraft: (ownerId, sessionId) => workoutDraftDb.loadDraft(ownerId, sessionId),
        });
        trackTelemetryEvent(
          uid,
          outcome.error?.startsWith('CLOUD_NOT_CONFIRMED') ? 'sync_validation_failed' : 'sync_failure',
        );
        void reportClientError(uid, {
          code: classifyWorkoutSyncError(outcome.error),
          // syncOne wykonuje checkpoint — raportuj rzeczywisty kind (R2-19).
          phase: 'checkpoint',
          detail: outcome.error,
          sessionId: outcome.sessionId,
        });
        return false;
      }

      await loadDraft();
      window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
      if (!outcome.skipped) {
        toast({
          title: t('strava.toastSyncDoneTitle'),
          description: t('strava.toastSyncDoneDesc'),
        });
        trackTelemetryEvent(uid, 'sync_success');
      }
      return true;
    } finally {
      setQueueEntries(workoutSyncQueue.list(uid));
    }
  }, [isOnline, loadDraft, registerConflict, syncDeps, toast, uid, t]);

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

      // Świadome nadpisanie wersji z chmury: baseline draftu podbity do stanu
      // serwera, potem zwykły sync silnikiem (precondition przechodzi).
      await workoutDraftDb.setCloudBaseline(uid, sessionId, {
        revision: Math.max(0, Math.floor(cloud.revision ?? 0)),
        ...(cloud.updatedAt !== undefined && { updatedAt: cloud.updatedAt }),
      });
      const outcome = await syncWorkoutSession(uid, sessionId, 'checkpoint', syncDeps);
      if (!outcome.success) {
        if (outcome.conflict) {
          const freshDraft = await workoutDraftDb.loadDraft(uid, sessionId);
          if (freshDraft) {
            await registerConflict(freshDraft, conflict.source, outcome.error || 'WORKOUT_CONFLICT');
          }
        } else {
          workoutSyncQueue.markRetry(uid, outcome.sessionId, outcome.error || 'SYNC_FAILED');
          toast({
            title: t('strava.toastSyncFailTitle'),
            description: t(workoutSyncErrorMessageKey(outcome.error)),
            variant: 'destructive',
          });
          if (outcome.error?.startsWith('CLOUD_NOT_CONFIRMED')) {
            trackTelemetryEvent(uid, 'sync_validation_failed');
          }
        }
        return;
      }

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
    getWorkoutSessionFromServer,
    loadDraft,
    registerConflict,
    syncDeps,
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

  const handleRetrySync = async (entry: ListedSyncEntry, source: 'active' | 'queue') => {
    if (syncingSessionIds.includes(entry.sessionId)) return;
    setSyncingSessionIds(prev => [...prev, entry.sessionId]);
    trackTelemetryEvent(uid, 'sync_retry_manual');
    try {
      await syncOne(entry, source);
    } finally {
      setSyncingSessionIds(prev => prev.filter(sessionId => sessionId !== entry.sessionId));
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

  const handleDiscardDraft = async (targetDraft: ListedSyncEntry, source: 'active' | 'queue') => {
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

  const handleOpenWorkout = (entry: ListedSyncEntry) => {
    navigate(`/workout/${entry.dayId}?date=${entry.date}&session=${entry.sessionId}`);
  };

  const handleExportDraft = async (entry: ListedSyncEntry) => {
    // Treść żyje w drafcie IndexedDB — wpis kolejki to tylko referencja.
    const fullDraft = drafts.find(draft => draft.sessionId === entry.sessionId)
      ?? await workoutDraftDb.loadDraft(uid, entry.sessionId);
    if (!fullDraft) {
      toast({
        title: t('strava.toastDiscardFailTitle'),
        description: t('strava.tryAgainShortly'),
        variant: 'destructive',
      });
      return;
    }
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      source: 'strength-save-sync-center',
      draft: fullDraft,
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `strength-save-draft-${fullDraft.date}-${fullDraft.sessionId}.json`;
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
                        <p>{t('strava.lastError', { msg: t(workoutSyncErrorMessageKey(entry.lastError)) })}</p>
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
                      <Button variant="outline" onClick={() => void handleExportDraft(entry)}>
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
