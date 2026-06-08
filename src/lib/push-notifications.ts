import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

// Rejestracja tokenu FCM użytkownika do powiadomień push (admin wysyła przez adminSendPush,
// codzienne przypomnienie przez dailyTrainingReminder). Web push = osobny temat (VAPID + SW).

export type PushPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

async function saveToken(uid: string, token: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) });
  } catch (e) {
    console.error('[push] save token error', e);
  }
}

/** Aktualny status zgody (bez pytania). */
export async function getPushPermission(): Promise<PushPermission> {
  if (!Capacitor.isNativePlatform()) return 'unsupported';
  try {
    const { receive } = await FirebaseMessaging.checkPermissions();
    return receive as PushPermission;
  } catch {
    return 'unsupported';
  }
}

/** Rejestruje token JEŚLI zgoda już udzielona (bez wyświetlania prośby). Wołane przy starcie. */
export async function registerPushForUser(uid: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { receive } = await FirebaseMessaging.checkPermissions();
    if (receive !== 'granted') return;
    const { token } = await FirebaseMessaging.getToken();
    if (token) await saveToken(uid, token);
  } catch (e) {
    console.error('[push] register error', e);
  }
}

/** Prosi o zgodę (świadoma akcja usera, np. z Ustawień) i rejestruje token. Zwraca czy włączono. */
export async function requestPushPermission(uid: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { receive } = await FirebaseMessaging.requestPermissions();
    if (receive !== 'granted') return false;
    const { token } = await FirebaseMessaging.getToken();
    if (token) await saveToken(uid, token);
    return true;
  } catch (e) {
    console.error('[push] request error', e);
    return false;
  }
}

export function listenPushTokenRefresh(uid: string): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let handle: { remove: () => void } | null = null;
  void FirebaseMessaging.addListener('tokenReceived', (event: { token?: string }) => {
    if (event?.token) void saveToken(uid, event.token);
  }).then((h) => { handle = h; });
  return () => { handle?.remove(); };
}
