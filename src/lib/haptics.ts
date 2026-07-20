import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// Haptyka odhaczenia serii i ukończenia treningu (Z82).
// Web: no-op (Vibration API celowo pominięte — lekki impact per seria byłby
// nachalny w przeglądarce; mocna wibracja końca ćwiczenia żyje w ExerciseCard).

/** Lekki impact przy odhaczeniu serii. Fire-and-forget. */
export const hapticImpactLight = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptyka niedostępna — pomijamy.
  }
};

/** Notification success przy ukończeniu treningu. Fire-and-forget. */
export const hapticSuccess = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Haptyka niedostępna — pomijamy.
  }
};

/**
 * Koniec przerwy: MOCNY, wyczuwalny przez kieszeń sygnał.
 *
 * Wcześniej leciał tu `hapticImpactLight` — user zgłosił po realnym treningu
 * „cicha wibracja, nic więcej". Lekki impuls jest z założenia subtelny, a przy
 * telefonie w kieszeni po prostu ginie. Teraz: trzy ciężkie uderzenia w odstępach,
 * poprzedzone notyfikacyjnym wzorcem systemowym.
 */
export const hapticRestEnd = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
    return;
  }
  try {
    await Haptics.notification({ type: NotificationType.Warning });
    for (let i = 0; i < 3; i += 1) {
      await new Promise((r) => setTimeout(r, 180));
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  } catch {
    // Haptyka niedostępna — zostaje dźwięk i powiadomienie systemowe.
  }
};
