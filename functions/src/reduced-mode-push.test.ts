import { describe, expect, it, vi } from "vitest";
import { runReducedModeEndingPush, VACATION_TEXTS, type ReducedModePushDeps } from "./reduced-mode-push";

// Runna pakiet 1, krok 14 (spec C3): push w ostatnim dniu trybu "nie na 100%".

const baseDeps = (overrides: Partial<ReducedModePushDeps> = {}): ReducedModePushDeps => ({
  listTokenRegistrations: async () => [
    { id: "r1", userId: "u1", token: "t1" },
    { id: "r2", userId: "u2", token: "t2" },
  ],
  getUsersWithModeEndingToday: async () => ["u1"],
  getUsers: async () => new Map([
    ["u1", { displayName: "Grzesiek", language: "pl" }],
    ["u2", { displayName: "Robert" }],
  ]),
  sendMulticast: vi.fn(async (tokens: string[]) => ({
    successCount: tokens.length,
    failureCount: 0,
    responses: tokens.map(() => ({ success: true })),
  })),
  deleteRegistrations: vi.fn(async () => {}),
  ...overrides,
});

describe("runReducedModeEndingPush", () => {
  it("wysyla TYLKO do userow z trybem konczacym sie dzis", async () => {
    const deps = baseDeps();
    const result = await runReducedModeEndingPush(deps);
    expect(result.candidates).toBe(1);
    expect(result.sent).toBe(1);
    expect(deps.sendMulticast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.sendMulticast).mock.calls[0][0]).toEqual(["t1"]);
    expect(vi.mocked(deps.sendMulticast).mock.calls[0][1]).toContain("kończy się dziś");
  });

  // X35c (WP-E): osobny przełącznik modeEnding; dailyReminder nie gate'uje
  // już końca trybu.
  it("szanuje wylaczone modeEnding i brak trybu", async () => {
    const offPrefs = baseDeps({
      getUsers: async () => new Map([["u1", { notificationPrefs: { modeEnding: false } }]]),
    });
    expect((await runReducedModeEndingPush(offPrefs)).sent).toBe(0);
    expect(offPrefs.sendMulticast).not.toHaveBeenCalled();

    const dailyOff = baseDeps({
      getUsers: async () => new Map([["u1", { notificationPrefs: { dailyReminder: false } }]]),
    });
    expect((await runReducedModeEndingPush(dailyOff)).sent).toBe(1);

    const nobody = baseDeps({ getUsersWithModeEndingToday: async () => [] });
    const result = await runReducedModeEndingPush(nobody);
    expect(result.candidates).toBe(0);
    expect(nobody.sendMulticast).not.toHaveBeenCalled();
  });

  it("tresc urlopowa (spec C4) idzie przez ten sam rdzen", async () => {
    const deps = baseDeps();
    await runReducedModeEndingPush(deps, VACATION_TEXTS);
    expect(vi.mocked(deps.sendMulticast).mock.calls[0][1]).toContain("Urlop");
  });

  it("sprzata martwe tokeny FCM", async () => {
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
    const result = await runReducedModeEndingPush(deps);
    expect(result.invalidTokens).toBe(1);
    expect(deps.deleteRegistrations).toHaveBeenCalledWith(["r1"]);
  });
});
