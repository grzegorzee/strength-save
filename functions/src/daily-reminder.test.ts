import { describe, expect, it, vi } from "vitest";
import { getInvalidFcmTokens, runDailyReminder, type DailyReminderDeps } from "./daily-reminder";
import { shouldLogLoginSuccess } from "./registration";

describe("getInvalidFcmTokens", () => {
  it("keeps only tokens rejected permanently by FCM", () => {
    expect(getInvalidFcmTokens(["valid", "expired", "transient"], [
      { success: true },
      { success: false, error: { code: "messaging/registration-token-not-registered" } },
      { success: false, error: { code: "messaging/internal-error" } },
    ])).toEqual(["expired"]);
  });
});

describe("runDailyReminder (R2-12)", () => {
  const makeDeps = (over: Partial<DailyReminderDeps> = {}): DailyReminderDeps => ({
    listTokenRegistrations: vi.fn(async () => [
      { id: "r1", userId: "u1", token: "t1" },
      { id: "r2", userId: "u2", token: "t2" },
    ]),
    getUsers: vi.fn(async (userIds: string[]) => new Map(userIds.map((uid) => [uid, { displayName: `User ${uid}` }]))),
    getPlanDays: vi.fn(async (userIds: string[]) => new Map(userIds.map((uid) => [uid, [{ weekday: "monday", focus: "Push" }]]))),
    sendMulticast: vi.fn(async (tokens: string[]) => ({
      successCount: tokens.length,
      failureCount: 0,
      responses: tokens.map(() => ({ success: true })),
    })),
    deleteRegistrations: vi.fn(async () => undefined),
    today: "monday",
    ...over,
  });

  it("czyta TYLKO userów z tokenami (2 tokeny = 2 odczyty userów, nie cala kolekcja)", async () => {
    const deps = makeDeps();

    const result = await runDailyReminder(deps);

    expect(deps.getUsers).toHaveBeenCalledTimes(1);
    expect(deps.getUsers).toHaveBeenCalledWith(["u1", "u2"]);
    expect(deps.getPlanDays).toHaveBeenCalledWith(["u1", "u2"]);
    expect(result.sent).toBe(2);
  });

  it("opt-out / zawieszenie wyklucza usera przed odczytem planu", async () => {
    const deps = makeDeps({
      getUsers: vi.fn(async () => new Map([
        ["u1", { notificationPrefs: { dailyReminder: false } }],
        ["u2", { status: "suspended" }],
      ])),
    });

    const result = await runDailyReminder(deps);

    expect(deps.getPlanDays).toHaveBeenCalledWith([]);
    expect(deps.sendMulticast).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("dzien wolny = brak wysylki", async () => {
    const deps = makeDeps({ today: "sunday" });

    const result = await runDailyReminder(deps);

    expect(deps.sendMulticast).not.toHaveBeenCalled();
    expect(result.candidates).toBe(0);
  });

  it("permanentnie odrzucone tokeny sa usuwane", async () => {
    const deps = makeDeps({
      sendMulticast: vi.fn(async (tokens: string[]) => ({
        successCount: 0,
        failureCount: tokens.length,
        responses: tokens.map(() => ({ success: false, error: { code: "messaging/registration-token-not-registered" } })),
      })),
    });

    const result = await runDailyReminder(deps);

    expect(deps.deleteRegistrations).toHaveBeenCalledWith(["r1"]);
    expect(deps.deleteRegistrations).toHaveBeenCalledWith(["r2"]);
    expect(result.invalidTokens).toBe(2);
  });
});

describe("shouldLogLoginSuccess (R2-12)", () => {
  const now = new Date("2026-07-03T12:00:00Z");

  it("brak poprzedniego loginu = loguj", () => {
    expect(shouldLogLoginSuccess(undefined, now)).toBe(true);
  });

  it("poprzedni login starszy niz 20 h = loguj", () => {
    expect(shouldLogLoginSuccess("2026-07-02T10:00:00Z", now)).toBe(true);
  });

  it("drugi login tego samego dnia = NIE loguj (audit log 1x/dzien)", () => {
    expect(shouldLogLoginSuccess("2026-07-03T08:00:00Z", now)).toBe(false);
  });

  it("niesparsowalna data = loguj (bezpieczny default)", () => {
    expect(shouldLogLoginSuccess("nie-data", now)).toBe(true);
  });
});
