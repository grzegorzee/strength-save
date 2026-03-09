import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdatePrompt = () => {
  useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        // Check for updates every 30 minutes
        setInterval(() => r.update(), 30 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      // Force reload when new version is available
      window.location.reload();
    },
  });

  return null;
};
