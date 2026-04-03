import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

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

function clampReserved(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export async function reserveUsageBudget(userId: string, estimatedCostUsd: number): Promise<void> {
  const docId = getMonthKey(userId);
  const month = docId.split("_").slice(1).join("_");
  const docRef = getDb().doc(`ai_usage/${docId}`);

  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
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
  });
}

export async function releaseUsageBudget(userId: string, reservedCostUsd: number): Promise<void> {
  if (reservedCostUsd <= 0) return;

  const docId = getMonthKey(userId);
  const docRef = getDb().doc(`ai_usage/${docId}`);

  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return;

    const data = snap.data() as UsageDoc;
    tx.set(docRef, {
      reservedCostUsd: clampReserved(Number(data.reservedCostUsd || 0) - reservedCostUsd),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
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
): Promise<void> {
  const docId = getMonthKey(userId);
  const cost = calculateCost(promptTokens, completionTokens, model);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const docRef = getDb().doc(`ai_usage/${docId}`);
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const data = (snap.data() || {}) as UsageDoc;

    tx.set(docRef, {
      userId,
      month,
      promptTokens: Number(data.promptTokens || 0) + promptTokens,
      completionTokens: Number(data.completionTokens || 0) + completionTokens,
      estimatedCostUsd: Number(data.estimatedCostUsd || 0) + cost,
      reservedCostUsd: clampReserved(Number(data.reservedCostUsd || 0) - reservedCostUsd),
      callCount: Number(data.callCount || 0) + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  logger.info(
    `[AI Usage] Recorded for ${userId}: +${promptTokens}/${completionTokens} tokens, +$${cost.toFixed(4)} (${model})`,
  );
}
