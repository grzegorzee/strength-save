import { Capacitor } from '@capacitor/core';

// Cykl życia apki: na natywnym iOS webowe visibilitychange/pagehide bywają zawodne
// (WKWebView wstrzymuje JS), więc na platformie natywnej słuchamy appStateChange
// z @capacitor/app. Na webie fallback do visibilitychange.

type AppStateChangeCallback = (isActive: boolean) => void;

export const addAppStateListener = (onChange: AppStateChangeCallback): (() => void) => {
  if (Capacitor.isNativePlatform()) {
    let removed = false;
    let removeNative: (() => void) | null = null;

    void import('@capacitor/app')
      .then(({ App }) => App.addListener('appStateChange', ({ isActive }) => onChange(isActive)))
      .then(handle => {
        if (removed) {
          void handle.remove();
          return;
        }
        removeNative = () => { void handle.remove(); };
      })
      .catch(() => {
        // Brak pluginu (np. build bez cap sync) — sygnały tła obsłużą webowe handlery.
      });

    return () => {
      removed = true;
      removeNative?.();
    };
  }

  const handleVisibilityChange = () => {
    onChange(!document.hidden);
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};
