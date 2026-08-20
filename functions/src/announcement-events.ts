// T15: ogłoszenia od twórcy w dzwonku (mirror adminSendPush -> user_events).
// JEDEN wspólny klucz per broadcast (now liczone RAZ w onCall, nie per uid):
// retry tego samego wywołania nie dubluje wpisów (create + already-exists),
// a dwa różne ogłoszenia mają różne klucze.
export interface AnnouncementInput {
  title: string;
  body: string;
  now: number;
}

export interface AnnouncementUserEvent {
  uid: string;
  event: {
    type: "announcement";
    key: string;
    payload: { title: string; body: string };
    deepLink: null;
  };
}

export const announcementEventKey = (now: number): string => `announcement-${now}`;

export function buildAnnouncementEvents(uids: string[], input: AnnouncementInput): AnnouncementUserEvent[] {
  const key = announcementEventKey(input.now);
  return uids.map((uid) => ({
    uid,
    event: {
      type: "announcement",
      key,
      payload: { title: input.title, body: input.body },
      deepLink: null,
    },
  }));
}
