import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {
  dedupeWorkoutsOperations,
  mergeCyclesOperations,
  repairHistoryOperations,
  resetOnboardingOperations,
  type RepairAction,
  type RepairCycleDoc,
  type RepairOperation,
  type RepairWorkoutDoc,
  type RepairUserDoc,
} from "./algorithms";

// Z100: zdalne naprawy kont z panelu admina. Klient NIGDY nie pisze w cudzych
// dokumentach — wykonuje to ta funkcja po serwerowej weryfikacji roli admin.
// Bezpieczniki: dry-run niczego nie zapisuje; apply ZAWSZE poprzedza backup
// dokumentów `before` do admin_repair_backups (TTL 90 dni) + wpis audytu.

const REPAIR_ACTIONS: RepairAction[] = ["mergeCycles", "repairHistory", "dedupeWorkouts", "resetOnboarding"];

export interface AdminRepairRequest {
  adminUid: string;
  targetUid: string;
  action: RepairAction;
  dryRun: boolean;
}

export interface AdminRepairDeps {
  getUserRole: (uid: string) => Promise<string | undefined>;
  readTargetData: (targetUid: string) => Promise<{
    workouts: RepairWorkoutDoc[];
    cycles: RepairCycleDoc[];
    userDoc: RepairUserDoc;
  }>;
  writeBackup: (backup: Record<string, unknown>) => Promise<string>;
  applyOperations: (operations: RepairOperation[]) => Promise<void>;
  writeAudit: (entry: Record<string, unknown>) => Promise<string>;
  today: string;
  nowIso: string;
}

export const buildOperations = (
  action: RepairAction,
  targetUid: string,
  data: { workouts: RepairWorkoutDoc[]; cycles: RepairCycleDoc[]; userDoc: RepairUserDoc },
  today: string,
): RepairOperation[] => {
  switch (action) {
    case "dedupeWorkouts": return dedupeWorkoutsOperations(data.workouts);
    case "repairHistory": return repairHistoryOperations(data.workouts, data.cycles);
    case "mergeCycles": return mergeCyclesOperations(data.cycles, data.workouts);
    case "resetOnboarding": return resetOnboardingOperations(targetUid, data.userDoc, data.cycles, today);
  }
};

export const runAdminUserRepair = async (
  deps: AdminRepairDeps,
  request: AdminRepairRequest,
): Promise<
  | { dryRun: true; operations: Array<{ collection: string; docId: string; op: string; after: Record<string, unknown> | null }>; summary: string }
  | { dryRun: false; applied: number; backupId: string; auditId: string }
> => {
  if (!REPAIR_ACTIONS.includes(request.action)) {
    throw new HttpsError("invalid-argument", `Unknown repair action: ${request.action}`);
  }
  const role = await deps.getUserRole(request.adminUid);
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  if (!request.targetUid || typeof request.targetUid !== "string") {
    throw new HttpsError("invalid-argument", "targetUid required");
  }

  const data = await deps.readTargetData(request.targetUid);
  const operations = buildOperations(request.action, request.targetUid, data, deps.today);

  if (request.dryRun) {
    return {
      dryRun: true,
      operations: operations.map((op) => ({ collection: op.collection, docId: op.docId, op: op.op, after: op.after })),
      summary: `${operations.length} operacji`,
    };
  }

  const backupId = await deps.writeBackup({
    adminUid: request.adminUid,
    targetUid: request.targetUid,
    action: request.action,
    createdAt: deps.nowIso,
    docs: operations.map((op) => ({ collection: op.collection, docId: op.docId, before: op.before })),
  });
  await deps.applyOperations(operations);
  const auditId = await deps.writeAudit({
    adminUid: request.adminUid,
    targetUid: request.targetUid,
    action: `repair:${request.action}`,
    detail: `${operations.length} operacji, backup ${backupId}`,
    createdAt: deps.nowIso,
  });
  return { dryRun: false, applied: operations.length, backupId, auditId };
};

const localDateKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const adminUserRepair = onCall(async (request) => {
  const adminUid = request.auth?.uid;
  if (!adminUid) throw new HttpsError("unauthenticated", "Sign in required");
  const { targetUid, action, dryRun } = (request.data ?? {}) as { targetUid?: string; action?: RepairAction; dryRun?: boolean };

  const db = admin.firestore();
  const nowIso = new Date().toISOString();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const result = await runAdminUserRepair({
    getUserRole: async (uid) => (await db.collection("users").doc(uid).get()).data()?.role as string | undefined,
    readTargetData: async (uid) => {
      const [workoutsSnap, cyclesSnap, userSnap] = await Promise.all([
        db.collection("workouts").where("userId", "==", uid).get(),
        db.collection("plan_cycles").where("userId", "==", uid).get(),
        db.collection("users").doc(uid).get(),
      ]);
      return {
        workouts: workoutsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as RepairWorkoutDoc),
        cycles: cyclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as RepairCycleDoc),
        userDoc: (userSnap.data() ?? {}) as RepairUserDoc,
      };
    },
    writeBackup: async (backup) => {
      const ref = await db.collection("admin_repair_backups").add({ ...backup, expiresAt });
      return ref.id;
    },
    applyOperations: async (operations) => {
      for (let index = 0; index < operations.length; index += 400) {
        const batch = db.batch();
        for (const op of operations.slice(index, index + 400)) {
          const ref = db.collection(op.collection).doc(op.docId);
          if (op.op === "delete") batch.delete(ref);
          else batch.update(ref, op.after ?? {});
        }
        await batch.commit();
      }
    },
    writeAudit: async (entry) => {
      const ref = await db.collection("admin_audit_log").add(entry);
      return ref.id;
    },
    today: localDateKey(),
    nowIso,
  }, {
    adminUid,
    targetUid: String(targetUid ?? ""),
    action: action as RepairAction,
    dryRun: dryRun !== false,
  });

  logger.info(`[adminUserRepair] ${adminUid} -> ${targetUid} ${action} dryRun=${dryRun !== false}`);
  return result;
});
