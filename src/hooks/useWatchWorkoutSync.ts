// Synchronizacja aktywnego treningu z Apple Watch:
// - wysyła aktualny stan serii na zegarek (applicationContext, debounce),
// - nasłuchuje eventów setLogged/workoutFinished i aplikuje je do treningu,
// - przy starcie/powrocie do aplikacji opróżnia natywną kolejkę eventów
//   (serie zalogowane na zegarku gdy telefon był uśpiony).
import { useEffect, useRef } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import {
  addWatchEventListener,
  ackWatchEvents,
  getRestDefaultSeconds,
  getUnitSystemForWatch,
  isWatchBridgeSupported,
  peekWatchEvents,
  sendWorkoutToWatch,
  type WatchEvent,
  type WatchSetLoggedEvent,
  type WatchWorkoutPayload,
  watchEventId,
} from '@/lib/watch-bridge';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

interface UseWatchWorkoutSyncOptions {
  /** Wysyłka i aplikowanie eventów tylko przy aktywnym treningu. */
  enabled: boolean;
  date: string;
  dayId?: string;
  dayName?: string;
  focus?: string;
  exercises?: Exercise[];
  exerciseSets: Record<string, SetData[]>;
  onSetLogged: (event: WatchSetLoggedEvent) => void | Promise<void>;
  onWorkoutFinished: () => void | Promise<void>;
}

const SEND_DEBOUNCE_MS = 800;

export function useWatchWorkoutSync(options: UseWatchWorkoutSyncOptions) {
  const { enabled, date, dayId, dayName, focus, exercises, exerciseSets, onSetLogged, onWorkoutFinished } = options;

  // Najnowsze callbacki bez restartu listenera.
  const handlersRef = useRef({ onSetLogged, onWorkoutFinished });
  handlersRef.current = { onSetLogged, onWorkoutFinished };
  const contextRef = useRef({ enabled, date, dayId });
  contextRef.current = { enabled, date, dayId };
  // Dedup: event może przyjść live (listener) i drugi raz z drainEvents.
  const appliedRef = useRef<Set<string>>(new Set());

  // Wysyłka stanu na zegarek (debounce).
  useEffect(() => {
    if (!isWatchBridgeSupported() || !enabled || !dayId || !exercises?.length) return;

    const timer = window.setTimeout(() => {
      const payload: WatchWorkoutPayload = {
        type: 'todayWorkout',
        date,
        dayId,
        dayName,
        focus,
        sentAt: Date.now(),
        active: true,
        timersEnabled: FEATURE_FLAGS.workoutTimers,
        ...(FEATURE_FLAGS.workoutTimers && { restSeconds: getRestDefaultSeconds() }),
        unit: getUnitSystemForWatch(),
        exercises: exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          setsLabel: exercise.sets,
          sets: exerciseSets[exercise.id] ?? [],
        })),
      };
      void sendWorkoutToWatch(payload);
    }, SEND_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, date, dayId, dayName, focus, exercises, exerciseSets]);

  // Odbiór eventów: listener live + drain kolejki przy starcie i powrocie do foreground.
  useEffect(() => {
    if (!isWatchBridgeSupported()) return;

    const applyEvent = async (event: WatchEvent) => {
      const ctx = contextRef.current;
      if (!ctx.enabled) return;
      if (event.date !== ctx.date || event.dayId !== ctx.dayId) return;

      if (event.type === 'setLogged') {
        const key = watchEventId(event);
        if (appliedRef.current.has(key)) return;
        appliedRef.current.add(key);
        await handlersRef.current.onSetLogged(event);
        await ackWatchEvents([key]);
      } else if (event.type === 'workoutFinished') {
        const key = watchEventId(event);
        if (appliedRef.current.has(key)) return;
        appliedRef.current.add(key);
        await handlersRef.current.onWorkoutFinished();
        await ackWatchEvents([key]);
      }
    };

    const drain = () => {
      // Tylko peek: trwały ACK następuje po zapisaniu zmiany do draftu.
      if (!contextRef.current.enabled) return;
      void peekWatchEvents().then((events) => events.forEach(event => { void applyEvent(event); }));
    };

    let handle: PluginListenerHandle | null = null;
    void addWatchEventListener(event => { void applyEvent(event); }).then((h) => {
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
  }, [enabled, date, dayId]);
}
