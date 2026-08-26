import { useEffect } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import { flushTelemetryEvents } from '@/lib/app-telemetry';
import { addAppStateListener } from '@/lib/app-lifecycle';

export const TelemetryHeartbeat = () => {
  const { uid } = useCurrentUser();

  useEffect(() => {
    if (!uid) return;

    const flush = () => {
      void flushTelemetryEvents(uid);
    };

    // Z211: batching — liczniki i tak agregują się w localStorage, więc rzadszy
    // okresowy flush (5 min, maks. 12/h) niczego nie gubi. Momenty lifecycle'owe
    // domykają resztę: online (retry po offline), przejście w tło i pagehide
    // (ostatnia szansa przed ubiciem JS przez iOS). Powrót do foreground nie
    // flushuje — nic nowego nie mogło się zebrać, gdy JS był wstrzymany.
    flush();

    const interval = window.setInterval(flush, 5 * 60_000);
    window.addEventListener('online', flush);
    window.addEventListener('pagehide', flush);
    // WP-C (X38): przejście w tło przez app-lifecycle: natywnie appStateChange
    // (visibilitychange w WKWebView bywa zawodne; to ostatnia szansa na flush
    // liczników offline, np. sync_offline_deferred, zanim JS stanie), na webie
    // ten sam helper nasłuchuje visibilitychange (jak dotąd).
    const removeAppState = addAppStateListener((isActive) => {
      if (!isActive) flush();
    });

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', flush);
      window.removeEventListener('pagehide', flush);
      removeAppState();
    };
  }, [uid]);

  return null;
};
