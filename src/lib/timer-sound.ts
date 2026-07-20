// Krótki sygnał dźwiękowy dla timerów (przerwa między seriami + interwał EMOM/AMRAP).
// Współdzielony AudioContext odblokowywany na gest startu — dzięki temu beep odpalony
// później z setInterval NIE jest blokowany przez politykę autoplay na iOS/Safari.

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
};

// Realny plik zamiast syntezy WebAudio (2026-07-20, po dwóch nieudanych testach
// na urządzeniu). WebAudio w WKWebView potrafi nie zagrać mimo odblokowania —
// HTMLAudioElement jest w tym środowisku przewidywalniejszy, a plik i tak musimy
// wozić w bundlu dla powiadomienia systemowego. Syntezowany beep zostaje jako
// fallback (web, brak pliku).
const SOUND_URL = `${import.meta.env.BASE_URL ?? '/'}rest_end.wav`;
let el: HTMLAudioElement | null = null;

const getEl = (): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined') return null;
  if (!el) {
    el = new Audio(SOUND_URL);
    el.preload = 'auto';
    el.volume = 1;
  }
  return el;
};

/** Wywołaj w handlerze gestu (start/otwarcie timera), żeby odblokować audio na iOS. */
export const unlockTimerSound = (): void => {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
  // Odblokowanie elementu audio tym samym gestem: krótkie play/pause w geście
  // zdejmuje blokadę autoplay na iOS dla późniejszych odtworzeń z timera.
  const a = getEl();
  if (a && a.paused) {
    a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  }
};

// Głośność sygnałów. Podniesiona po realnym treningu (2026-07-20): przy 0.3 beep
// ginął w hałasie siłowni i w muzyce z AirPodsów. Fala trójkątna niesie się lepiej
// niż sinus przy tej samej głośności szczytowej.
const PEAK_GAIN = 0.85;

const beepAt = (c: AudioContext, start: number, freq: number, dur: number, peak = PEAK_GAIN): void => {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.start(start);
  osc.stop(start + dur);
};

/**
 * Krótki sygnał.
 * - 'tick'     pojedynczy krótki beep (start kolejnej rundy interwału),
 * - 'finish'   dwa krótkie, wznoszące tony (koniec przerwy między seriami / koniec bloku),
 * - 'complete' trzy wznoszące tony (koniec całego ćwiczenia — wyraźniejszy, „przejdź dalej").
 */
// Przełącznik dźwięku z Profilu (Profil → Dźwięk). Domyślnie ON; OFF = pełna cisza timerów.
const isSoundEnabled = (): boolean => {
  try { return localStorage.getItem('timer-sound-enabled') !== 'false'; } catch { return true; }
};

export const playTimerSound = (kind: 'tick' | 'finish' | 'complete' = 'finish'): void => {
  if (!isSoundEnabled()) return;

  // Koniec przerwy: najpierw realny plik (najpewniejsza droga w WKWebView).
  // Gdy się nie uda — lecimy syntezą poniżej, żeby nie zostać z ciszą.
  if (kind === 'finish') {
    const a = getEl();
    if (a) {
      a.currentTime = 0;
      const played = a.play();
      if (played) {
        played.catch(() => playSynth(kind));
        return;
      }
    }
  }

  playSynth(kind);
};

const playSynth = (kind: 'tick' | 'finish' | 'complete'): void => {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;
  if (kind === 'tick') {
    beepAt(c, now, 880, 0.12);
  } else if (kind === 'complete') {
    beepAt(c, now, 880, 0.12);
    beepAt(c, now + 0.15, 1175, 0.12);
    beepAt(c, now + 0.30, 1568, 0.2);
  } else {
    // Koniec przerwy: wyraźna, wznosząca sekwencja „wracaj do sztangi".
    // Dwa ciche tony gubiły się na siłowni — teraz cztery, dłuższe, z domknięciem.
    beepAt(c, now, 880, 0.16);
    beepAt(c, now + 0.20, 1175, 0.16);
    beepAt(c, now + 0.40, 1568, 0.16);
    beepAt(c, now + 0.62, 1568, 0.32);
  }
};
