import { describe, expect, it } from "vitest";
import { mergeCanonicalWorkoutDocuments } from "./garmin-ingest";

const NOW = 1_786_363_200_000;

describe("phone + Garmin single canonical session (X25/G11)", () => {
  it("transaction merge keeps newer phone set and Garmin-only set in one document", () => {
    const latestPhone = {
      userId: "uid", dayId: "day", date: "2026-08-10", completed: false,
      notes: "phone note", updatedAt: NOW,
      exercises: [{
        exerciseId: "squat", name: "Squat",
        sets: [{ reps: 8, weight: 105, completed: true }],
      }],
    };
    const staleReadMergedWithGarmin = {
      userId: "uid", dayId: "day", date: "2026-08-10", completed: true,
      updatedAt: NOW + 10, completedAt: NOW + 10,
      exercises: [
        {
          exerciseId: "squat", name: "Squat",
          sets: [{ reps: 5, weight: 100, completed: true, updatedAt: NOW - 100 }],
        },
        {
          exerciseId: "plank", name: "Plank",
          sets: [{ reps: 0, weight: 0, durationSec: 60, completed: true, updatedAt: NOW + 5 }],
        },
      ],
    };

    const merged = mergeCanonicalWorkoutDocuments(latestPhone, staleReadMergedWithGarmin, NOW + 20);
    expect(merged.notes).toBe("phone note");
    expect(merged.exercises).toEqual([
      expect.objectContaining({
        exerciseId: "squat",
        sets: [expect.objectContaining({ reps: 8, weight: 105 })],
      }),
      expect.objectContaining({
        exerciseId: "plank",
        sets: [expect.objectContaining({ durationSec: 60 })],
      }),
    ]);
    expect(merged.completed).toBe(true);
  });
});
