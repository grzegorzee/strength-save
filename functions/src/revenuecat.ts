import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { createHash, timingSafeEqual } from "node:crypto";

// Webhook RevenueCat → users/{uid}.subscription (źródło prawdy entitlementu w Firestore).
// appUserID w RC = uid Firebase (Purchases.logIn w apce), więc event.app_user_id wskazuje
// dokument usera wprost. Autoryzacja: nagłówek Authorization musi równać się sekretowi
// skonfigurowanemu w RC dashboard (Integrations → Webhooks) i w Firebase Secrets.

const webhookAuth = defineSecret("REVENUECAT_WEBHOOK_AUTH");

const USERS_COLLECTION = "users";

interface RcEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  period_type?: string;
  expiration_at_ms?: number;
  event_timestamp_ms?: number;
  store?: string;
  environment?: string;
  cancel_reason?: string;
}

// Timing-safe porównanie sekretu (wzorzec safeHashEquals z admin-api.ts);
// porównujemy hashe SHA-256, co załatwia różne długości wejść.
const secretsMatch = (provided: string | undefined, expected: string): boolean => {
  if (!provided) return false;
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
};

const isFirebaseUid = (id: string | undefined): id is string =>
  !!id && !id.startsWith("$RCAnonymousID:") && id.length <= 128;

/** Wybierz uid Firebase spośród identyfikatorów eventu (app_user_id może być anonimowy). */
export const resolveUid = (event: RcEvent): string | null => {
  if (isFirebaseUid(event.app_user_id)) return event.app_user_id;
  if (isFirebaseUid(event.original_app_user_id)) return event.original_app_user_id;
  for (const alias of event.aliases ?? []) {
    if (isFirebaseUid(alias)) return alias;
  }
  return null;
};

export interface SubscriptionWrite {
  tier: "monthly" | "yearly" | "trial" | "none";
  status: "active" | "expired" | "billing_issue" | "none";
  expiresAt: string | null;
  productId: string | null;
  willRenew: boolean;
  updatedAt: string;
  eventId: string | null;
  eventTimestamp: number;
  store?: string;
  environment?: string;
}

/** Mapowanie eventu RC na stan subskrypcji. null = event nie zmienia stanu (ignorujemy). */
export const mapEventToSubscription = (event: RcEvent, nowIso: string): SubscriptionWrite | null => {
  const type = (event.type || "").toUpperCase();
  const productId = event.product_id ?? null;
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const baseTier: SubscriptionWrite["tier"] = event.period_type === "TRIAL"
    ? "trial"
    : productId?.includes("yearly") ? "yearly" : "monthly";
  const eventTimestamp = Number.isFinite(event.event_timestamp_ms) ? Number(event.event_timestamp_ms) : Date.parse(nowIso);
  const base = {
    tier: baseTier,
    expiresAt,
    productId,
    updatedAt: new Date(eventTimestamp).toISOString(),
    eventId: typeof event.id === "string" && event.id.length > 0 ? event.id : null,
    eventTimestamp,
    ...(event.store && { store: event.store }),
    ...(event.environment && { environment: event.environment }),
  };

  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "TRANSFER":
      return { ...base, status: "active", willRenew: true };
    case "CANCELLATION":
      // Anulowanie odnowienia — dostęp zostaje do końca okresu.
      return { ...base, status: "active", willRenew: false };
    case "BILLING_ISSUE":
      return { ...base, status: "billing_issue", willRenew: true };
    case "EXPIRATION":
      return { ...base, tier: "none", status: "expired", willRenew: false };
    default:
      return null; // TEST, SUBSCRIBER_ALIAS itd. — bez zmiany stanu
  }
};

/** Duplicate event IDs and events older than the committed state are harmless no-ops. */
export const shouldApplySubscriptionEvent = (
  current: { tier?: unknown; eventId?: unknown; eventTimestamp?: unknown } | undefined,
  next: SubscriptionWrite,
): boolean => {
  if (current?.tier === "comp") return false;
  if (next.eventId && current?.eventId === next.eventId) return false;
  const currentTimestamp = typeof current?.eventTimestamp === "number" ? current.eventTimestamp : 0;
  return next.eventTimestamp >= currentTimestamp;
};

export const revenuecatWebhook = onRequest(
  { secrets: [webhookAuth], region: "us-central1", cors: false },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    if (!secretsMatch(req.headers.authorization, webhookAuth.value())) {
      logger.warn("[revenuecat] Odrzucony webhook: zły Authorization header");
      res.status(401).send("Unauthorized");
      return;
    }

    const event = (req.body?.event ?? {}) as RcEvent;
    const uid = resolveUid(event);
    if (!uid) {
      logger.info(`[revenuecat] Event ${event.type} bez uid (anonimowy) — pomijam`);
      res.status(200).json({ ok: true, skipped: "no-uid" });
      return;
    }

    const subscription = mapEventToSubscription(event, new Date().toISOString());
    if (!subscription) {
      logger.info(`[revenuecat] Event ${event.type} bez wpływu na stan — pomijam`);
      res.status(200).json({ ok: true, skipped: "event-type" });
      return;
    }

    try {
      const db = admin.firestore();
      const userRef = db.collection(USERS_COLLECTION).doc(uid);
      const result = await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(userRef);
        if (!snap.exists) return "no-user";
        const current = snap.data()?.subscription as { tier?: unknown; eventId?: unknown; eventTimestamp?: unknown } | undefined;
        if (!shouldApplySubscriptionEvent(current, subscription)) return current?.tier === "comp" ? "comp" : "stale-or-duplicate";
        transaction.set(userRef, { subscription }, { merge: true });
        return "applied";
      });
      if (result !== "applied") {
        logger.info(`[revenuecat] Event ${event.type} pominięty: ${result}`);
        res.status(200).json({ ok: true, skipped: result });
        return;
      }
      logger.info(`[revenuecat] ${event.type} → users/${uid}: ${subscription.tier}/${subscription.status} do ${subscription.expiresAt}`);
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error("[revenuecat] Zapis nieudany", error);
      // 5xx => RevenueCat ponowi dostarczenie.
      res.status(500).json({ ok: false });
    }
  }
);
