import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '@/lib/offline-queue';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOps, setPendingOps] = useState(offlineQueue.size());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll pending ops count
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingOps(offlineQueue.size());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const refreshPendingOps = useCallback(() => {
    setPendingOps(offlineQueue.size());
  }, []);

  return { isOnline, pendingOps, refreshPendingOps };
};
