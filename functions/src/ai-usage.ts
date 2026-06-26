import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { createHash } from "crypto";

function getDb() {
  return admin.firestore();
}

export const MONTHLY_LIMIT_USD = 5.0;

// Pricing per 1M tokens (gpt-5-mini)
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};

function getMonthKey(userId: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${userId}_${month}`;
}

function calculateCost(promptTokens: number, completionTokens: number, model: string): number {
  const pricing = PRICING[model] || PRICING["gpt-5-mini"];
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
}

function estimatePromptTokens(messages: unknown[]): number {
  const serialized = JSON.stringify(messages);
  return Math.max(1, Math.ceil(serialized.length / 3));
}

export function estimateUsageCost(
  messages: unknown[],
  maxCompletionTokens: number,
  model: string,
): number {
  return calculateCost(
    estimatePromptTokens(messages),
    Math.max(1, maxCompletionTokens),
    model,
  );
}

interface UsageDoc {
  userId?: string;
  month?: string;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
  reservedCostUsd?: number;
  callCount?: number;
}

interface UsageEventDoc {
  state?: "reserved" | "released" | "recorded";
  reservedCostUsd?: number;
}

function clampReserved(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function usageEventRef(userId: string, operationId: string) {
  const id = createHash("sha256").update(`${userId}:${operationId}`).digest("hex");
  return getDb().doc(`ai_usage_events/${id}`);
}

export async function reserveUsageBudget(userId: string, estimatedCostUsd: number, operationId?: string): Promise<void> {
  const docId = getMonthKey(userId);
  const month = docId.split("_").slice(1).join("_");
  const docRef = getDb().doc(`ai_usage/${docId}`);
  const eventRef = operationId ? usageEventRef(userId, operationId) : null;

  await getDb().runTransaction(async (tx) => {
    const [snap, eventSnap] = await Promise.all([
      tx.get(docRef),
      eventRef ? tx.get(eventRef) : Promise.resolve(null),
    ]);
    if (eventSnap?.exists) return;

    const data = (snap.data() || {}) as UsageDoc;
    const currentCost = Number(data.estimatedCostUsd || 0);
    const currentReserved = Number(data.reservedCostUsd || 0);
    const nextReserved = currentReserved + estimatedCostUsd;

    if (currentCost + nextReserved > MONTHLY_LIMIT_USD) {
      logger.warn(`[AI Usage] Reservation would exceed limit for ${userId}: $${(currentCost + nextReserved).toFixed(2)}`);
      throw `LIMIT_EXCEEDED:$${currentCost.toFixed(2)}`;
    }

    tx.set(docRef, {
      userId,
      month,
      reservedCostUsd: nextReserved,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    if (eventRef) {
      tx.set(eventRef, {
        userId,
        month,
        state: "reserved",
        reservedCostUsd: estimatedCostUsd,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
}

export async function releaseUsageBudget(userId: string, reservedCostUsd: number, operationId?: string): Promise<void> {
  if (reservedCostUsd <= 0) return;

  const docId = getMonthKey(userId);
  const docRef = getDb().doc(`ai_usage/${docId}`);
  const eventRef = operationId ? usageEventRef(userId, operationId) : null;

  await getDb().runTransaction(async (tx) => {
    const [snap, eventSnap] = await Promise.all([
      tx.get(docRef),
      eventRef ? tx.get(eventRef) : Promise.resolve(null),
    ]);
    if (!snap.exists) return;
    if (eventRef) {
      const event = eventSnap?.data() as UsageEventDoc | undefined;
      if (event?.state !== "reserved") return;
    }

    const data = snap.data() as UsageDoc;
    const releaseCost = eventSnap?.exists
      ? Number((eventSnap.data() as UsageEventDoc).reservedCostUsd || reservedCostUsd)
      : reservedCostUsd;
    tx.set(docRef, {
      reservedCostUsd: clampReserved(Number(data.reservedCostUsd || 0) - releaseCost),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    if (eventRef) {
      tx.set(eventRef, {
        state: "released",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });
}

/**
 * Check if user is within monthly AI usage limit.
 * Returns current cost. Throws string "LIMIT_EXCEEDED:$X.XX" if over limit.
 */
export async function checkUsageLimit(userId: string): Promise<number> {
  const docId = getMonthKey(userId);
  const docRef = getDb().doc(`ai_usage/${docId}`);
  const snap = await docRef.get();

  if (!snap.exists) return 0;

  const data = snap.data()!;
  const currentCost = data.estimatedCostUsd || 0;

  if (currentCost >= MONTHLY_LIMIT_USD) {
    logger.warn(`[AI Usage] Limit exceeded for ${userId}: $${currentCost.toFixed(2)}`);
    throw `LIMIT_EXCEEDED:$${currentCost.toFixed(2)}`;
  }

  return currentCost;
}

/**
 * Record AI usage after a successful API call.
 * Uses a transaction so usage and reservation release stay consistent.
 */
export async function recordUsage(
  userId: string,
  promptTokens: number,
  completionTokens: number,
  model: string,
  reservedCostUsd: number = 0,
  operationId?: string,
): Promise<boolean> {
  const docId = getMonthKey(userId);
  const cost = calculateCost(promptTokens, completionTokens, model);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const docRef = getDb().doc(`ai_usage/${docId}`);
  const eventRef = operationId ? usageEventRef(userId, operationId) : null;
  const recorded = await getDb().runTransaction(async (tx) => {
    const [snap, eventSnap] = await Promise.all([
      tx.get(docRef),
      eventRef ? tx.get(eventRef) : Promise.resolve(null),
    ]);
    const event = eventSnap?.data() as UsageEventDoc | undefined;
    if (event?.state === "recorded") return false;

    const data = (snap.data() || {}) as UsageDoc;
    const releaseCost = event?.state === "reserved"
      ? Number(event.reservedCostUsd || reservedCostUsd)
      : reservedCostUsd;

    tx.set(docRef, {
      userId,
      month,
      promptTokens: Number(data.promptTokens || 0) + promptTokens,
      completionTokens: Number(data.completionTokens || 0) + completionTokens,
      estimatedCostUsd: Number(data.estimatedCostUsd || 0) + cost,
      reservedCostUsd: clampReserved(Number(data.reservedCostUsd || 0) - releaseCost),
      callCount: Number(data.callCount || 0) + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    if (eventRef) {
      tx.set(eventRef, {
        userId,
        month,
        state: "recorded",
        reservedCostUsd: releaseCost,
        promptTokens,
        completionTokens,
        model,
        costUsd: cost,
        createdAt: eventSnap?.exists ? eventSnap.data()?.createdAt : admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return true;
  });

  if (recorded) {
    logger.info(
      `[AI Usage] Recorded for ${userId}: +${promptTokens}/${completionTokens} tokens, +$${cost.toFixed(4)} (${model})`,
    );
  }
  return recorded;
}
