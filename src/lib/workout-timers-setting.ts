// Z157: ustawienie usera "Timer przerwy" (Profil → Preferencje treningowe).
// Wzorem keep-awake: persystencja per urządzenie w localStorage, świadomie BEZ
// mirrora do Firestore. Default WŁĄCZONY — decyzja usera 2026-07-28 ("działał super").

const KEY = 'fittracker_workout_timers_v1';

/** null = user nic nie ustawił (obowiązuje default z feature-flags). */
export const readWorkoutTimersSetting = (): boolean | null => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === null ? null : raw === 'true';
  } catch {
    return null;
  }
};

export const setWorkoutTimersEnabled = (enabled: boolean): void => {
  try {
    window.localStorage.setItem(KEY, enabled ? 'true' : 'false');
  } catch { /* localStorage niedostępne — zostaje domyślka */ }
};
