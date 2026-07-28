import { Capacitor } from '@capacitor/core';

// Z159: klawiatura iOS nie zmienia 100dvh ani safe-area-inset-bottom, więc dialogi
// centrowane względem layout viewportu lądowały pod klawiaturą. Ustawiamy CSS var
// --keyboard-inset na <html>; dialogi centrują się względem WIDOCZNEGO viewportu.
// resize: 'none' w capacitor.config.ts — globalny layout NIE drga (fixed bottom
// bary WorkoutDay zostają na miejscu), kompensują wyłącznie dialogi.

let initialized = false;

const setInset = (px: number): void => {
  document.documentElement.style.setProperty('--keyboard-inset', `${Math.max(0, Math.round(px))}px`);
};

export const initKeyboardInset = (): void => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  if (Capacitor.isNativePlatform()) {
    void import('@capacitor/keyboard')
      .then(({ Keyboard }) => {
        void Keyboard.addListener('keyboardWillShow', (info) => setInset(info.keyboardHeight));
        void Keyboard.addListener('keyboardWillHide', () => setInset(0));
      })
      .catch(() => { /* plugin niedostępny — dialogi zostają centrowane klasycznie */ });
    return;
  }

  // Web/PWA fallback: klawiatura ekranowa kurczy visualViewport względem innerHeight.
  const viewport = window.visualViewport;
  if (!viewport) return;
  const onResize = () => setInset(window.innerHeight - viewport.height);
  viewport.addEventListener('resize', onResize);
  onResize();
};

export const __resetKeyboardInsetForTests = (): void => {
  initialized = false;
};
