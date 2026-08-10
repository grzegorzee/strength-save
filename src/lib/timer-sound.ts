// Krótki sygnał dźwiękowy dla timerów (przerwa między seriami + interwał EMOM/AMRAP).
// Współdzielony AudioContext odblokowywany na gest startu — dzięki temu beep odpalony
// później z setInterval NIE jest blokowany przez politykę autoplay na iOS/Safari.

import { Capacitor, registerPlugin } from '@capacitor/core';
import { loadRestSound, restSoundUrl } from '@/lib/rest-sound';
import { loadTimerVolume } from '@/lib/timer-volume';
import { reportClientErrorWithCurrentUid } from '@/lib/global-error-telemetry';

// Z200: na iOS sygnały grają NATYWNIE (AVAudioPlayer, TimerSoundPlugin.swift) —
// WebAudio w WKWebView na fizycznym urządzeniu gra ledwo słyszalnie mimo pełnej
// głośności (zgłoszenie usera po treningu na buildzie 82). To plan B zapisany
// w DECYZJE.md 2026-07-24. WebAudio zostaje fallbackiem (web/Android/błąd pluginu).
interface TimerSoundNativeApi {
  play(options: { file: string; volume: number }): Promise<void>;
}

// Z220: rejestracja przez globalny cache — re-import modułu (vi.resetModules
// w testach) nie może rejestrować pluginu drugi raz w tym samym oknie.
const getTimerSoundNative = (): TimerSoundNativeApi => {
  const holder = globalThis as { __strengthSaveTimerSound?: TimerSoundNativeApi };
  holder.__strengthSaveTimerSound ??= registerPlugin<TimerSoundNativeApi>('TimerSound');
  return holder.__strengthSaveTimerSound;
};

// Sygnały tick/complete jako pliki w bundlu iOS (generator:
// scripts/generate-timer-signals.mjs, timing 1:1 z playSynth poniżej).
const SIGNAL_FILES: Record<'tick' | 'complete', string> = {
  tick: 'timer_tick.wav',
  complete: 'timer_complete.wav',
};

/** Odtwórz natywnie. false = nie zagrało (web / plugin niedostępny / błąd). */
const playNative = async (file: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await getTimerSoundNative().play({ file, volume: loadTimerVolume() });
    return true;
  } catch {
    return false;
  }
};

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    // Z200: WebKit odpala AudioContext w kategorii 'ambient' (cicha, duckowana,
    // wyciszana przełącznikiem dzwonka) — od iOS 17 da się to przestawić z JS
    // (WebKit bug 237322). Wzmacnia fallback WebAudio; ścieżka główna na iOS
    // i tak gra natywnie.
    const audioSession = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (audioSession) audioSession.type = 'playback';
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    // Z177: system potrafi ZAMKNĄĆ kontekst (media sessions wideo z Z176);
    // closed jest nieodwracalne — jedyny ratunek to nowy AudioContext.
    if (!ctx || ctx.state === 'closed') ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
};

// Z177: iOS zna też stan 'interrupted' (przerwanie sesji audio) — resume() dla
// KAŻDEGO stanu poza 'running', nie tylko 'suspended'.
const resumeIfNotRunning = (c: AudioContext): void => {
  if (c.state !== 'running') c.resume().catch(() => {});
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
  resumeIfNotRunning(c);
  const buffer = await loadBuffer(c, file);
  if (!buffer) return false;
  try {
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    gain.gain.value = loadTimerVolume();
    source.connect(gain);
    gain.connect(c.destination);
    source.start();
    return true;
  } catch {
    return false;
  }
};

/** Odsłuch z Ustawień: gra podany plik natychmiast, niezależnie od wyboru.
 *  Native-first jak playTimerSound — odsłuch MUSI odzwierciedlać realny kanał,
 *  inaczej ocena głośności w Ustawieniach kłamie (cała lekcja sagi dźwięku). */
export const previewRestSound = (file: string): void => {
  void playNative(file).then((native) => {
    if (native) return;
    void playFile(file).then((played) => {
      if (!played) playSynth('finish');
    });
  });
};

/** Wywołaj w handlerze gestu (start/otwarcie timera), żeby odblokować audio na iOS. */
export const unlockTimerSound = (): void => {
  const c = getCtx();
  if (!c) return;
  resumeIfNotRunning(c);
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

  const file = kind === 'finish' ? loadRestSound().file : SIGNAL_FILES[kind];
  void playNative(file).then((native) => {
    if (native) return;
    // Koniec przerwy: realny plik przez WebAudio (bez wpisu Now Playing).
    // Gdy się nie uda — synteza, żeby nie zostać z ciszą.
    if (kind === 'finish') {
      void playFile(file).then((played) => {
        if (!played) playSynth(kind);
      });
      return;
    }
    // tick/complete na webie zostają przy syntezie (pliki sygnałów żyją tylko
    // w bundlu iOS — web assets ich nie mają).
    playSynth(kind);
  });
};

const playSynth = (kind: 'tick' | 'finish' | 'complete'): void => {
  // Z177: synteza to OSTATNIA linia obrony przed ciszą — jej wyjątek (np. ctx w
  // dziwnym stanie po przerwaniu) nie może wywalić handlera odhaczenia serii.
  try {
    const c = getCtx();
    if (!c) return;
    resumeIfNotRunning(c);
    const now = c.currentTime;
    // Z201: regulacja głośności z Ustawień skaluje też syntezę — minimum 0.2
    // (timer-volume), więc exponentialRamp nigdy nie dostaje zera.
    const peak = PEAK_GAIN * loadTimerVolume();
    if (kind === 'tick') {
      beepAt(c, now, 880, 0.12, peak);
    } else if (kind === 'complete') {
      beepAt(c, now, 880, 0.12, peak);
      beepAt(c, now + 0.15, 1175, 0.12, peak);
      beepAt(c, now + 0.30, 1568, 0.2, peak);
    } else {
      // Koniec przerwy: wyraźna, wznosząca sekwencja „wracaj do sztangi".
      // Dwa ciche tony gubiły się na siłowni — teraz cztery, dłuższe, z domknięciem.
      beepAt(c, now, 880, 0.16, peak);
      beepAt(c, now + 0.20, 1175, 0.16, peak);
      beepAt(c, now + 0.40, 1568, 0.16, peak);
      beepAt(c, now + 0.62, 1568, 0.32, peak);
    }
  } catch (err) {
    reportClientErrorWithCurrentUid({
      code: 'timer-sound-synth-error',
      phase: 'other',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
};
