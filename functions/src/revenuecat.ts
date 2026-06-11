import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Webhook RevenueCat → users/{uid}.subscription (źródło prawdy entitlementu w Firestore).
// appUserID w RC = uid Firebase (Purchases.logIn w apce), więc event.app_user_id wskazuje
// dokument usera wprost. Autoryzacja: nagłówek Authorization musi równać się sekretowi
// skonfigurowanemu w RC dashboard (Integrations → Webhooks) i w Firebase Secrets.

const webhookAuth = defineSecret("REVENUECAT_WEBHOOK_AUTH");

const USERS_COLLECTION = "users";

interface RcEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  period_type?: string;
  expiration_at_ms?: number;
  store?: string;
  environment?: string;
  cancel_reason?: string;
}

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
  const base = {
    tier: baseTier,
    expiresAt,
    productId,
    updatedAt: nowIso,
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

export const revenuecatWebhook = onRequest(
  { secrets: [webhookAuth], region: "us-central1", cors: false },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    if (req.headers.authorization !== webhookAuth.value()) {
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
      const snap = await userRef.get();
      if (!snap.exists) {
        logger.warn(`[revenuecat] Event ${event.type}: brak users/${uid}`);
        res.status(200).json({ ok: true, skipped: "no-user" });
        return;
      }
      // Tier 'comp' nadaje admin — webhook NIE może go nadpisać.
      const current = snap.data()?.subscription as { tier?: string } | undefined;
      if (current?.tier === "comp") {
        logger.info(`[revenuecat] users/${uid} ma tier comp — webhook nie nadpisuje`);
        res.status(200).json({ ok: true, skipped: "comp" });
        return;
      }
      await userRef.set({ subscription }, { merge: true });
      logger.info(`[revenuecat] ${event.type} → users/${uid}: ${subscription.tier}/${subscription.status} do ${subscription.expiresAt}`);
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error("[revenuecat] Zapis nieudany", error);
      // 5xx => RevenueCat ponowi dostarczenie.
      res.status(500).json({ ok: false });
    }
  }
);
