import { Capacitor } from '@capacitor/core';

// WP-C (X38): trzeci kanał sygnału sieci. `navigator.onLine` i `window 'online'`
// w WKWebView są niewiarygodne (research X38), a @capacitor/network gubi
// `networkStatusChange` po wznowieniu (capacitor#2216), dlatego AutoSync słucha
// WSZYSTKICH kanałów naraz i traktuje każdy jako "spróbuj teraz", a jedynym
// dowodem sieci jest udany zapis. Web: fallback na online/offline okna.

type NetworkChangeCallback = (connected: boolean) => void;

export const addNetworkListener = (onChange: NetworkChangeCallback): (() => void) => {
  if (Capacitor.isNativePlatform()) {
    let removed = false;
    let removeNative: (() => void) | null = null;

    void import('@capacitor/network')
      .then(({ Network }) => Network.addListener('networkStatusChange', ({ connected }) => onChange(connected)))
      .then((handle) => {
        if (removed) {
          void handle.remove();
          return;
        }
        removeNative = () => { void handle.remove(); };
      })
      .catch(() => {
        // Brak pluginu (build bez cap sync): zostają kanały webowe + appStateChange.
      });

    return () => {
      removed = true;
      removeNative?.();
    };
  }

  const onOnline = () => onChange(true);
  const onOffline = () => onChange(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

/** Flaga TYLKO do UI (wskaźniki). Nigdy jako bramka prób syncu. */
export const isNetworkProbablyOnline = (): boolean => (
  typeof navigator === 'undefined' || navigator.onLine !== false
);
