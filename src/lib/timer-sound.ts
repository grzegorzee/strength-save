// Krótki sygnał dźwiękowy dla timerów (przerwa między seriami + interwał EMOM/AMRAP).
// Współdzielony AudioContext odblokowywany na gest startu — dzięki temu beep odpalony
// później z setInterval NIE jest blokowany przez politykę autoplay na iOS/Safari.

import { loadRestSound, restSoundUrl } from '@/lib/rest-sound';

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

// Z147: plik gramy przez WebAudio (fetch + decodeAudioData + bufferSource),
// NIE przez HTMLAudioElement — media element w WKWebView rejestrował apkę
// w Now Playing (widget odtwarzacza z paskiem 0:02 na lock screenie). Czysty
// WebAudio nie tworzy wpisu Now Playing. Decyzja 2026-07-20 („HTMLAudioElement
// przed WebAudio") dotyczyła SYNTEZY, nie odtwarzania zdekodowanego pliku —
// rewizja opisana w DECYZJE.md (X18C). Synteza zostaje fallbackiem.
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

const loadBuffer = (c: AudioContext, file: string): Promise<AudioBuffer | null> => {
  const cached = bufferCache.get(file);
  if (cached) return cached;
  const promise = fetch(restSoundUrl(file))
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((buf) => c.decodeAudioData(buf))
    .catch(() => null)
    .then((buffer) => {
      // Porażka nie zostaje w cache — kolejna próba (np. po odzyskaniu sieci) ma szansę.
      if (!buffer) bufferCache.delete(file);
      return buffer;
    });
  bufferCache.set(file, promise);
  return promise;
};

/** Odtwórz plik przez WebAudio. false = nie zagrało (brak ctx / fetch / decode). */
const playFile = async (file: string): Promise<boolean> => {
  const c = getCtx();
  if (!c) return false;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const buffer = await loadBuffer(c, file);
  if (!buffer) return false;
  try {
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    gain.gain.value = 1;
    source.connect(gain);
    gain.connect(c.destination);
    source.start();
    return true;
  } catch {
    return false;
  }
};

/** Odsłuch z Ustawień: gra podany plik natychmiast, niezależnie od wyboru. */
export const previewRestSound = (file: string): void => {
  void playFile(file).then((played) => {
    if (!played) playSynth('finish');
  });
};

/** Wywołaj w handlerze gestu (start/otwarcie timera), żeby odblokować audio na iOS. */
export const unlockTimerSound = (): void => {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  // Prefetch wybranego dźwięku w geście — koniec przerwy gra z cache, bez
  // czekania na fetch/decode w momencie deadline'u.
  void loadBuffer(c, loadRestSound().file);
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

  // Koniec przerwy: realny plik przez WebAudio (bez wpisu Now Playing).
  // Gdy się nie uda — synteza, żeby nie zostać z ciszą.
  if (kind === 'finish') {
    void playFile(loadRestSound().file).then((played) => {
      if (!played) playSynth(kind);
    });
    return;
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
