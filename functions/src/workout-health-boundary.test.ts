import { describe, expect, it } from "vitest";
import { applyWorkoutHealthConsentBoundary } from "./workout-health-boundary";

const exercise = {
  exerciseId: "squat",
  name: "Squat",
  notes: "steady",
  sets: [{ weight: 100, reps: 5, completed: true }],
  rpe: 8.5,
  pain: 2,
  quality: 4,
};

describe("applyWorkoutHealthConsentBoundary", () => {
  it("strips nested health fields without active health consent and preserves the base workout", () => {
    const input = [exercise];

    const result = applyWorkoutHealthConsentBoundary(input, undefined);

    expect(result).toEqual({
      exercises: [{
        exerciseId: "squat",
        name: "Squat",
        notes: "steady",
        sets: [{ weight: 100, reps: 5, completed: true }],
      }],
      healthGrant: null,
      strippedHealthFieldCount: 3,
    });
    expect(input[0]).toEqual(exercise);
  });

  it("treats legacy health 1.0 and incomplete fences as inactive", () => {
    expect(applyWorkoutHealthConsentBoundary([exercise], {
      healthGranted: true,
      healthVersion: "1.0",
      healthEpoch: 7,
      healthGrantId: "legacy",
    }).healthGrant).toBeNull();

    expect(applyWorkoutHealthConsentBoundary([exercise], {
      healthGranted: true,
      healthVersion: "1.1",
      healthEpoch: 7,
      healthGrantId: "",
    }).healthGrant).toBeNull();
  });

  it("retains valid metrics only for the current 1.1 grant and returns its fence", () => {
    const result = applyWorkoutHealthConsentBoundary([exercise], {
      healthGranted: true,
      healthVersion: "1.1",
      healthEpoch: 7,
      healthGrantId: "grant-7",
    });

    expect(result).toEqual({
      exercises: [exercise],
      healthGrant: { healthEpoch: 7, healthGrantId: "grant-7" },
      strippedHealthFieldCount: 0,
    });
  });

  it("drops invalid metric values even when consent is active", () => {
    const result = applyWorkoutHealthConsentBoundary([{
      ...exercise,
      rpe: 8.3,
      pain: 11,
      quality: Number.NaN,
    }], {
      healthGranted: true,
      healthVersion: "1.1",
      healthEpoch: 3,
      healthGrantId: "grant-3",
    });

    expect(result.exercises[0]).not.toHaveProperty("rpe");
    expect(result.exercises[0]).not.toHaveProperty("pain");
    expect(result.exercises[0]).not.toHaveProperty("quality");
    expect(result.strippedHealthFieldCount).toBe(3);
  });
});
