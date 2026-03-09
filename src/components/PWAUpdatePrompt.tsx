import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        // Check for updates every 10 minutes
        setInterval(() => r.update(), 10 * 60 * 1000);
      }
    },
  });

  // Auto-accept updates — immediately skipWaiting + reload
  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
};
