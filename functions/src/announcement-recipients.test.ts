import { describe, expect, it } from "vitest";
import { selectAnnouncementEmailRecipients, splitAnnouncementRecipients } from "./announcement-recipients";

// X35c (WP-E): prefs.announcements === false = bez pusha, ale mirror do
// dzwonka nadal (ogłoszenie zostaje w aplikacji).
describe("splitAnnouncementRecipients", () => {
  it("brak pola = push i dzwonek", () => {
    const result = splitAnnouncementRecipients([{ uid: "u1" }, { uid: "u2", notificationPrefs: {} }]);
    expect(result.inboxUids).toEqual(["u1", "u2"]);
    expect([...result.pushUids]).toEqual(["u1", "u2"]);
  });

  it("announcements: false = tylko dzwonek", () => {
    const result = splitAnnouncementRecipients([
      { uid: "u1", notificationPrefs: { announcements: false } },
      { uid: "u2", notificationPrefs: { announcements: true } },
    ]);
    expect(result.inboxUids).toEqual(["u1", "u2"]);
    expect([...result.pushUids]).toEqual(["u2"]);
  });

  it("inne przełączniki (dailyReminder) nie wpływają na ogłoszenia", () => {
    const result = splitAnnouncementRecipients([
      { uid: "u1", notificationPrefs: { dailyReminder: false } },
    ]);
    expect([...result.pushUids]).toEqual(["u1"]);
  });
});

// 2026-09-29: broadcast e-mail pomija wypisanych (notificationPrefs.announcementEmails
// === false) i konta bez adresu; brak pola = wysyłaj (jak reszta prefs).
describe("selectAnnouncementEmailRecipients", () => {
  it("pomija wypisanych i konta bez adresu, zachowuje uid do tokenu wypisu", () => {
    expect(selectAnnouncementEmailRecipients([
      { uid: "u1", email: "a@example.com" },
      { uid: "u2", email: "b@example.com", notificationPrefs: { announcementEmails: false } },
      { uid: "u3", email: "c@example.com", notificationPrefs: { announcementEmails: true, announcements: false } },
      { uid: "u4" },
      { uid: "u5", email: "" },
    ])).toEqual([
      { uid: "u1", email: "a@example.com" },
      { uid: "u3", email: "c@example.com" },
    ]);
  });
});
