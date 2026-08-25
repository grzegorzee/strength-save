import { describe, expect, it, vi } from "vitest";
import { runPhotoReminder, type PhotoReminderDeps } from "./photo-reminder";

// WP-D D4: po miesiącu treningu JEDNORAZOWE przypomnienie "dodaj fotkę i zrób
// before/after" — push + dzwonek in-app (user_events, typ announcement).
// Wzorzec reduced-mode-push: DI-testowalny rdzeń + wrapper onSchedule.

const TODAY = "2026-08-21";

const baseDeps = (overrides: Partial<PhotoReminderDeps> = {}): PhotoReminderDeps => ({
  listCandidates: async () => [
    { uid: "u1", user: { displayName: "Grzesiek", language: "pl", status: "active" } },
  ],
  getFirstWorkoutDate: async () => "2026-07-01",
  hasBodyPhoto: async () => false,
  listTokenRegistrations: async () => [
    { id: "r1", userId: "u1", token: "t1" },
    { id: "r2", userId: "u2", token: "t2" },
  ],
  sendMulticast: vi.fn(async (tokens: string[]) => ({
    successCount: tokens.length,
    failureCount: 0,
    responses: tokens.map(() => ({ success: true })),
  })),
  deleteRegistrations: vi.fn(async () => {}),
  writeUserEvent: vi.fn(async () => {}),
  markReminderSent: vi.fn(async () => {}),
  today: () => TODAY,
  ...overrides,
});

describe("runPhotoReminder", () => {
  it("user z pierwszym treningiem >=30 dni temu i bez zdjęć dostaje push + event + znacznik", async () => {
    const deps = baseDeps();
    const result = await runPhotoReminder(deps);

    expect(result.eligible).toBe(1);
    expect(result.sent).toBe(1);
    expect(deps.sendMulticast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.sendMulticast).mock.calls[0][0]).toEqual(["t1"]);
    expect(vi.mocked(deps.sendMulticast).mock.calls[0][1]).toContain("Miesiąc treningów");
    expect(deps.writeUserEvent).toHaveBeenCalledWith("u1", expect.objectContaining({
      type: "announcement",
      key: "photo-reminder",
      deepLink: "/measurements",
      payload: expect.objectContaining({ title: expect.stringContaining("Miesiąc treningów") }),
    }));
    expect(deps.markReminderSent).toHaveBeenCalledWith("u1", TODAY);
  });

  it("user ze zdjęciem sylwetki NIE dostaje przypomnienia", async () => {
    const deps = baseDeps({ hasBodyPhoto: async () => true });
    const result = await runPhotoReminder(deps);

    expect(result.eligible).toBe(0);
    expect(deps.sendMulticast).not.toHaveBeenCalled();
    expect(deps.writeUserEvent).not.toHaveBeenCalled();
    expect(deps.markReminderSent).not.toHaveBeenCalled();
  });

  it("user ze znacznikiem photoReminderSentAt NIE dostaje ponownie (defensywnie)", async () => {
    const deps = baseDeps({
      listCandidates: async () => [
        { uid: "u1", user: { status: "active", photoReminderSentAt: "2026-08-01" } },
      ],
    });
    const result = await runPhotoReminder(deps);

    expect(result.eligible).toBe(0);
    expect(deps.writeUserEvent).not.toHaveBeenCalled();
  });

  it("user z pierwszym treningiem 20 dni temu NIE dostaje (za wcześnie)", async () => {
    const deps = baseDeps({ getFirstWorkoutDate: async () => "2026-08-01" });
    const result = await runPhotoReminder(deps);

    expect(result.eligible).toBe(0);
    expect(deps.markReminderSent).not.toHaveBeenCalled();
  });

  it("user bez ukończonego treningu (null) NIE dostaje", async () => {
    const deps = baseDeps({ getFirstWorkoutDate: async () => null });
    expect((await runPhotoReminder(deps)).eligible).toBe(0);
  });

  it("dokładnie 30 dni od pierwszego treningu = kwalifikacja (>=30)", async () => {
    const deps = baseDeps({ getFirstWorkoutDate: async () => "2026-07-22" });
    expect((await runPhotoReminder(deps)).eligible).toBe(1);
  });

  it("bez tokenów push: dzwonek in-app + znacznik idą mimo braku pusha", async () => {
    const deps = baseDeps({ listTokenRegistrations: async () => [] });
    const result = await runPhotoReminder(deps);

    expect(result.eligible).toBe(1);
    expect(result.sent).toBe(0);
    expect(deps.writeUserEvent).toHaveBeenCalledTimes(1);
    expect(deps.markReminderSent).toHaveBeenCalledWith("u1", TODAY);
  });

  // X35c (WP-E): własny przełącznik photoReminder gate'uje OBA kanały
  // (push + dzwonek) i nie zapisuje znacznika — włączenie później dostarcza
  // przypomnienie następnego dnia, jeśli user nadal się kwalifikuje.
  it("wyłączone photoReminder = bez pusha, bez dzwonka, bez znacznika", async () => {
    const deps = baseDeps({
      listCandidates: async () => [
        { uid: "u1", user: { status: "active", notificationPrefs: { photoReminder: false } } },
      ],
    });
    const result = await runPhotoReminder(deps);

    expect(result.eligible).toBe(0);
    expect(deps.sendMulticast).not.toHaveBeenCalled();
    expect(deps.writeUserEvent).not.toHaveBeenCalled();
    expect(deps.markReminderSent).not.toHaveBeenCalled();
  });

  it("wyłączone dailyReminder NIE blokuje już przypomnienia o zdjęciu (osobny przełącznik)", async () => {
    const deps = baseDeps({
      listCandidates: async () => [
        { uid: "u1", user: { status: "active", notificationPrefs: { dailyReminder: false } } },
      ],
    });
    const result = await runPhotoReminder(deps);

    expect(result.sent).toBe(1);
    expect(deps.writeUserEvent).toHaveBeenCalledTimes(1);
    expect(deps.markReminderSent).toHaveBeenCalledTimes(1);
  });

  it("push w języku usera (EN)", async () => {
    const deps = baseDeps({
      listCandidates: async () => [
        { uid: "u1", user: { status: "active", language: "en" } },
      ],
    });
    await runPhotoReminder(deps);

    expect(vi.mocked(deps.sendMulticast).mock.calls[0][1]).toContain("One month of training");
  });

  it("zawieszony user / wyłączony dostęp NIE dostaje", async () => {
    const suspended = baseDeps({
      listCandidates: async () => [{ uid: "u1", user: { status: "suspended" } }],
    });
    expect((await runPhotoReminder(suspended)).eligible).toBe(0);

    const disabled = baseDeps({
      listCandidates: async () => [{ uid: "u1", user: { status: "active", access: { enabled: false } } }],
    });
    expect((await runPhotoReminder(disabled)).eligible).toBe(0);
  });

  it("sprząta martwe tokeny FCM", async () => {
    const deps = baseDeps({
      sendMulticast: vi.fn(async (tokens: string[]) => ({
        successCount: 0,
        failureCount: tokens.length,
        responses: tokens.map(() => ({
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        })),
      })),
    });
    const result = await runPhotoReminder(deps);

    expect(result.invalidTokens).toBe(1);
    expect(deps.deleteRegistrations).toHaveBeenCalledWith(["r1"]);
    // Znacznik i tak zapisany — dzwonek in-app doszedł.
    expect(deps.markReminderSent).toHaveBeenCalledWith("u1", TODAY);
  });

  it("błąd zapisu dzwonka NIE zapisuje znacznika (retry następnego dnia)", async () => {
    const deps = baseDeps({
      writeUserEvent: vi.fn(async () => {
        throw new Error("firestore-down");
      }),
    });
    const result = await runPhotoReminder(deps);

    expect(result.eligible).toBe(1);
    expect(deps.markReminderSent).not.toHaveBeenCalled();
  });
});
