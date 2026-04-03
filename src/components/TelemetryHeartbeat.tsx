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

    flush();

    const interval = window.setInterval(flush, 30_000);
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', flush);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [uid]);

  return null;
};
