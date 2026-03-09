import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdatePrompt = () => {
  // autoUpdate mode — SW updates automatically, no user prompt needed
  useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      // Check for updates every hour
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
  });

  return null;
};
