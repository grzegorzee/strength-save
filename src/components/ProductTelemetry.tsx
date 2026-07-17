import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/contexts/UserContext';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { screenKeyForPath, shouldTrackSessionActive } from '@/lib/product-telemetry';
import { formatLocalDate } from '@/lib/utils';

// Z94: telemetria produktowa. session_active raz dziennie (także po powrocie
// z tła po północy), wyświetlenia ekranów z whitelisty tras. Liczniki lądują
// w istniejącym buforze localStorage (flush robi TelemetryHeartbeat).

const localStorageStore = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // brak localStorage = brak guardu; trackTelemetryEvent i tak wymaga localStorage
    }
  },
};

export const ProductTelemetry = () => {
  const { uid } = useCurrentUser();
  const location = useLocation();
  const lastScreenKeyRef = useRef<string | null>(null);

  // Sesja aktywna: na mount i przy każdym powrocie do foregroundu (zmiana dnia
  // po drodze = nowy dzień aktywny; iOS wstrzymuje JS, więc interwał nie wystarczy).
  useEffect(() => {
    if (!uid) return;

    const trackSession = () => {
      if (shouldTrackSessionActive(uid, formatLocalDate(new Date()), localStorageStore)) {
        trackTelemetryEvent(uid, 'session_active');
      }
    };

    trackSession();
    const onVisible = () => {
      if (document.visibilityState === 'visible') trackSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [uid]);

  // Ekrany: licz zmianę trasy z whitelisty; ta sama trasa pod rząd liczona raz.
  useEffect(() => {
    if (!uid) return;
    const key = screenKeyForPath(location.pathname);
    if (key === null || key === lastScreenKeyRef.current) {
      if (key === null) lastScreenKeyRef.current = null;
      return;
    }
    lastScreenKeyRef.current = key;
    trackTelemetryEvent(uid, key);
  }, [uid, location.pathname]);

  return null;
};
