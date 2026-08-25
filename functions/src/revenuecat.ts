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
  purchased_at_ms?: number;
  expiration_at_ms?: number;
  event_timestamp_ms?: number;
  store?: string;
  environment?: string;
  cancel_reason?: string;
  /** Bug 22 (X30): koniec grace period przy BILLING_ISSUE (retry płatności w sklepie). */
  grace_period_expiration_at_ms?: number;
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
  /** Początek bieżącego okresu (purchased_at_ms) — wyświetlany w apce jako "aktywna od". */
  startedAt: string | null;
  /** Klucz pominięty (BILLING_ISSUE bez dat) = zapis merge zachowuje dotychczasową wartość. */
  expiresAt?: string | null;
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
    startedAt: event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null,
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
    case "BILLING_ISSUE": {
      // Bug 22 (X30): store daje grace period na naprawę płatności — dostęp trwa do
      // max(expiration, grace_period_expiration). Event bez żadnej daty NIE zeruje
      // expiresAt: klucz pominięty, żeby merge w webhooku zachował datę z dokumentu.
      const graceEnds = [event.expiration_at_ms, event.grace_period_expiration_at_ms]
        .filter((ms): ms is number => typeof ms === "number" && Number.isFinite(ms));
      const billing = { ...base, status: "billing_issue" as const, willRenew: true };
      if (graceEnds.length === 0) {
        delete (billing as { expiresAt?: string | null }).expiresAt;
        return billing;
      }
      return { ...billing, expiresAt: new Date(Math.max(...graceEnds)).toISOString() };
    }
    case "EXPIRATION":
      return { ...base, tier: "none", status: "expired", willRenew: false };
    default:
      return null; // TEST, SUBSCRIBER_ALIAS itd. — bez zmiany stanu
  }
};

/** Aktywny grant admina (comp bezterminowy albo z datą w przyszłości) jest nietykalny. */
export const isActiveCompGrant = (
  current: { tier?: unknown; expiresAt?: unknown } | undefined,
  now: number,
): boolean => {
  if (current?.tier !== "comp") return false;
  if (typeof current.expiresAt !== "string") return true; // bezterminowo
  const expires = Date.parse(current.expiresAt);
  return !Number.isFinite(expires) || expires > now;
};

/**
 * Bug 23 (X30): event niosący aktywny stan na nieistniejącym users/{uid} musi wrócić —
 * 5xx każe RevenueCat ponowić dostarczenie, a retry dogoni utworzenie dokumentu przez
 * syncUserProfile (wyścig przy świeżym koncie / chwilowa porażka syncu). EXPIRATION
 * nie: brak dokumentu daje ten sam skutek (brak PRO), a trwale usunięte konto
 * (deleteOwnAccount) nie ma kręcić retry do wyczerpania backoffu RC.
 */
export const shouldRetryMissingUser = (subscription: SubscriptionWrite): boolean =>
  subscription.status === "active" || subscription.status === "billing_issue";

/** Duplicate event IDs and events older than the committed state are harmless no-ops. */
export const shouldApplySubscriptionEvent = (
  current: { tier?: unknown; expiresAt?: unknown; eventId?: unknown; eventTimestamp?: unknown } | undefined,
  next: SubscriptionWrite,
  now: number = Date.now(),
): boolean => {
  // 2026-08-20: comp blokuje eventy tylko póki grant trwa — po jego wygaśnięciu
  // webhook ma odtworzyć stan sklepowy (stary warunek zamrażał comp na zawsze).
  if (isActiveCompGrant(current, now)) return false;
  if (next.eventId && current?.eventId === next.eventId) return false;
  const currentTimestamp = typeof current?.eventTimestamp === "number" ? current.eventTimestamp : 0;
  return next.eventTimestamp >= currentTimestamp;
};

export type SubscriptionEventTarget = "subscription" | "store" | "skip";

/**
 * Bug 7 (X30): aktywny grant comp nie blokuje już eventów RC — stan sklepowy ląduje
 * w polu siostrzanym users/{uid}.storeSubscription (RENEWAL/BILLING_ISSUE podczas
 * grantu nie przepada) i wraca po wygaśnięciu grantu (odczyt: klient
 * resolveEffectiveSubscription, zegarek resolveGarminEntitlement) albo po
 * adminRevokeSubscription. Poza grantem zapis idzie do subscription jak dotąd,
 * a storeSubscription jest czyszczone (jedno źródło prawdy).
 */
export const resolveEventTarget = (
  current: { tier?: unknown; expiresAt?: unknown; eventId?: unknown; eventTimestamp?: unknown } | undefined,
  currentStore: { tier?: unknown; expiresAt?: unknown; eventId?: unknown; eventTimestamp?: unknown } | undefined,
  next: SubscriptionWrite,
  now: number,
): SubscriptionEventTarget => {
  if (isActiveCompGrant(current, now)) {
    // storeSubscription nigdy nie trzyma comp, więc gating to czysty dedupe/stale.
    return shouldApplySubscriptionEvent(currentStore, next, now) ? "store" : "skip";
  }
  return shouldApplySubscriptionEvent(current, next, now) ? "subscription" : "skip";
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
        const current = snap.data()?.subscription as { tier?: unknown; expiresAt?: unknown; eventId?: unknown; eventTimestamp?: unknown } | undefined;
        const currentStore = snap.data()?.storeSubscription as { tier?: unknown; expiresAt?: unknown; eventId?: unknown; eventTimestamp?: unknown } | undefined;
        const now = Date.now();
        const target = resolveEventTarget(current, currentStore, subscription, now);
        if (target === "skip") return "stale-or-duplicate";
        if (target === "store") {
          // Bug 7 (X30): aktywny grant comp — stan sklepowy do pola siostrzanego.
          transaction.set(userRef, { storeSubscription: subscription }, { merge: true });
          return "applied-store";
        }
        transaction.set(userRef, {
          subscription,
          // Bug 7 (X30): subscription znów sklepowe — cień grantu do kasacji.
          storeSubscription: admin.firestore.FieldValue.delete(),
        }, { merge: true });
        return "applied";
      });
      if (result !== "applied" && result !== "applied-store") {
        // Bug 23 (X30): 200 = doręczone na zawsze; zgubiony INITIAL_PURCHASE/RENEWAL
        // zostawiał płacącego usera bez mirroru na web/Garmin do następnego eventu.
        if (result === "no-user" && shouldRetryMissingUser(subscription)) {
          logger.warn(`[revenuecat] Event ${event.type} dla nieistniejącego users/${uid} — 503, RC ponowi`);
          res.status(503).json({ ok: false, retry: "no-user" });
          return;
        }
        logger.info(`[revenuecat] Event ${event.type} pominięty: ${result}`);
        res.status(200).json({ ok: true, skipped: result });
        return;
      }
      const field = result === "applied-store" ? "storeSubscription (aktywny grant comp)" : "subscription";
      logger.info(`[revenuecat] ${event.type} → users/${uid} ${field}: ${subscription.tier}/${subscription.status} do ${subscription.expiresAt ?? "(bez zmiany)"}`);
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error("[revenuecat] Zapis nieudany", error);
      // 5xx => RevenueCat ponowi dostarczenie.
      res.status(500).json({ ok: false });
    }
  }
);
