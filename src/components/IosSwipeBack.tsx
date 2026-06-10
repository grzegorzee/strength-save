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

export const IosSwipeBack = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return;

    let startX = -1;
    let startY = 0;
    let triggered = false;

    const onTouchStart = (event: TouchEvent) => {
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
