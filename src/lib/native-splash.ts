import { Capacitor } from '@capacitor/core';

// Zgłoszenie 2026-08-13: natywny splash (logo) znikał po ~0.5 s i user oglądał
// czarną szczelinę, aż WKWebView wstanie. Z launchAutoHide:false splash zostaje,
// a my chowamy go dopiero po pierwszej klatce Reacta (płynne przejście w
// AppLoader z tym samym logo).
export const hideNativeSplashWhenReady = (): void => {
  if (!Capacitor.isNativePlatform()) return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      void import('@capacitor/splash-screen')
        .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 200 }))
        .catch(() => {
          // brak pluginu (build bez cap sync) — splash schowa się sam po timeout systemu
        });
    });
  });
};
