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

/** Wywołaj w handlerze gestu (start/otwarcie timera), żeby odblokować audio na iOS. */
export const unlockTimerSound = (): void => {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
};

const beepAt = (c: AudioContext, start: number, freq: number, dur: number): void => {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.3, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.start(start);
  osc.stop(start + dur);
};

/**
 * Krótki sygnał.
 * - 'tick'   pojedynczy krótki beep (start kolejnej rundy interwału),
 * - 'finish' dwa krótkie, wznoszące tony (koniec przerwy / koniec bloku).
 */
export const playTimerSound = (kind: 'tick' | 'finish' = 'finish'): void => {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;
  if (kind === 'tick') {
    beepAt(c, now, 880, 0.12);
  } else {
    beepAt(c, now, 880, 0.12);
    beepAt(c, now + 0.16, 1175, 0.16);
  }
};
