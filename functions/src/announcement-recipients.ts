// X35c (WP-E): podział odbiorców broadcastu admina. Wyłączone
// notificationPrefs.announcements = bez pusha; mirror do dzwonka (user_events)
// dostają WSZYSCY z targetu, bo wpis w aplikacji nie przerywa i user sam
// decyduje, kiedy go przeczyta. Brak pola = włączone (jak reszta prefs).

export interface AnnouncementRecipient {
  uid: string;
  notificationPrefs?: { announcements?: boolean } & Record<string, unknown>;
}

export interface AnnouncementRecipientSplit {
  inboxUids: string[];
  pushUids: Set<string>;
}

export function splitAnnouncementRecipients(users: AnnouncementRecipient[]): AnnouncementRecipientSplit {
  const inboxUids = users.map((user) => user.uid);
  const pushUids = new Set(
    users
      .filter((user) => user.notificationPrefs?.announcements !== false)
      .map((user) => user.uid),
  );
  return { inboxUids, pushUids };
}
