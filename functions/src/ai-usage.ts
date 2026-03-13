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
 * Uses FieldValue.increment() for atomic updates.
 */
export async function recordUsage(
  userId: string,
  promptTokens: number,
  completionTokens: number,
  model: string,
): Promise<void> {
  const docId = getMonthKey(userId);
  const cost = calculateCost(promptTokens, completionTokens, model);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const docRef = getDb().doc(`ai_usage/${docId}`);
  const increment = admin.firestore.FieldValue.increment;

  await docRef.set(
    {
      userId,
      month,
      promptTokens: increment(promptTokens),
      completionTokens: increment(completionTokens),
      estimatedCostUsd: increment(cost),
      callCount: increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  logger.info(
    `[AI Usage] Recorded for ${userId}: +${promptTokens}/${completionTokens} tokens, +$${cost.toFixed(4)} (${model})`,
  );
}
