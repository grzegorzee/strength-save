import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { closeTopExclusiveOverlay } from '@/hooks/useExclusiveOverlay';

export const ANDROID_BACK_EVENT = 'strength-save:android-back';

/**
 * Jeden właściciel natywnego Android Back dla całej aplikacji.
 * Priorytet: najwyższa warstwa -> lokalny ekran (np. krok wizarda) -> historia
 * WebView -> wyjście z aplikacji. Dzięki temu otwarty modal nigdy nie jest
 * twardo odmontowany przez zmianę trasy.
 */
export const AndroidBackHandler = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

    let disposed = false;
    let removeNative: (() => void) | null = null;

    void import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', ({ canGoBack }) => {
        if (closeTopExclusiveOverlay()) return;

        const localBack = new Event(ANDROID_BACK_EVENT, { cancelable: true });
        window.dispatchEvent(localBack);
        if (localBack.defaultPrevented) return;

        if (canGoBack) {
          window.history.back();
          return;
        }
        void App.exitApp();
      }))
      .then((handle) => {
        if (disposed) {
          void handle.remove();
          return;
        }
        removeNative = () => { void handle.remove(); };
      })
      .catch(() => {
        // Web/test albo niesynchronizowany plugin: system zachowuje swój fallback.
      });

    return () => {
      disposed = true;
      removeNative?.();
    };
  }, []);

  return null;
};
