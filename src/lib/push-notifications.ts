import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

// Rejestracja tokenu FCM użytkownika do powiadomień push (admin wysyła przez adminSendPush).
// Web push = osobny temat (VAPID + service worker) — tu obsługujemy natywne iOS/Android.

async function saveToken(uid: string, token: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) });
  } catch (e) {
    console.error('[push] save token error', e);
  }
}

export async function registerPushForUser(uid: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive !== 'granted') return;
    const { token } = await FirebaseMessaging.getToken();
    if (token) await saveToken(uid, token);
  } catch (e) {
    console.error('[push] register error', e);
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
