import { describe, expect, it } from "vitest";
import fixtures from "./__fixtures__/repair-cases.json";
import {
  dedupeWorkoutsOperations,
  mergeCyclesOperations,
  repairHistoryOperations,
  resetOnboardingOperations,
  type RepairCycleDoc,
  type RepairWorkoutDoc,
} from "./algorithms";

describe("repair algorithms (Z100)", () => {
  it("dedupe: usuwa gorszego duplikata, unikat zostaje", () => {
    const ops = dedupeWorkoutsOperations(fixtures.dedupe.workouts as RepairWorkoutDoc[]);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ collection: "workouts", docId: "w-empty", op: "delete" });
  });

  it("repairHistory: dopisuje cycleId i etykiety dnia tylko tam, gdzie brakuje", () => {
    const ops = repairHistoryOperations(
      fixtures.repairHistory.workouts as RepairWorkoutDoc[],
      fixtures.repairHistory.cycles as RepairCycleDoc[],
    );
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      docId: "w-nocycle",
      op: "update",
      after: { cycleId: "c-1", dayName: "Poniedziałek", dayFocus: "Push" },
    });
  });

  it("mergeCycles: łączy ciągłe cykle tego samego planu, obcy zostaje", () => {
    const ops = mergeCyclesOperations(
      fixtures.mergeCycles.cycles as RepairCycleDoc[],
      fixtures.mergeCycles.workouts as RepairWorkoutDoc[],
    );
    const byId = Object.fromEntries(ops.map((op) => [`${op.op}:${op.docId}`, op]));
    expect(byId["update:w-b1"].after).toEqual({ cycleId: "c-a" });
    expect(byId["update:c-a"].after).toEqual({ startDate: "2026-05-01", endDate: "2026-05-28", durationWeeks: 4 });
    expect(byId["delete:c-b"]).toBeTruthy();
    expect(ops.some((op) => op.docId === "c-other")).toBe(false);
  });

  it("resetOnboarding: zamyka aktywne cykle i cofa onboarding", () => {
    const ops = resetOnboardingOperations(
      fixtures.resetOnboarding.userId,
      fixtures.resetOnboarding.userDoc,
      fixtures.resetOnboarding.cycles as RepairCycleDoc[],
      fixtures.resetOnboarding.today,
    );
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ docId: "c-active", after: { status: "completed", endDate: "2026-07-17" } });
    expect(ops[1]).toMatchObject({ collection: "users", docId: "u-target" });
  });
});
