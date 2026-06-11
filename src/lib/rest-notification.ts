import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Powiadomienie lokalne "koniec przerwy" (iOS/Android). JS w WKWebView jest wstrzymywany
// po zgaszeniu ekranu, więc haptic/dźwięk z setInterval NIE odpali się w tle — system musi
// dostarczyć alert sam. Planujemy powiadomienie na deadline timera; gdy timer kończy się
// w foregroundzie (JS żyje), anulujemy je i gramy in-app dźwięk + haptic jak dotąd.

const REST_NOTIFICATION_ID = 90001;

let permissionGranted: boolean | null = null;

const ensurePermission = async (): Promise<boolean> => {
  if (permissionGranted !== null) return permissionGranted;
  try {
    let status = await LocalNotifications.checkPermissions();
    if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
      status = await LocalNotifications.requestPermissions();
    }
    permissionGranted = status.display === 'granted';
  } catch {
    permissionGranted = false;
  }
  return permissionGranted;
};

/** Zaplanuj systemowe powiadomienie (dźwięk + wibracja) na koniec przerwy za `seconds` sekund. */
export const scheduleRestEndNotification = async (
  seconds: number,
  title: string,
  body: string
): Promise<void> => {
  if (!Capacitor.isNativePlatform() || seconds <= 0) return;
  if (!(await ensurePermission())) return;

  try {
    // Nadpisz ewentualne wcześniejsze (jeden aktywny timer przerwy naraz).
    await cancelRestEndNotification();
    await LocalNotifications.schedule({
      notifications: [{
        id: REST_NOTIFICATION_ID,
        title,
        body,
        schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true },
        sound: 'default',
      }],
    });
  } catch {
    // Brak local notifications — koniec przerwy zasygnalizuje tylko in-app dźwięk/haptic.
  }
};

/** Anuluj zaplanowane powiadomienie końca przerwy (pauza/reset/zamknięcie/koniec w foreground). */
export const cancelRestEndNotification = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
  } catch {
    // Nic do anulowania.
  }
};
