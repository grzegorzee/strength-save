// Synchronizacja aktywnego treningu z Apple Watch:
// - wysyła aktualny stan serii na zegarek (applicationContext, debounce),
// - nasłuchuje eventów setLogged/workoutFinished i aplikuje je do treningu,
// - przy starcie/powrocie do aplikacji opróżnia natywną kolejkę eventów
//   (serie zalogowane na zegarku gdy telefon był uśpiony).
import { useEffect, useRef } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import type { TrackingType } from '@/lib/set-tracking';
import {
  addWatchEventListener,
  ackWatchEvents,
  buildWatchExercises,
  getOrCreateWatchPhoneDeviceId,
  getRestDefaultSeconds,
  getRestSettingsForWatch,
  getUnitSystemForWatch,
  isWatchBridgeSupported,
  peekWatchEvents,
  sendWorkoutToWatch,
  type WatchEvent,
  type WatchSetLoggedEvent,
  type WatchWorkoutFinishedEvent,
  type WatchWorkoutDiscardedEvent,
  type WatchWorkoutPayload,
  watchEventId,
} from '@/lib/watch-bridge';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { WORKOUT_PROTOCOL_VERSION } from '@/lib/workout-protocol';
import { applyLastKnownWatchLink, type WatchCapabilitySnapshot } from '@/lib/device-management';

interface UseWatchWorkoutSyncOptions {
  /** Wysyłka i aplikowanie eventów tylko przy aktywnym treningu. */
  enabled: boolean;
  /** Brak/false zachowuje logowanie serii, ale wyłącza HealthKit na Watch. */
  healthFeaturesEnabled?: boolean;
  uid?: string;
  sessionId?: string;
  date: string;
  dayId?: string;
  dayName?: string;
  focus?: string;
  exercises?: Exercise[];
  exerciseSets: Record<string, SetData[]>;
  /** Z122: etykiety celu tygodnia per exerciseId (gotowe stringi w języku usera). */
  targetLabels?: Record<string, string>;
  /** Z122: przypięte notatki per exerciseId. */
  pinnedNotes?: Record<string, string>;
  trackingTypes?: Record<string, TrackingType>;
  /** Z122: język UI zegarka. */
  lang?: string;
  capability?: WatchCapabilitySnapshot;
  onSetLogged: (event: WatchSetLoggedEvent) => void | Promise<void>;
  onWorkoutFinished: (event: WatchWorkoutFinishedEvent) => void | Promise<void>;
  onWorkoutDiscarded: (event: WatchWorkoutDiscardedEvent) => void | Promise<void>;
}

const SEND_DEBOUNCE_MS = 800;

export function useWatchWorkoutSync(options: UseWatchWorkoutSyncOptions) {
  const { enabled, healthFeaturesEnabled, uid, sessionId, date, dayId, dayName, focus, exercises, exerciseSets, targetLabels, pinnedNotes, trackingTypes, lang, capability, onSetLogged, onWorkoutFinished, onWorkoutDiscarded } = options;

  // Najnowsze callbacki bez restartu listenera.
  const handlersRef = useRef({ onSetLogged, onWorkoutFinished, onWorkoutDiscarded });
  handlersRef.current = { onSetLogged, onWorkoutFinished, onWorkoutDiscarded };
  const contextRef = useRef({ enabled, date, dayId, sessionId });
  contextRef.current = { enabled, date, dayId, sessionId };
  // Dedup: event może przyjść live (listener) i drugi raz z drainEvents.
  const appliedRef = useRef<Set<string>>(new Set());
  // Eventy Watch są porządkowane FIFO. Bez tego szybkie set -> discard mogły
  // zapisywać się równolegle, a spóźniony set odtwarzał właśnie odrzucony draft.
  const sequenceRef = useRef<Promise<void>>(Promise.resolve());

  // Wysyłka stanu na zegarek (debounce).
  useEffect(() => {
    if (!isWatchBridgeSupported() || !enabled || !dayId || !exercises?.length) return;

    const timer = window.setTimeout(() => {
      const rest = getRestSettingsForWatch();
      const payload: WatchWorkoutPayload = {
        v: WORKOUT_PROTOCOL_VERSION,
        protocolVersion: WORKOUT_PROTOCOL_VERSION,
        type: 'todayWorkout',
        date,
        ...(uid ? { uid } : {}),
        deviceId: getOrCreateWatchPhoneDeviceId(),
        ...(sessionId ? { sessionId } : {}),
        dayId,
        dayName,
        focus,
        sentAt: Date.now(),
        active: true,
        healthFeaturesEnabled: healthFeaturesEnabled === true,
        timersEnabled: FEATURE_FLAGS.workoutTimers,
        ...(FEATURE_FLAGS.workoutTimers && {
          // `restSeconds` is the old-Watch alias. New clients use both explicit values.
          restSeconds: getRestDefaultSeconds(),
          restBetweenSetsSeconds: rest.betweenSetsSeconds,
          restBetweenExercisesSeconds: rest.betweenExercisesSeconds,
        }),
        unit: getUnitSystemForWatch(),
        ...(lang ? { lang } : {}),
        ...(capability ? { capability: applyLastKnownWatchLink(capability) } : {}),
        exercises: buildWatchExercises(exercises, exerciseSets, {
          targetLabelByExerciseId: targetLabels,
          pinnedNoteByExerciseId: pinnedNotes,
          trackingByExerciseId: trackingTypes,
        }),
      };
      void sendWorkoutToWatch(payload);
    }, SEND_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, healthFeaturesEnabled, uid, sessionId, date, dayId, dayName, focus, exercises, exerciseSets, targetLabels, pinnedNotes, trackingTypes, lang, capability]);

  // Odbiór eventów: listener live + drain kolejki przy starcie i powrocie do foreground.
  useEffect(() => {
    if (!isWatchBridgeSupported()) return;

    const applyEvent = async (event: WatchEvent) => {
      const ctx = contextRef.current;
      if (!ctx.enabled) return;
      if (event.date !== ctx.date || event.dayId !== ctx.dayId) return;
      // Additive field: legacy Watch has none, a new Watch must match the active draft.
      if (event.sessionId && ctx.sessionId && event.sessionId !== ctx.sessionId) return;

      if (event.type !== 'setLogged' && event.type !== 'workoutFinished'
        && event.type !== 'workoutDiscarded') return;
      const key = watchEventId(event);
      if (appliedRef.current.has(key)) return;
      // Klucz dodany przed awaitem dedupuje równoległe dostarczenia (listener + drain),
      // ale trwały jest dopiero PO sukcesie: błąd zapisu usuwa klucz, event zostaje
      // w natywnej kolejce (bez ACK) i wraca kolejnym drainem (R2-26).
      appliedRef.current.add(key);
      try {
        if (event.type === 'setLogged') {
          await handlersRef.current.onSetLogged(event);
        } else if (event.type === 'workoutFinished') {
          await handlersRef.current.onWorkoutFinished(event);
        } else {
          await handlersRef.current.onWorkoutDiscarded(event);
        }
        await ackWatchEvents([key]);
      } catch {
        appliedRef.current.delete(key);
      }
    };

    const queueEvent = (event: WatchEvent) => {
      sequenceRef.current = sequenceRef.current.then(() => applyEvent(event));
    };

    const drain = () => {
      // Tylko peek: trwały ACK następuje po zapisaniu zmiany do draftu.
      if (!contextRef.current.enabled) return;
      void peekWatchEvents().then((events) => events.forEach(queueEvent));
    };

    let handle: PluginListenerHandle | null = null;
    void addWatchEventListener(queueEvent).then((h) => {
      handle = h;
    });
    drain();

    const onVisible = () => {
      if (document.visibilityState === 'visible') drain();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void handle?.remove();
    };
  }, [enabled, date, dayId, sessionId]);
}
