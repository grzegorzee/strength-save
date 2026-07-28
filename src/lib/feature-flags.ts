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

import { readWorkoutTimersSetting } from '@/lib/workout-timers-setting';

export const FEATURE_FLAGS = {
  // Z157: timer przerwy — precedencja: e2e override > ustawienie usera (Profil) >
  // default WŁĄCZONY (build może go zgasić jawnym VITE_FEATURE_WORKOUT_TIMERS=false).
  get workoutTimers(): boolean {
    return (
      e2eOverride('workoutTimers')
      ?? readWorkoutTimersSetting()
      ?? import.meta.env.VITE_FEATURE_WORKOUT_TIMERS !== 'false'
    );
  },
  // Z157: EMOM/AMRAP + timer rozgrzewki — osobna flaga buildowa, default OFF.
  // Mają tylko setInterval, przy zgaszonym ekranie milkną (dług Z10); warunek
  // zdjęcia flagi: sygnały przez local notifications.
  get intervalTimers(): boolean {
    return e2eOverride('intervalTimers') ?? import.meta.env.VITE_FEATURE_INTERVAL_TIMERS === 'true';
  },
} as const;
