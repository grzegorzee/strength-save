// Flagi funkcji. Źródłem prawdy są zmienne środowiskowe budowania.
//
// X17C: w trybie E2E (i TYLKO w nim) flagę da się nadpisać przez localStorage.
// Bez tego nie da się przetestować timerów przerw end-to-end: jadą za flagą
// wyłączoną domyślnie (do czasu zielonego testu na fizycznym iPhone), a
// włączenie ich globalnie w e2e zabiłoby test pilnujący, że przy wyłączonej
// fladze timerów w apce NIE MA.
const E2E_FLAG_PREFIX = 'fittracker_e2e_flag_';

const e2eOverride = (name: string): boolean | null => {
  if (import.meta.env.VITE_E2E_MODE !== 'true') return null;
  try {
    const raw = window.localStorage.getItem(`${E2E_FLAG_PREFIX}${name}`);
    return raw === null ? null : raw === 'true';
  } catch {
    return null;
  }
};

export const FEATURE_FLAGS = {
  get workoutTimers(): boolean {
    return e2eOverride('workoutTimers') ?? import.meta.env.VITE_FEATURE_WORKOUT_TIMERS === 'true';
  },
} as const;
