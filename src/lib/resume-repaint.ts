import { addAppStateListener } from '@/lib/app-lifecycle';

// Czarne kafle WKWebView po powrocie z tła: kompozytor potrafi nie przemalować
// warstw (treść jest, dotyk działa, piksele czarne — inny defekt niż scroll-lock
// b.92, zgłoszenie 2026-08-13). Wymuszamy przemalowanie przełączeniem
// transformacji na <html> przez dwie klatki.
export const forceRepaint = (): void => {
  try {
    const root = document.documentElement;
    root.style.transform = 'translateZ(0)';
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.style.transform = '';
      });
    });
  } catch {
    // brak DOM — nic do przemalowania
  }
};

/** Instaluje kick przy każdym powrocie do aktywności; zwraca unsubscribe. */
export const installResumeRepaint = (): (() => void) =>
  addAppStateListener((isActive) => {
    if (isActive) forceRepaint();
  });
