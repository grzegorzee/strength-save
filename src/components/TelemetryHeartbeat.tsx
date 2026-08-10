import { useEffect } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import { flushTelemetryEvents } from '@/lib/app-telemetry';

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
    const flushWhenHidden = () => {
      if (document.hidden) flush();
    };

    flush();

    const interval = window.setInterval(flush, 5 * 60_000);
    window.addEventListener('online', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushWhenHidden);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', flush);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flushWhenHidden);
    };
  }, [uid]);

  return null;
};
