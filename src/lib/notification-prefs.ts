// X35c (WP-E): jeden spis typów powiadomień + kanałów. Brak pola w
// users/{uid}.notificationPrefs = WŁĄCZONE (jak dotąd dailyReminder !== false),
// więc istniejące konta nie tracą żadnego powiadomienia po wydaniu.
// Backend (functions) czyta te same klucze: dailyReminder, weeklyDigest,
// photoReminder, modeEnding, prPush, announcements, announcementEmails.
// 2026-09-29: announcementEmails = osobna zgoda na ogłoszenia e-mail (broadcast
// admina); ustawia ją też one-click unsubscribe z nagłówka List-Unsubscribe.

export const NOTIFICATION_PREF_KEYS = [
  'dailyReminder',
  'prPush',
  'photoReminder',
  'modeEnding',
  'announcements',
  'announcementEmails',
  'weeklyDigest',
] as const;

export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];

/**
 * 2026-09-30: typy tylko dla konta właściciela (push o zakupach). Poza listą
 * ogólną, żeby zwykły user nadal widział dokładnie NOTIFICATION_PREF_KEYS.
 * Backend (functions/src/subscription-alerts.ts) czyta subscriptionAlerts.
 */
export const OWNER_NOTIFICATION_PREF_KEYS = ['subscriptionAlerts'] as const;

export type OwnerNotificationPrefKey = (typeof OWNER_NOTIFICATION_PREF_KEYS)[number];

export type NotificationPrefs = Partial<Record<NotificationPrefKey | OwnerNotificationPrefKey, boolean>>;

export type NotificationChannel = 'push' | 'email' | 'inApp';

export const NOTIFICATION_PREF_CHANNELS: Record<NotificationPrefKey, readonly NotificationChannel[]> = {
  dailyReminder: ['push'],
  prPush: ['push', 'inApp'],
  photoReminder: ['push', 'inApp'],
  modeEnding: ['push'],
  // Wyłączenie ogłoszeń = brak pusha; wpis w dzwonku zostaje (mirror adminSendPush).
  announcements: ['push', 'inApp'],
  announcementEmails: ['email'],
  weeklyDigest: ['email'],
};

/** Mapper profilu: tylko znane klucze z wartością boolean (brak = undefined). */
export const sanitizeNotificationPrefs = (raw: unknown): NotificationPrefs | undefined => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const source = raw as Record<string, unknown>;
  const prefs: NotificationPrefs = {};
  for (const key of [...NOTIFICATION_PREF_KEYS, ...OWNER_NOTIFICATION_PREF_KEYS]) {
    if (typeof source[key] === 'boolean') prefs[key] = source[key] as boolean;
  }
  return Object.keys(prefs).length > 0 ? prefs : undefined;
};

export const isNotificationPrefEnabled = (
  prefs: NotificationPrefs | null | undefined,
  key: NotificationPrefKey | OwnerNotificationPrefKey,
): boolean => prefs?.[key] !== false;
