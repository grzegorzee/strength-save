import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import type { Notification } from '@capacitor-firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { functions, firebaseConfig } from './firebase';
import {
  hashPushToken,
  shouldRegisterPushToken,
  readPushRegistrationState,
  markPushTokenConfirmed,
  clearPushRegistrationState,
} from './push-registration-state';

// Rejestracja tokenu FCM użytkownika do powiadomień push (admin wysyła przez adminSendPush,
// codzienne przypomnienie przez dailyTrainingReminder). Web push: VAPID z env
// (VITE_FIREBASE_VAPID_KEY) + firebase-messaging-sw.js rejestrowany z własnym
// scope (fcm/) obok SW workboxa. Brak klucza VAPID = web zachowuje się jak dotąd
// ('unsupported'), zero regresji.

const WEB_VAPID_KEY: string = typeof import.meta.env.VITE_FIREBASE_VAPID_KEY === 'string'
  ? import.meta.env.VITE_FIREBASE_VAPID_KEY
  : '';

const isWebPushSupported = (): boolean => (
  !Capacitor.isNativePlatform()
  && WEB_VAPID_KEY !== ''
  && typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'Notification' in window
  && 'PushManager' in window
);

// FCM na gh-pages nie może użyć domyślnej ścieżki /firebase-messaging-sw.js
// (root domeny poza naszą kontrolą) — rejestrujemy SW spod base z własnym scope.
const registerWebPushWorker = async (): Promise<ServiceWorkerRegistration> => {
  const base = import.meta.env.BASE_URL;
  const config = encodeURIComponent(JSON.stringify(firebaseConfig));
  return navigator.serviceWorker.register(
    `${base}firebase-messaging-sw.js?config=${config}`,
    { scope: `${base}fcm/` },
  );
};

const getWebPushToken = async (): Promise<string | null> => {
  const registration = await registerWebPushWorker();
  await navigator.serviceWorker.ready.catch(() => undefined);
  const { token } = await FirebaseMessaging.getToken({
    vapidKey: WEB_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  return token || null;
};

export type PushPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';
export type PushRegistrationStatus = 'registered' | 'unsupported' | 'permission-required' | 'no-token' | 'error';

export interface PushRegistrationResult {
  status: PushRegistrationStatus;
  permission: PushPermission;
  tokenSaved: boolean;
  tokenSuffix?: string;
  error?: string;
}

const deviceId = (): string => {
  const key = 'strength-save:push-device-id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(key, next);
  return next;
};

// Z212: backend wołamy tylko po zmianie tokenu/uid albo po 30 dniach od
// potwierdzenia. Refresh z nowym tokenem ma inny hash, więc idzie natychmiast.
// `force` (świadoma akcja usera z Ustawień) pomija dedup — wyjście z każdego
// zablokowanego stanu bez czekania 30 dni.
async function saveToken(uid: string, token: string, opts: { force?: boolean } = {}): Promise<boolean> {
  try {
    const tokenHash = await hashPushToken(token);
    const now = Date.now();
    if (!opts.force && !shouldRegisterPushToken(readPushRegistrationState(), tokenHash, uid, now)) {
      return true; // token potwierdzony niedawno dla tego uid — zero callable
    }
    await httpsCallable<{ token: string; deviceId: string }, { success: boolean }>(functions, 'registerPushToken')({ token, deviceId: deviceId() });
    markPushTokenConfirmed(tokenHash, uid, now);
    return true;
  } catch (e) {
    console.error('[push] save token error', e);
    return false;
  }
}

/** Usuń token przypisany do bieżącego urządzenia przed zmianą konta. */
export async function unregisterPushForUser(): Promise<void> {
  if (!Capacitor.isNativePlatform() && !isWebPushSupported()) {
    clearPushRegistrationState(); // Z212: logout zawsze usuwa stan poprzedniego uid
    return;
  }
  try {
    const token = Capacitor.isNativePlatform()
      ? (await FirebaseMessaging.getToken()).token
      : Notification.permission === 'granted' ? await getWebPushToken() : null;
    if (!token) {
      clearPushRegistrationState();
      return;
    }
    await httpsCallable<{ token: string }, { success: boolean }>(functions, 'unregisterPushToken')({ token });
    clearPushRegistrationState();
  } catch (error) {
    throw new Error(`PUSH_TOKEN_REVOKE_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Aktualny status zgody (bez pytania). */
export async function getPushPermission(): Promise<PushPermission> {
  if (!Capacitor.isNativePlatform()) {
    if (!isWebPushSupported()) return 'unsupported';
    return Notification.permission === 'default' ? 'prompt' : (Notification.permission as PushPermission);
  }
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
    if (!isWebPushSupported()) {
      return { status: 'unsupported', permission: 'unsupported', tokenSaved: false };
    }
    if (Notification.permission !== 'granted') {
      const permission = Notification.permission === 'default' ? 'prompt' : 'denied';
      return { status: 'permission-required', permission, tokenSaved: false };
    }
    try {
      const token = await getWebPushToken();
      if (!token) return { status: 'no-token', permission: 'granted', tokenSaved: false };
      const tokenSaved = await saveToken(uid, token);
      return tokenSaved
        ? { status: 'registered', permission: 'granted', tokenSaved: true, tokenSuffix: token.slice(-8) }
        : { status: 'error', permission: 'granted', tokenSaved: false, error: 'TOKEN_SAVE_FAILED' };
    } catch (e) {
      console.error('[push] web register error', e);
      return { status: 'error', permission: 'granted', tokenSaved: false, error: e instanceof Error ? e.message : 'web push error' };
    }
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
    const tokenSaved = await saveToken(uid, token);
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
  if (!Capacitor.isNativePlatform()) {
    if (!isWebPushSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
      const token = await getWebPushToken();
      return !!token && await saveToken(uid, token, { force: true });
    } catch (e) {
      console.error('[push] web request error', e);
      return false;
    }
  }
  try {
    const { receive } = await FirebaseMessaging.requestPermissions();
    if (receive !== 'granted') return false;
    const { token } = await FirebaseMessaging.getToken();
    return !!token && await saveToken(uid, token, { force: true });
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
      // Z212: nowy token = inny hash = natychmiastowa rejestracja; ten sam
      // token (iOS emituje event przy każdym getToken) = dedup, zero callable.
      void saveToken(uid, event.token).then((saved) => {
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
