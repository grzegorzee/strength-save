import { describe, expect, it, vi } from "vitest";
import { runAdminUserRepair, type AdminRepairDeps } from "./admin-user-repair";
import type { RepairAction } from "./algorithms";

const makeDeps = (over: Partial<AdminRepairDeps> = {}): AdminRepairDeps => ({
  getUserRole: vi.fn(async (uid: string) => (uid === "admin-1" ? "admin" : "user")),
  readTargetData: vi.fn(async () => ({
    workouts: [
      { id: "w-empty", date: "2026-07-01", dayId: "day-1", completed: false, exercises: [] },
      { id: "w-full", date: "2026-07-01", dayId: "day-1", completed: true, exercises: [{ exerciseId: "e", sets: [{}] }] },
    ],
    cycles: [],
    userDoc: {},
  })),
  writeBackup: vi.fn(async () => "backup-1"),
  applyOperations: vi.fn(async () => undefined),
  writeAudit: vi.fn(async () => "audit-1"),
  today: "2026-07-17",
  nowIso: "2026-07-17T12:00:00.000Z",
  ...over,
});

const req = (over: Record<string, unknown> = {}) => ({
  adminUid: "admin-1",
  targetUid: "target-1",
  action: "dedupeWorkouts" as RepairAction,
  dryRun: true,
  ...over,
});

describe("runAdminUserRepair (Z100)", () => {
  it("nie-admin dostaje permission-denied", async () => {
    await expect(runAdminUserRepair(makeDeps(), req({ adminUid: "user-2" }) as never))
      .rejects.toThrow(/Admin access required/);
  });

  it("nieznana akcja = invalid-argument", async () => {
    await expect(runAdminUserRepair(makeDeps(), req({ action: "dropDatabase" }) as never))
      .rejects.toThrow(/Unknown repair action/);
  });

  it("dry-run zwraca operacje i NIC nie zapisuje", async () => {
    const deps = makeDeps();
    const result = await runAdminUserRepair(deps, req() as never);
    expect(result.dryRun).toBe(true);
    if (result.dryRun) {
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]).toMatchObject({ docId: "w-empty", op: "delete" });
    }
    expect(deps.writeBackup).not.toHaveBeenCalled();
    expect(deps.applyOperations).not.toHaveBeenCalled();
    expect(deps.writeAudit).not.toHaveBeenCalled();
  });

  it("apply: NAJPIERW backup, potem operacje, potem audyt", async () => {
    const order: string[] = [];
    const deps = makeDeps({
      writeBackup: vi.fn(async () => { order.push("backup"); return "backup-1"; }),
      applyOperations: vi.fn(async () => { order.push("apply"); }),
      writeAudit: vi.fn(async () => { order.push("audit"); return "audit-1"; }),
    });
    const result = await runAdminUserRepair(deps, req({ dryRun: false }) as never);
    expect(order).toEqual(["backup", "apply", "audit"]);
    expect(result).toMatchObject({ dryRun: false, applied: 1, backupId: "backup-1", auditId: "audit-1" });
    const backup = vi.mocked(deps.writeBackup).mock.calls[0][0] as { docs: unknown[] };
    expect(backup.docs).toHaveLength(1);
  });
});
