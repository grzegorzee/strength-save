import { describe, expect, it } from "vitest";
import { kgToLbs, lbsToKg } from "./garmin-units";

describe("Garmin canonical kg / lbs presentation (X25/Z226)", () => {
  it("round-trips canonical 62.5 kg without precision loss", () => {
    const kg = 62.5;
    expect(lbsToKg(kgToLbs(kg))).toBeCloseTo(kg, 10);
  });

  it("never changes the canonical value merely to format lbs", () => {
    const kg = 24.125;
    const display = kgToLbs(kg);
    expect(display).toBeCloseTo(53.1864, 3);
    expect(kg).toBe(24.125);
  });
});
