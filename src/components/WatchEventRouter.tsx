// Globalny router eventów z Apple Watch. Obsługuje WYŁĄCZNIE startWorkout:
// nawiguje do WorkoutDay z autostart=true (sesja + draft powstają istniejącą
// ścieżką). Eventy serii konsumuje useWatchWorkoutSync w WorkoutDay — dlatego
// tu tylko PODGLĄD kolejki (peekEvents), nigdy drain.
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PluginListenerHandle } from '@capacitor/core';
import { formatLocalDate } from '@/lib/utils';
import {
  addWatchEventListener,
  isWatchBridgeSupported,
  peekWatchEvents,
  type WatchEvent,
} from '@/lib/watch-bridge';

export const WatchEventRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const locationRef = useRef(location);
  locationRef.current = location;
  const handledRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!isWatchBridgeSupported()) return;

    const handle = (event: WatchEvent) => {
      if (event.type !== 'startWorkout') return;
      if (handledRef.current.has(event.at)) return;
      const today = formatLocalDate(new Date());
      if (event.date !== today) return;
      handledRef.current.add(event.at);

      const target = `/workout/${event.dayId}`;
      // Trening już otwarty? Nie nawiguj ponownie (zresetowałoby stan strony).
      if (locationRef.current.pathname === target) return;
      navigateRef.current(`${target}?date=${event.date}&autostart=true`);
    };

    const peek = () => {
      void peekWatchEvents().then((events) => events.forEach(handle));
    };

    let listener: PluginListenerHandle | null = null;
    void addWatchEventListener(handle).then((h) => {
      listener = h;
    });
    peek();

    const onVisible = () => {
      if (document.visibilityState === 'visible') peek();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void listener?.remove();
    };
  }, []);

  return null;
};
