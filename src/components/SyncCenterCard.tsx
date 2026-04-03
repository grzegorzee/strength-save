import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, CloudOff, ExternalLink, Loader2, RefreshCw, Trash2, Layers3 } from 'lucide-react';
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

interface SyncCenterCardProps {
  uid: string;
}

const buildExercisesPayload = (draft: ActiveWorkoutDraft) => (
  Object.entries(draft.exerciseSets).map(([exerciseId, sets]) => ({
    exerciseId,
    sets,
    ...(draft.exerciseNotes[exerciseId] && { notes: draft.exerciseNotes[exerciseId] }),
  }))
);

export const SyncCenterCard = ({ uid }: SyncCenterCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const { createWorkoutSession, batchSaveWorkout } = useFirebaseWorkouts(uid);
  const [draft, setDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [queueEntries, setQueueEntries] = useState<WorkoutSyncQueueEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncingSessionIds, setSyncingSessionIds] = useState<string[]>([]);
  const [discardingSessionIds, setDiscardingSessionIds] = useState<string[]>([]);

  const loadDraft = useCallback(async () => {
    if (!uid) return;
    const loadedDraft = await workoutDraftDb.loadActiveDraft(uid);
    setDraft(loadedDraft);
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
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [loadDraft]);

  const status = useCallback((targetDraft: ActiveWorkoutDraft) => (
    targetDraft.finalSyncPending
      ? { label: 'Zakończony lokalnie', tone: 'bg-amber-100 text-amber-800 border-amber-200' }
      : targetDraft.sessionOrigin === 'provisional'
        ? { label: 'Tylko lokalnie', tone: 'bg-sky-100 text-sky-800 border-sky-200' }
        : targetDraft.dirty
          ? { label: 'Czeka na synchronizację', tone: 'bg-orange-100 text-orange-800 border-orange-200' }
          : { label: 'Zsynchronizowany', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  ), []);

  const listedEntries = useMemo(() => {
    const dedupedQueue = queueEntries.filter(entry => entry.sessionId !== draft?.sessionId);
    return draft ? [draft, ...dedupedQueue] : dedupedQueue;
  }, [draft, queueEntries]);

  const syncOne = useCallback(async (targetDraft: ActiveWorkoutDraft, source: 'active' | 'queue') => {
    let workingDraft = targetDraft;

    try {
      if (workingDraft.sessionOrigin === 'provisional') {
        if (!isOnline) {
          toast({
            title: 'Brak internetu',
            description: 'Ta sesja istnieje tylko lokalnie. Synchronizacja ruszy po odzyskaniu połączenia.',
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
            title: 'Nie udało się utworzyć sesji w chmurze',
            description: promoteResult.error || 'Spróbuj ponownie za chwilę.',
            variant: 'destructive',
          });
          workoutSyncQueue.markRetry(uid, targetDraft.sessionId, promoteResult.error || 'PROMOTE_FAILED');
          trackTelemetryEvent(uid, 'sync_failure');
          return false;
        }

        workingDraft = {
          ...workingDraft,
          sessionId: promoteResult.session.id,
          sessionOrigin: 'remote',
          remoteSessionId: promoteResult.session.id,
          updatedAt: Date.now(),
          version: workingDraft.version + 1,
        };

        if (source === 'active') {
          await workoutDraftDb.saveActiveDraft(workingDraft);
          setDraft(workingDraft);
        }
        workoutSyncQueue.remove(uid, targetDraft.sessionId);
        if (workingDraft.finalSyncPending) {
          workoutSyncQueue.upsertFromDraft(workingDraft);
        }
        trackTelemetryEvent(uid, 'provisional_session_promoted');
      }

      const result = await batchSaveWorkout(workingDraft.sessionId, buildExercisesPayload(workingDraft), {
        notes: workingDraft.dayNotes || undefined,
        skippedExercises: workingDraft.skippedExercises.length > 0 ? workingDraft.skippedExercises : undefined,
        ...(workingDraft.finalSyncPending && { completed: true }),
      });

      if (!result.success) {
        toast({
          title: 'Synchronizacja nie powiodła się',
          description: result.error || 'Spróbuj ponownie za chwilę.',
          variant: 'destructive',
        });
        if (source === 'queue') {
          workoutSyncQueue.markRetry(uid, targetDraft.sessionId, result.error || 'SYNC_FAILED');
        }
        trackTelemetryEvent(uid, 'sync_failure');
        return false;
      }

      if (workingDraft.finalSyncPending) {
        if (source === 'active') {
          await workoutDraftDb.clearActiveDraft(uid);
          setDraft(null);
        }
        workoutSyncQueue.remove(uid, targetDraft.sessionId);
        workoutSyncQueue.remove(uid, workingDraft.sessionId);
        setQueueEntries(workoutSyncQueue.list(uid));
        toast({
          title: 'Trening zsynchronizowany',
          description: 'Lokalny szkic został zapisany w chmurze i usunięty z kolejki.',
        });
        trackTelemetryEvent(uid, 'sync_success');
        return true;
      }

      if (source === 'active') {
        await workoutDraftDb.markDraftSynced(uid, Date.now());
      }
      workoutSyncQueue.remove(uid, targetDraft.sessionId);
      await loadDraft();
      toast({
        title: 'Synchronizacja zakończona',
        description: 'Lokalny szkic został zsynchronizowany z chmurą.',
      });
      trackTelemetryEvent(uid, 'sync_success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zsynchronizować lokalnego szkicu.';
      toast({
        title: 'Błąd synchronizacji',
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
  }, [batchSaveWorkout, createWorkoutSession, isOnline, loadDraft, toast, uid]);

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
    const retryTargets = listedEntries.filter(entry => entry.dirty || entry.finalSyncPending || entry.sessionOrigin === 'provisional');
    if (retryTargets.length === 0) return;

    trackTelemetryEvent(uid, 'sync_retry_batch', retryTargets.length);

    for (const entry of retryTargets) {
      setSyncingSessionIds(prev => [...prev, entry.sessionId]);
      try {
        await syncOne(entry, draft?.sessionId === entry.sessionId ? 'active' : 'queue');
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
        await workoutDraftDb.clearActiveDraft(uid);
        setDraft(null);
      }
      workoutSyncQueue.remove(uid, targetDraft.sessionId);
      setQueueEntries(workoutSyncQueue.list(uid));
      toast({
        title: 'Usunięto lokalny szkic',
        description: 'Sesja została usunięta z urządzenia i kolejki synchronizacji.',
      });
    } catch {
      toast({
        title: 'Nie udało się usunąć szkicu',
        description: 'Spróbuj ponownie za chwilę.',
        variant: 'destructive',
      });
    } finally {
      setDiscardingSessionIds(prev => prev.filter(sessionId => sessionId !== targetDraft.sessionId));
    }
  };

  const handleOpenWorkout = (targetDraft: ActiveWorkoutDraft) => {
    navigate(`/workout/${targetDraft.dayId}?date=${targetDraft.date}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isOnline ? <Cloud className="h-5 w-5 text-primary" /> : <CloudOff className="h-5 w-5 text-muted-foreground" />}
          Sync Center
        </CardTitle>
        <CardDescription>
          Podgląd aktywnego szkicu i kolejki sesji oczekujących na zapis w Firebase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLoaded ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : listedEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Brak aktywnych lokalnych szkiców ani sesji w kolejce. Wszystkie treningi są zsynchronizowane.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Layers3 className="h-4 w-4 text-primary" />
                <span>{listedEntries.length} {listedEntries.length === 1 ? 'sesja oczekująca' : 'sesje oczekujące'}</span>
                <Badge variant="secondary">{isOnline ? 'Online' : 'Offline'}</Badge>
              </div>
              <Button
                onClick={handleRetryAll}
                disabled={!isOnline || listedEntries.every(entry => syncingSessionIds.includes(entry.sessionId))}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry all
              </Button>
            </div>

            <div className="space-y-3">
              {listedEntries.map((entry) => {
                const entryStatus = status(entry);
                const isActiveEntry = draft?.sessionId === entry.sessionId;
                const isSyncing = syncingSessionIds.includes(entry.sessionId);
                const isDiscarding = discardingSessionIds.includes(entry.sessionId);
                const source = isActiveEntry ? 'active' : 'queue';

                return (
                  <div key={entry.sessionId} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn('border', entryStatus.tone)}>
                        {entryStatus.label}
                      </Badge>
                      {isActiveEntry && <Badge>Aktywny szkic</Badge>}
                      {!isActiveEntry && <Badge variant="secondary">Kolejka</Badge>}
                      {entry.retryCount > 0 && (
                        <Badge variant="secondary">Retry {entry.retryCount}</Badge>
                      )}
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">Dzień:</span> {entry.dayId}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data:</span> {entry.date}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sesja:</span> {entry.sessionOrigin === 'provisional' ? 'provisional' : 'remote'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ostatnia zmiana:</span> {new Date(entry.updatedAt).toLocaleString('pl-PL')}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {entry.sessionOrigin === 'provisional'
                        ? 'Ta sesja nie ma jeszcze dokumentu w Firebase. Powstanie przy pierwszej udanej synchronizacji online.'
                        : entry.finalSyncPending
                          ? 'Trening został zakończony lokalnie i czeka na finalny zapis do chmury.'
                          : entry.dirty
                            ? 'Masz lokalne zmiany, które nie zostały jeszcze zsynchronizowane.'
                            : 'Lokalny szkic jest zsynchronizowany.'}
                    </p>

                    {entry.lastError && (
                      <p className="text-xs text-destructive">Ostatni błąd: {entry.lastError}</p>
                    )}

                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button variant="outline" onClick={() => handleOpenWorkout(entry)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Otwórz trening
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
                        Synchronizuj teraz
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
                        Usuń szkic
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
