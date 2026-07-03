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
