import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import type { Notification } from '@capacitor-firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Rejestracja tokenu FCM użytkownika do powiadomień push (admin wysyła przez adminSendPush,
// codzienne przypomnienie przez dailyTrainingReminder). Web push = osobny temat (VAPID + SW).

export type PushPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';
export type PushRegistrationStatus = 'registered' | 'unsupported' | 'permission-required' | 'no-token' | 'error';

export interface PushRegistrationResult {
  status: PushRegistrationStatus;
  permission: PushPermission;
  tokenSaved: boolean;
  tokenSuffix?: string;
  error?: string;
}

async function saveToken(token: string): Promise<boolean> {
  try {
    await httpsCallable<{ token: string }, { success: boolean }>(functions, 'registerPushToken')({ token });
    return true;
  } catch (e) {
    console.error('[push] save token error', e);
    return false;
  }
}

/** Usuń token przypisany do bieżącego urządzenia przed zmianą konta. */
export async function unregisterPushForUser(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { token } = await FirebaseMessaging.getToken();
    if (!token) return;
    await httpsCallable<{ token: string }, { success: boolean }>(functions, 'unregisterPushToken')({ token });
  } catch (error) {
    console.warn('[push] token unregister failed', error);
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
export async function registerPushForUser(uid: string): Promise<PushRegistrationResult> {
  if (!Capacitor.isNativePlatform()) {
    return { status: 'unsupported', permission: 'unsupported', tokenSaved: false };
  }
  try {
    const { receive } = await FirebaseMessaging.checkPermissions();
    if (receive !== 'granted') {
      return { status: 'permission-required', permission: receive as PushPermission, tokenSaved: false };
    }
    const { token } = await FirebaseMessaging.getToken();
    if (!token) {
      return { status: 'no-token', permission: 'granted', tokenSaved: false };
    }
    const tokenSaved = await saveToken(token);
    if (!tokenSaved) {
      return {
        status: 'error',
        permission: 'granted',
        tokenSaved: false,
        error: 'TOKEN_SAVE_FAILED',
      };
    }
    return { status: 'registered', permission: 'granted', tokenSaved: true, tokenSuffix: token.slice(-8) };
  } catch (e) {
    console.error('[push] register error', e);
    return {
      status: 'error',
      permission: 'unsupported',
      tokenSaved: false,
      error: e instanceof Error ? e.message : 'Unknown push registration error',
    };
  }
}

/** Prosi o zgodę (świadoma akcja usera, np. z Ustawień) i rejestruje token. Zwraca czy włączono. */
export async function requestPushPermission(uid: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { receive } = await FirebaseMessaging.requestPermissions();
    if (receive !== 'granted') return false;
    const { token } = await FirebaseMessaging.getToken();
    return !!token && await saveToken(token);
  } catch (e) {
    console.error('[push] request error', e);
    return false;
  }
}

export function listenPushTokenRefresh(uid: string): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let handle: { remove: () => void } | null = null;
  void FirebaseMessaging.addListener('tokenReceived', (event: { token?: string }) => {
    if (event?.token) {
      void saveToken(event.token).then((saved) => {
        if (!saved) console.warn('[push] refreshed token was not saved');
      });
    }
  }).then((h) => { handle = h; });
  return () => { handle?.remove(); };
}

export function listenForegroundPush(onNotification: (notification: Notification) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  let handle: { remove: () => void } | null = null;
  void FirebaseMessaging.addListener('notificationReceived', (event) => {
    if (event.notification) onNotification(event.notification);
  }).then((h) => { handle = h; });
  return () => { handle?.remove(); };
}
