import { describe, expect, it } from "vitest";
import { splitAnnouncementRecipients } from "./announcement-recipients";

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
