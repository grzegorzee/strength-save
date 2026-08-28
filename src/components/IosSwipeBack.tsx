import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

// Natywne allowsBackForwardNavigationGestures nie współpracuje z hash-routingiem
// (WKWebView nie uruchamia gestu dla nawigacji same-document), więc gest
// obsługujemy po stronie JS: dotknięcie przy lewej krawędzi + przeciągnięcie
// w prawo = navigate(-1), jak systemowe "wstecz" w natywnych apkach.
const EDGE_START_PX = 24;
const TRIGGER_DX_PX = 70;
const MAX_DY_PX = 50;

// Bug 29 (X30): gest nad otwartym Radix Dialogiem/Sheetem/AlertDialogiem cofał
// CAŁĄ trasę — twardy unmount otwartego portalu (klasa incydentu b.92: wiszący
// scroll-lock na body w WKWebView). Otwarty overlay = gest zignorowany;
// zamknięcie modala należy do jego własnych kontrolek.
const hasOpenOverlay = (): boolean =>
  document.querySelector(
    '[data-app-overlay][data-state="open"], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  ) !== null;

export const IosSwipeBack = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return;

    let startX = -1;
    let startY = 0;
    let triggered = false;

    const onTouchStart = (event: TouchEvent) => {
      if (hasOpenOverlay()) {
        startX = -1;
        return;
      }
      const touch = event.touches[0];
      startX = touch.clientX <= EDGE_START_PX ? touch.clientX : -1;
      startY = touch.clientY;
      triggered = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startX < 0 || triggered) return;
      const touch = event.touches[0];
      if (Math.abs(touch.clientY - startY) > MAX_DY_PX) {
        startX = -1;
        return;
      }
      if (touch.clientX - startX > TRIGGER_DX_PX) {
        // Overlay mógł się otworzyć już PO touchstart — decyzja w momencie triggera.
        if (hasOpenOverlay()) {
          startX = -1;
          return;
        }
        triggered = true;
        navigate(-1);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [navigate]);

  return null;
};
