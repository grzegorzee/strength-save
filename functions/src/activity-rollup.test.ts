import { describe, expect, it, vi } from "vitest";
import { computeActivitySummary, runActivityRollup, type ActivityRollupDeps, type TelemetryDailyDoc } from "./activity-rollup";

const doc = (date: string, counters: Record<string, number> = {}): TelemetryDailyDoc => ({
  userId: "u1",
  date,
  counters,
});

const TODAY = "2026-07-17";

describe("computeActivitySummary (Z96)", () => {
  it("puste wejście daje zera i brak lastActiveAt", () => {
    const summary = computeActivitySummary([], TODAY);
    expect(summary.lastActiveAt).toBe("");
    expect(summary.activeDays7).toBe(0);
    expect(summary.activeDays30).toBe(0);
    expect(summary.workouts7).toBe(0);
    expect(summary.workouts30).toBe(0);
    expect(summary.topScreens30).toEqual([]);
  });

  it("okna 7/30 dni: dni aktywne i treningi liczone we właściwych oknach", () => {
    const summary = computeActivitySummary([
      doc("2026-07-16", { action_workout_completed: 1 }),
      doc("2026-07-12", { action_workout_completed: 2 }),
      doc("2026-07-01", { action_workout_completed: 1 }),
      doc("2026-06-20", {}),
      doc("2026-05-01", { action_workout_completed: 9 }),
    ], TODAY);
    expect(summary.lastActiveAt).toBe("2026-07-16");
    expect(summary.activeDays7).toBe(2);
    expect(summary.activeDays30).toBe(4);
    expect(summary.workouts7).toBe(3);
    expect(summary.workouts30).toBe(4);
  });

  it("topScreens30: top 5 screen_* posortowane malejąco, liczniki nie-screen ignorowane", () => {
    const summary = computeActivitySummary([
      doc("2026-07-16", {
        screen_dashboard: 5, screen_plan: 2, screen_workout: 9,
        action_set_checked: 100, sync_success: 50,
      }),
      doc("2026-07-15", {
        screen_dashboard: 4, screen_analytics: 3, screen_history: 1,
        screen_profile: 1, screen_settings: 1,
      }),
    ], TODAY);
    // Remis liczników rozstrzyga alfabet (deterministycznie).
    expect(summary.topScreens30.slice(0, 3)).toEqual([
      { key: "screen_dashboard", count: 9 },
      { key: "screen_workout", count: 9 },
      { key: "screen_analytics", count: 3 },
    ]);
    expect(summary.topScreens30).toHaveLength(5);
    expect(summary.topScreens30.every((entry) => entry.key.startsWith("screen_"))).toBe(true);
  });
});

describe("runActivityRollup (Z96)", () => {
  it("czyta wczorajszych aktywnych, liczy i zapisuje summary per user", async () => {
    const writes = new Map<string, unknown>();
    const deps: ActivityRollupDeps = {
      listActiveUserIds: vi.fn(async (date: string) => {
        expect(date).toBe("2026-07-16");
        return ["u1", "u2"];
      }),
      getUserDailyDocs: vi.fn(async (uid: string) => [
        { userId: uid, date: "2026-07-16", counters: { action_workout_completed: 1, screen_dashboard: 2 } },
      ]),
      writeActivitySummary: vi.fn(async (uid: string, summary: unknown) => {
        writes.set(uid, summary);
      }),
      today: TODAY,
      yesterday: "2026-07-16",
    };

    const result = await runActivityRollup(deps);
    expect(result.processed).toBe(2);
    expect(writes.size).toBe(2);
    const summary = writes.get("u1") as { workouts7: number; lastActiveAt: string };
    expect(summary.workouts7).toBe(1);
    expect(summary.lastActiveAt).toBe("2026-07-16");
  });

  it("zero aktywnych wczoraj = zero zapisów", async () => {
    const deps: ActivityRollupDeps = {
      listActiveUserIds: vi.fn(async () => []),
      getUserDailyDocs: vi.fn(async () => []),
      writeActivitySummary: vi.fn(async () => undefined),
      today: TODAY,
      yesterday: "2026-07-16",
    };
    const result = await runActivityRollup(deps);
    expect(result.processed).toBe(0);
    expect(deps.writeActivitySummary).not.toHaveBeenCalled();
  });
});
