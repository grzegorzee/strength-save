import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { emitUserEvent, syncEventKey } from '@/lib/user-events';

// WP-C (X38): sygnał po ODROCZONYM zapisie treningu w chmurze. Zakończenie
// offline jest ciche (celebracja jak zwykle, bez toastu "zapisano lokalnie");
// gdy AutoSync w końcu doniesie trening do chmury, user dostaje DOKŁADNIE jeden
// sygnał per sesja:
// - apka widoczna: wpis do dzwonka (user_events, typ 'sync') + krótki toast,
// - apka w tle (web hidden / native nieaktywna) i zapis >= 2 min po zakończeniu:
//   systemowe powiadomienie BEZ dźwięku (pole sound pominięte = cisza, zasada 10),
// - w tle, ale szybciej niż 2 min: tylko wpis do dzwonka (user zobaczy po powrocie).
// Idempotencja: klucz localStorage fittracker_sync_notified_v1 (lista sessionId,
// cap 20) + deterministyczny id user_events (dayId+date).

export const SYNC_NOTIFIED_STORAGE_KEY = 'fittracker_sync_notified_v1';
export const SYNC_DEFERRED_THRESHOLD_MS = 2 * 60_000;
const SYNC_NOTIFICATION_ID = 90003;
const MAX_REMEMBERED_SESSIONS = 20;

export interface DeferredSyncInfo {
  sessionId: string;
  dayId: string;
  date: string;
  dayName: string;
  /** Moment lokalnego zakończenia treningu (draft.finalizedAt). */
  finalizedAt: number | null;
}

export type SyncNotificationMode = 'none' | 'in-app' | 'system' | 'inbox-only';

const readNotified = (): string[] => {
  try {
    const raw = localStorage.getItem(SYNC_NOTIFIED_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    return typeof parsed === 'string' ? [parsed] : [];
  } catch {
    return [];
  }
};

export const wasSyncNotified = (sessionId: string): boolean => readNotified().includes(sessionId);

export const markSyncNotified = (sessionId: string): void => {
  try {
    const next = [sessionId, ...readNotified().filter((id) => id !== sessionId)].slice(0, MAX_REMEMBERED_SESSIONS);
    localStorage.setItem(SYNC_NOTIFIED_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort: brak storage = co najwyżej powtórny sygnał
  }
};

/** Czysta decyzja (testowalna): jaki sygnał należy się po udanym odroczonym syncu. */
export const decideSyncNotification = (input: {
  sessionId: string;
  finalizedAt: number | null;
  now: number;
  appVisible: boolean;
  native: boolean;
  alreadyNotified: boolean;
}): SyncNotificationMode => {
  if (input.alreadyNotified) return 'none';
  if (input.appVisible) return 'in-app';
  const deferredLongEnough = input.finalizedAt !== null && input.now - input.finalizedAt >= SYNC_DEFERRED_THRESHOLD_MS;
  return deferredLongEnough && input.native ? 'system' : 'inbox-only';
};

export interface SyncNotificationDeps {
  now?: () => number;
  isAppVisible?: () => boolean;
  isNative?: () => boolean;
  showToast: (title: string, body: string) => void;
  t: (key: 'sync.cloudSavedTitle' | 'sync.cloudSavedBody', params?: Record<string, string | number>) => string;
  emitEvent?: typeof emitUserEvent;
  scheduleSystem?: (title: string, body: string) => Promise<void>;
}

const scheduleSilentSystemNotification = async (title: string, body: string): Promise<void> => {
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: [{
        id: SYNC_NOTIFICATION_ID,
        title,
        body,
        // Bez pola sound: iOS nie ustawia content.sound, czyli cisza (zasada 10).
        schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
      }],
    });
  } catch {
    // Brak pluginu/uprawnień: wpis do dzwonka i tak został zapisany.
  }
};

/**
 * Wołane przez AutoSync po udanym finalu sesji, która czekała w kolejce.
 * Zwraca użyty tryb (do telemetrii/testów). Nigdy nie rzuca.
 */
export const notifyDeferredSyncSuccess = async (
  userId: string,
  info: DeferredSyncInfo,
  deps: SyncNotificationDeps,
): Promise<SyncNotificationMode> => {
  const now = deps.now ?? Date.now;
  const isAppVisible = deps.isAppVisible ?? (() => typeof document === 'undefined' || document.visibilityState === 'visible');
  const isNative = deps.isNative ?? (() => Capacitor.isNativePlatform());
  const emitEvent = deps.emitEvent ?? emitUserEvent;
  const scheduleSystem = deps.scheduleSystem ?? scheduleSilentSystemNotification;

  const mode = decideSyncNotification({
    sessionId: info.sessionId,
    finalizedAt: info.finalizedAt,
    now: now(),
    appVisible: isAppVisible(),
    native: isNative(),
    alreadyNotified: wasSyncNotified(info.sessionId),
  });
  if (mode === 'none') return mode;

  markSyncNotified(info.sessionId);
  const title = deps.t('sync.cloudSavedTitle');
  const body = deps.t('sync.cloudSavedBody', { day: info.dayName || info.date });

  if (mode === 'in-app') {
    deps.showToast(title, body);
  } else if (mode === 'system') {
    await scheduleSystem(title, body);
  }

  // Dzwonek zawsze (serwer = źródło prawdy między urządzeniami, idempotentny id).
  // Fire-and-forget: zapis SDK może wisieć przy słabej sieci, a sygnał w UI
  // już poszedł; emitUserEvent sam łyka błędy (duplikat/offline).
  void emitEvent(userId, {
    type: 'sync',
    key: syncEventKey(info.dayId, info.date),
    payload: { dayName: info.dayName, date: info.date, sessionId: info.sessionId },
    deepLink: '/history',
    createdAt: now(),
  });
  return mode;
};
