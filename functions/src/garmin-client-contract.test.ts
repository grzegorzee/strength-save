import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (name: string) => readFileSync(resolve(process.cwd(), `../garmin/source/${name}`), "utf8");

describe("Connect IQ X25 client contract", () => {
  it("queues the versioned four-type set envelope while retaining legacy reps/weight", () => {
    const workoutState = source("WorkoutState.mc");
    expect(workoutState).toContain('"protocolVersion" => 1');
    expect(workoutState).toContain('"set" =>');
    for (const field of ["durationSec", "distanceM", "assistWeightKg", "isWarmup"]) {
      expect(workoutState).toContain(`"${field}"`);
    }
    expect(workoutState).toContain('"reps" => reps');
    expect(workoutState).toContain('"weight" => weightKg');
  });

  it("keeps canonical kg and offers local kg/lbs presentation", () => {
    const settings = source("AppSettings.mc");
    expect(settings).toContain("LB_TO_KG");
    expect(settings).toContain("function cycleUnit");
    expect(settings).toContain("function formatWeight");
    expect(source("DayView.mc")).toContain("Rez.Strings.UnitLabel");
  });

  it("distinguishes pro expiry from revoked token and preserves the offline queue", () => {
    const api = source("Api.mc");
    const day = source("DayView.mc");
    expect(api).toContain("responseCode == 403");
    expect(day).toContain("Rez.Strings.ProRequired");
    expect(api).not.toMatch(/responseCode == 403[\s\S]{0,160}deleteValue\("deviceToken"\)/);
    expect(day).not.toMatch(/errorCode == 403[\s\S]{0,240}EventQueue\.clear/);
  });

  it("preserves an unfinished prior-day session and fetches only by lifecycle/TTL/manual refresh", () => {
    const day = source("DayView.mc");
    expect(day).toContain("DAY_CACHE_TTL_MS");
    expect(day).toContain("keepSession");
    expect(day).toContain("EventQueue.size() > 0");
    expect(day).toContain("Rez.Strings.Refresh");
    expect(day).not.toContain("Api.fetchDay(WorkoutState.todayString())");
  });
});
