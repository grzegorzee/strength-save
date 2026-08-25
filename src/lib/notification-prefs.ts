// X35c (WP-E): jeden spis typów powiadomień + kanałów. Brak pola w
// users/{uid}.notificationPrefs = WŁĄCZONE (jak dotąd dailyReminder !== false),
// więc istniejące konta nie tracą żadnego powiadomienia po wydaniu.
// Backend (functions) czyta te same klucze: dailyReminder, weeklyDigest,
// photoReminder, modeEnding, prPush, announcements.

export const NOTIFICATION_PREF_KEYS = [
  'dailyReminder',
  'prPush',
  'photoReminder',
  'modeEnding',
  'announcements',
  'weeklyDigest',
] as const;

export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number];

export type NotificationPrefs = Partial<Record<NotificationPrefKey, boolean>>;

export type NotificationChannel = 'push' | 'email' | 'inApp';

export const NOTIFICATION_PREF_CHANNELS: Record<NotificationPrefKey, readonly NotificationChannel[]> = {
  dailyReminder: ['push'],
  prPush: ['push', 'inApp'],
  photoReminder: ['push', 'inApp'],
  modeEnding: ['push'],
  // Wyłączenie ogłoszeń = brak pusha; wpis w dzwonku zostaje (mirror adminSendPush).
  announcements: ['push', 'inApp'],
  weeklyDigest: ['email'],
};

export const isNotificationPrefEnabled = (
  prefs: NotificationPrefs | null | undefined,
  key: NotificationPrefKey,
): boolean => prefs?.[key] !== false;
