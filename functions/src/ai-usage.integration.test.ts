import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as admin from "firebase-admin";
import { recordUsage, releaseUsageBudget, reserveUsageBudget } from "./ai-usage";

const hasFirestoreEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const describeWithEmulator = hasFirestoreEmulator ? describe : describe.skip;
const projectId = process.env.GCLOUD_PROJECT || "strength-save-ai-usage-test";

const cleanCollection = async (collection: string): Promise<void> => {
  const db = admin.firestore();
  while (true) {
    const snap = await db.collection(collection).limit(100).get();
    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
};

describeWithEmulator("ai usage integration on Firestore emulator", () => {
  beforeAll(() => {
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId });
    }
  });

  beforeEach(async () => {
    await Promise.all([
      cleanCollection("ai_usage"),
      cleanCollection("ai_usage_events"),
    ]);
  });

  afterAll(async () => {
    await Promise.all(admin.apps.map((app) => app?.delete()));
  });

  it("reserves, records and releases exactly once per operation id", async () => {
    const userId = "ai-user-1";
    const operationId = "same-client-request";

    await reserveUsageBudget(userId, 0.01, operationId);
    await reserveUsageBudget(userId, 0.01, operationId);

    let usageSnap = await admin.firestore().collection("ai_usage").where("userId", "==", userId).limit(1).get();
    expect(usageSnap.docs[0].data().reservedCostUsd).toBeCloseTo(0.01);

    await expect(recordUsage(userId, 100, 50, "gpt-5-mini", 0.01, operationId)).resolves.toBe(true);
    await expect(recordUsage(userId, 100, 50, "gpt-5-mini", 0.01, operationId)).resolves.toBe(false);
    await releaseUsageBudget(userId, 0.01, operationId);

    usageSnap = await admin.firestore().collection("ai_usage").where("userId", "==", userId).limit(1).get();
    const usage = usageSnap.docs[0].data();
    expect(usage.callCount).toBe(1);
    expect(usage.promptTokens).toBe(100);
    expect(usage.completionTokens).toBe(50);
    expect(usage.reservedCostUsd).toBe(0);
  });

  it("release is idempotent and cannot drive reservation below zero", async () => {
    const userId = "ai-user-2";
    const operationId = "release-only";

    await reserveUsageBudget(userId, 0.02, operationId);
    await releaseUsageBudget(userId, 0.02, operationId);
    await releaseUsageBudget(userId, 0.02, operationId);

    const usageSnap = await admin.firestore().collection("ai_usage").where("userId", "==", userId).limit(1).get();
    expect(usageSnap.docs[0].data().reservedCostUsd).toBe(0);
  });
});
