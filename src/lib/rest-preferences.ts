import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  hasStoredRestSettings,
  loadRestSettings,
  saveRestSettings,
  type RestSettings,
} from '@/lib/rest-timer';

// X35b: JEDNO źródło prawdy o przerwach = users/{uid}.preferences.rest
// (obiekt RestSettings). Do X35a były trzy magazyny tej samej rzeczy:
// RestSettingsCard -> localStorage, preferences.restTimerSec z Profilu /
// WorkoutSettingsSheet, mirror w PreferenceSync. Teraz: chmura jest źródłem,
// localStorage (REST_SETTINGS_STORAGE_KEY) zostaje cache offline per urządzenie
// (RestBar / ExerciseCard / zegarek czytają cache przez loadRestSettings).
// `preferences.restTimerSec` = pole legacy, tylko do odczytu; nic go już nie pisze.

/** Kształt do Firestore: bez undefined (Firestore odrzuca), custom zawsze bool. */
export const toRestPreference = (settings: RestSettings) => ({
  workingSeconds: settings.workingSeconds,
  warmupSeconds: settings.warmupSeconds,
  betweenExercisesSeconds: settings.betweenExercisesSeconds,
  perExercise: settings.perExercise,
  custom: settings.custom === true,
});

/**
 * Zapis przerw: cache localStorage NAJPIERW (offline wystarcza), potem
 * preferences.rest. Brak sieci = cichy fail; następny zapis dosynchronizuje.
 */
export const persistRestSettings = async (uid: string | null | undefined, settings: RestSettings): Promise<void> => {
  saveRestSettings(settings);
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'users', uid), { 'preferences.rest': toRestPreference(settings) });
  } catch {
    // offline / brak uprawnień — cache zostaje, chmura dogoni przy następnej zmianie
  }
};

/**
 * Migracja przy pierwszym odczycie profilu bez `preferences.rest`: buduje
 * ustawienia z legacy `restTimerSec` (jeśli jest) albo z cache localStorage.
 * `null` = nie ma czego przenosić (świeży user bez żadnego zapisu): brak pola
 * znaczy "polecane", start cyklu je ustawi. Wartości przeniesione z jawnego
 * zapisu usera dostają `custom: true` — bez tego start cyklu nadpisałby czasy,
 * które user kiedyś świadomie wybrał (migracja "bez utraty").
 */
export const buildMigratedRestSettings = (
  prefs: { restTimerSec?: number } | undefined,
): RestSettings | null => {
  const legacySec = prefs?.restTimerSec;
  const hasLegacy = typeof legacySec === 'number' && Number.isFinite(legacySec) && legacySec > 0;
  const hasLocal = hasStoredRestSettings();
  if (!hasLegacy && !hasLocal) return null;
  const local = loadRestSettings();
  return {
    ...local,
    ...(hasLegacy ? { workingSeconds: legacySec } : {}),
    custom: true,
  };
};

/** Zależności dla cycle-actions (start cyklu ustawia polecane, chyba że custom). */
export const restDefaultsDeps = (uid: string) => ({
  current: loadRestSettings(),
  save: (rest: RestSettings) => persistRestSettings(uid, rest),
});
