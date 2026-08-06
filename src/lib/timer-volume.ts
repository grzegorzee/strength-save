// Głośność sygnałów timera w aplikacji (zgłoszenie usera 2026-08-06: „mam
// głośność na full a ledwo co było słychać" → regulacja + natywne granie, Z200/Z201).
//
// Ułamek 0.2-1.0 mnożony przez: volume natywnego AVAudioPlayer, gain WebAudio
// (plik) i szczyt syntezy. NIE dotyczy powiadomień systemowych przy zgaszonym
// ekranie — o nich decyduje systemowa głośność dzwonka iOS.
//
// Minimum 0.2, nie 0: pełne wyciszenie ma już swój przełącznik (Profil → Dźwięk);
// drugi stan „off" ukryty w suwaku to pułapka.

const KEY = 'fittracker_timer_volume_v1';

export const MIN_TIMER_VOLUME = 0.2;
export const DEFAULT_TIMER_VOLUME = 1;

export const clampTimerVolume = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_TIMER_VOLUME;
  return Math.min(1, Math.max(MIN_TIMER_VOLUME, value));
};

export const loadTimerVolume = (): number => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return DEFAULT_TIMER_VOLUME;
    return clampTimerVolume(Number(raw));
  } catch {
    return DEFAULT_TIMER_VOLUME;
  }
};

export const saveTimerVolume = (value: number): void => {
  try {
    window.localStorage.setItem(KEY, String(clampTimerVolume(value)));
  } catch { /* localStorage niedostępne — zostaje domyślna */ }
};
