import { describe, expect, it } from "vitest";
import { computePurgeAfter, isScheduledDeletionDue, SELF_DELETE_GRACE_DAYS } from "./registration";
import { selfDeletionNoticeHtml, selfDeletionNoticeSubject } from "./email-templates";

// Z238: samodzielne usunięcie konta = Auth od razu, purge danych po 30 dniach karencji.

describe("computePurgeAfter (Z238)", () => {
  it("wyznacza datę purge dokładnie o SELF_DELETE_GRACE_DAYS dni później", () => {
    const now = Date.parse("2026-08-11T12:00:00.000Z");
    expect(computePurgeAfter(now)).toBe("2026-09-10T12:00:00.000Z");
    expect(SELF_DELETE_GRACE_DAYS).toBe(30);
  });
});

describe("isScheduledDeletionDue (Z238)", () => {
  const now = "2026-09-10T12:00:00.000Z";

  it("scheduled po terminie -> due", () => {
    expect(isScheduledDeletionDue({ state: "scheduled", purgeAfter: "2026-09-10T11:59:59.000Z" }, now)).toBe(true);
    expect(isScheduledDeletionDue({ state: "scheduled", purgeAfter: now }, now)).toBe(true);
  });

  it("scheduled przed terminem -> NIE purguje (karencja chroni dane)", () => {
    expect(isScheduledDeletionDue({ state: "scheduled", purgeAfter: "2026-09-10T12:00:00.001Z" }, now)).toBe(false);
  });

  it("stany pending/failed/completed nie wchodzą w ścieżkę scheduled", () => {
    expect(isScheduledDeletionDue({ state: "pending", purgeAfter: "2020-01-01T00:00:00.000Z" }, now)).toBe(false);
    expect(isScheduledDeletionDue({ state: "failed", purgeAfter: "2020-01-01T00:00:00.000Z" }, now)).toBe(false);
    expect(isScheduledDeletionDue({ state: "completed", purgeAfter: "2020-01-01T00:00:00.000Z" }, now)).toBe(false);
  });

  it("brak purgeAfter (stare operacje) nigdy nie jest due", () => {
    expect(isScheduledDeletionDue({ state: "scheduled" }, now)).toBe(false);
  });
});

describe("selfDeletionNotice templates (Z238)", () => {
  it("temat zawiera email użytkownika", () => {
    expect(selfDeletionNoticeSubject("user@example.com")).toContain("user@example.com");
  });

  it("html zawiera email, uid, datę purge i instrukcję anulowania, z escapem HTML", () => {
    const html = selfDeletionNoticeHtml("user+<x>@example.com", "uid-123", "2026-09-10T12:00:00.000Z");
    expect(html).toContain("user+&lt;x&gt;@example.com");
    expect(html).toContain("uid-123");
    expect(html).toContain("2026-09-10");
    expect(html).toContain("deletion_operations/uid-123");
    expect(html).not.toContain("<x>");
  });
});
