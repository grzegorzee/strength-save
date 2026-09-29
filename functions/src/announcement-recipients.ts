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

// 2026-09-29: broadcast e-mail admina. Wypisani (notificationPrefs.announcementEmails
// === false, przełącznik w Profilu albo one-click z nagłówka List-Unsubscribe)
// i konta bez adresu odpadają. Brak pola = wysyłaj.
export interface AnnouncementEmailCandidate {
  uid: string;
  email?: string | null;
  notificationPrefs?: { announcementEmails?: boolean } & Record<string, unknown>;
}

export function selectAnnouncementEmailRecipients(
  users: AnnouncementEmailCandidate[],
): Array<{ uid: string; email: string }> {
  return users
    .filter((user) => typeof user.email === "string" && user.email !== "")
    .filter((user) => user.notificationPrefs?.announcementEmails !== false)
    .map((user) => ({ uid: user.uid, email: user.email as string }));
}
