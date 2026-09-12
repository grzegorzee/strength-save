import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/contexts/UserContext';
import { useWorkoutSyncDeps } from '@/hooks/useWorkoutSyncDeps';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import {
  WORKOUT_SYNC_REQUESTED_EVENT,
  WORKOUT_SYNC_STATE_CHANGED_EVENT,
  collectRetryableSyncEntries,
  recordWorkoutSyncFailure,
} from '@/lib/workout-sync-entries';
import {
  classifyWorkoutSyncError,
  isOfflineLikeWorkoutSyncError,
  isRevisionConflictError,
} from '@/lib/workout-sync-conflict';
import { syncWorkoutSession } from '@/lib/workout-sync-engine';
import { reportClientError } from '@/lib/error-telemetry';
import { cleanupLegacySyncLeftovers } from '@/lib/workout-sync-cleanup';
import { addAppStateListener } from '@/lib/app-lifecycle';
import { addNetworkListener } from '@/lib/network-status';
import { notifyDeferredSyncSuccess } from '@/lib/sync-notification';

// Po powrocie online (i na starcie sesji) automatycznie domyka zaległe final-synci
// z kolejki — wcześniej wymagało to ręcznego "Ponów" w Sync Center w Ustawieniach.
// Przetwarza wpisy finalSyncPending (ukończone treningi, kind=final) ORAZ — od Z175 —
// aktywne sesje provisional (start offline, kind=checkpoint): bez tego promocja
// provisional→remote wymagała WEJŚCIA w ekran treningu i baner "rozpoczęty offline"
// wisiał na Dashboardzie mimo sieci. Dirty remote w żywym WorkoutDay ma swój
// rytm checkpointów; po wyjściu z tego ekranu przejmuje go AutoSync.
// Konflikt wersji (WORKOUT_CONFLICT) zostaje
// w kolejce do ręcznego rozwiązania dialogiem w treningu.
//
// WP-C (X38), incydent 2026-08-26 (szybki trening właściciela został skorupą
// revision 0 w chmurze, zero błędów w telemetrii). Zasady:
// 1. Wyzwalacze: online + appStateChange/visibilitychange (resume) +
//    @capacitor/network + timer 45 s w foregroundzie (gdy jest co syncować) +
//    prośba z WorkoutDay (zakończenie offline, unmount z finalSyncPending).
// 2. BEZ bramki navigator.onLine dla prób: jedynym dowodem sieci jest udany
//    zapis. Hamulce: lock in-flight + backoff full jitter (cap 60 s).
// 3. Każde REALNE zdarzenie (nie timer) zeruje backoff wpisów retryable.
// 4. Cisza w UI: żadnych toastów "zsynchronizowano n"; po odroczonym finalu
//    dokładnie jeden sygnał per sesja (sync-notification.ts).
// iOS w tle: JS stoi (zasada 1 CLAUDE.md), więc sync rusza przy wznowieniu.

export const AUTO_SYNC_FOREGROUND_INTERVAL_MS = 45_000;

type AutoSyncTrigger = 'start' | 'online' | 'app-active' | 'network' | 'timer' | 'requested';

export const AutoSyncOnReconnect = () => {
  const { uid } = useCurrentUser();
  const { pathname } = useLocation();
  const isWorkoutRoute = pathname === '/workout' || pathname.startsWith('/workout/');
  const { syncDeps, workouts, isLoaded: workoutsLoaded } = useWorkoutSyncDeps(uid);
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const latest = useRef({ uid, syncDeps, toast, t, lang });
  latest.current = { uid, syncDeps, toast, t, lang };

  // Z53: jednorazowe sprzątanie pozostałości sprzed R2 (guard w localStorage,
  // ustawiany po sukcesie). Fire-and-forget: porażka = retry przy kolejnym starcie.
  useEffect(() => {
    if (!uid || !workoutsLoaded) return;
    cleanupLegacySyncLeftovers(uid, workouts).catch(() => {});
  }, [uid, workoutsLoaded, workouts]);

  useEffect(() => {
    if (!uid) return;
    let disposed = false;
    // The lock belongs to this owner/effect. A finishing A request must not
    // swallow B's startup, and changing a snapshot callback must not cancel it.
    let running = false;
    let rerunRequested = false;
    const isCurrent = () => !disposed && latest.current.uid === uid;

    const processQueue = async (trigger: AutoSyncTrigger): Promise<void> => {
      if (!isCurrent()) return;
      if (running) {
        // Zdarzenie w trakcie biegu: jeden dodatkowy przebieg po zakończeniu
        // (nie gubimy sygnału sieci, nie dublujemy zapisów).
        if (trigger !== 'timer') rerunRequested = true;
        return;
      }
      // Acquire before IndexedDB awaits, not only before the first network write.
      running = true;
      let synced = 0;
      let attempts = 0;
      try {
        if (trigger !== 'timer') {
          workoutSyncQueue.resetBackoff(uid);
        }

        const [activeDrafts, queueEntries] = await Promise.all([
          workoutDraftDb.listDrafts(uid),
          Promise.resolve(workoutSyncQueue.list(uid)),
        ]);
        if (!isCurrent()) return;
        const conflictSessionIds = new Set(
          queueEntries
            .filter((entry) => isRevisionConflictError(entry.lastError))
            .map((entry) => entry.sessionId),
        );
        // Bug 37 (X30) + WP-C (X38): `now` włącza backoff (full jitter, cap 60 s);
        // ręczne "Ponów" w Sync Center dalej idzie bez backoffu.
        const entries = collectRetryableSyncEntries(activeDrafts, queueEntries, { now: Date.now() })
          .filter(({ entry }) => (entry.finalSyncPending || entry.sessionOrigin === 'provisional' || !isWorkoutRoute)
            && !conflictSessionIds.has(entry.sessionId));
        if (entries.length === 0) return;

        for (const { entry } of entries) {
          if (!isCurrent()) break;
          const { syncDeps, toast, t, lang } = latest.current;
          // Z175: aktywna sesja provisional dostaje checkpoint (promocja + baseline),
          // final zostaje wyłącznie dla ukończonych treningów.
          const kind = entry.finalSyncPending ? 'final' : 'checkpoint';
          // Treść do sygnału po syncu czytamy PRZED zapisem: udany final sprząta draft.
          const draftBefore = kind === 'final' ? await workoutDraftDb.loadDraft(uid, entry.sessionId) : null;
          if (!isCurrent()) break;
          attempts += 1;
          const outcome = await syncWorkoutSession(uid, entry.sessionId, kind, syncDeps);
          if (!isCurrent()) break;
          if (outcome.promotedSessionId) {
            trackTelemetryEvent(uid, 'provisional_session_promoted');
          }
          if (!outcome.success) {
            // Porażka zapisywana pod DOCELOWYM sessionId (po promocji NOWY id) —
            // inaczej lastError ginie i filtr konfliktów nie zatrzymuje retry (R2-16).
            await recordWorkoutSyncFailure(uid, outcome, outcome.error || 'SYNC_FAILED', {
              queue: workoutSyncQueue,
              loadDraft: (ownerId, sessionId) => workoutDraftDb.loadDraft(ownerId, sessionId),
            });
            const code = classifyWorkoutSyncError(outcome.error);
            if (outcome.conflict) {
              trackTelemetryEvent(uid, 'revision_conflict');
            } else if (code === 'timeout') {
              trackTelemetryEvent(uid, 'sync_timeout');
            } else if (outcome.error?.startsWith('CLOUD_NOT_CONFIRMED')) {
              trackTelemetryEvent(uid, 'sync_validation_failed');
            }
            // Brak sieci to stan, nie bug: client_errors tylko dla realnych błędów
            // (timeout też, bo zawieszona obietnica SDK to sygnał do diagnozy).
            if (!isOfflineLikeWorkoutSyncError(outcome.error)) {
              void reportClientError(uid, {
                code,
                phase: kind,
                detail: outcome.error,
                sessionId: outcome.sessionId,
              });
            }
            continue;
          }
          if (outcome.skipped) continue;
          synced += 1;
          if (outcome.cloudUnconfirmed) {
            // Transakcja zatwierdzona, potwierdzenie nie doszło: sukces, ale
            // zostawiamy ślad (nowy kod w client_errors = alarm po wydaniu).
            trackTelemetryEvent(uid, 'sync_validation_failed');
            void reportClientError(uid, {
              code: 'validation',
              phase: kind,
              detail: `cloud-unconfirmed: ${outcome.unconfirmedReason ?? 'unknown'}`,
              sessionId: outcome.sessionId,
            });
          }
          if (kind === 'final' && !outcome.draftRetained) {
            trackTelemetryEvent(uid, 'sync_success_deferred');
            void notifyDeferredSyncSuccess(uid, {
              sessionId: outcome.sessionId,
              dayId: entry.dayId,
              date: entry.date,
              dayName: draftBefore?.dayName ?? '',
              finalizedAt: draftBefore?.finalizedAt ?? null,
            }, {
              t,
              lang,
              showToast: (title, description) => toast({ title, description }),
            });
          }
        }
      } catch (error) {
        // Keep durable data intact and release the lock even if local scanning
        // or retry metadata fails; the next native resume/reconnect can recover.
        if (isCurrent()) void reportClientError(uid, {
          code: classifyWorkoutSyncError(error instanceof Error ? error.message : error),
          phase: 'checkpoint',
          detail: error instanceof Error ? error.message : String(error),
        });
      } finally {
        running = false;
        if (isCurrent()) {
          if (attempts > 0) trackTelemetryEvent(uid, 'sync_retry_auto', attempts);
          if (attempts > 0 || synced > 0) window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
          if (rerunRequested) {
            rerunRequested = false;
            void processQueue('requested');
          }
        }
      }
    };

    const onOnline = () => { void processQueue('online'); };
    const onRequested = () => { void processQueue('requested'); };
    window.addEventListener('online', onOnline);
    window.addEventListener(WORKOUT_SYNC_REQUESTED_EVENT, onRequested);
    // Native: appStateChange (WKWebView wstrzymuje JS w tle, resume = pierwsza
    // okazja); web: visibilitychange (ten sam helper).
    const removeAppState = addAppStateListener((isActive) => {
      if (isActive) void processQueue('app-active');
    });
    const removeNetwork = addNetworkListener((connected) => {
      if (connected) void processQueue('network');
    });
    // Timer foreground: łapie sieć, która wróciła bez żadnego zdarzenia
    // (WKWebView potrafi nie wysłać 'online'). Tani no-op, gdy kolejka pusta.
    const interval = window.setInterval(() => { void processQueue('timer'); }, AUTO_SYNC_FOREGROUND_INTERVAL_MS);
    void processQueue('start');

    return () => {
      disposed = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener(WORKOUT_SYNC_REQUESTED_EVENT, onRequested);
      removeAppState();
      removeNetwork();
      window.clearInterval(interval);
    };
  }, [uid, isWorkoutRoute]);

  return null;
};
