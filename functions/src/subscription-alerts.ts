import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { defineString } from "firebase-functions/params";
import { emailButton, emailHeading, emailParagraph, esc, EMAIL_COLORS, EMAIL_FONT, renderEmailLayout } from "./email-layout";
import { safeSesErrorCode, sendSesEmail } from "./ses-email";

// Powiadomienia właściciela o zakupach (2026-09-30: aplikacja publiczna w App
// Store i Google Play). Źródło: webhook RevenueCat (revenuecat.ts), wyłącznie
// environment=PRODUCTION. Kształt payloadu: dokumentacja RC "Event Types and
// Fields" (period_type TRIAL|INTRO|NORMAL|PROMOTIONAL|PREPAID, is_trial_conversion
// tylko na RENEWAL, cancel_reason CUSTOMER_SUPPORT = zwrot przez support sklepu).
//
// Idempotencja per event id: znacznik admin_subscription_alerts/{eventId}
// zajmowany w transakcji razem z licznikiem płatnych subskrypcji
// (config/subscription_alerts), więc retry RC i równoległe webhooki nie dublują
// maila ani flagi "pierwsza płatna w historii". Dedup subskrypcji w users/{uid}
// (eventId + eventTimestamp) pomija też zdarzenia STARSZE od zapisanego stanu,
// a te są realnymi zdarzeniami (np. spóźnione anulowanie), dlatego osobny klucz.
//
// Decyzje właściciela 2026-09-30:
// - mail WYŁĄCZNIE na kontakt@gjasionowicz.pl, z kwotą i adresem e-mail klienta,
// - push WYŁĄCZNIE na urządzenia konta właściciela (parametr
//   SUBSCRIPTION_ALERT_OWNER_EMAIL, rozwiązywany serwerowo do uid), bez adresu
//   e-mail (push widać na zablokowanym ekranie),
// - bez stopki z danymi firmy i bez promocji wersji webowej; link do karty
//   usera w panelu admina jest wewnętrzny.

export const SUBSCRIPTION_ALERT_RECIPIENTS: readonly string[] = Object.freeze(["kontakt@gjasionowicz.pl"]);
export const SUBSCRIPTION_ALERT_MARKERS_COLLECTION = "admin_subscription_alerts";
export const SUBSCRIPTION_ALERT_CONFIG_DOC = { collection: "config", id: "subscription_alerts" } as const;
export const ADMIN_PANEL_USER_URL = "https://app.strengthsave.app/#/admin/users/";

/** Konto właściciela, na którego urządzenia idzie push (functions/.env.<projectId>). */
export const subscriptionAlertOwnerEmail = defineString("SUBSCRIPTION_ALERT_OWNER_EMAIL", { default: "" });

export interface RcAlertEvent {
  id?: string;
  type?: string;
  environment?: string;
  period_type?: string;
  product_id?: string;
  new_product_id?: string;
  store?: string;
  country_code?: string;
  currency?: string;
  price?: number;
  price_in_purchased_currency?: number;
  event_timestamp_ms?: number;
  purchased_at_ms?: number;
  cancel_reason?: string;
  expiration_reason?: string;
  is_trial_conversion?: boolean;
  app_user_id?: string;
}

export type SubscriptionAlertKind =
  | "trial_started"
  | "first_payment"
  | "trial_converted"
  | "renewal"
  | "cancellation"
  | "refund"
  | "billing_issue"
  | "expiration"
  | "product_change";

const PAID_INITIAL_PERIODS = new Set(["NORMAL", "INTRO", "PREPAID"]);

/** null = zdarzenie nie powiadamia (SANDBOX, brak environment, typy techniczne, promocja RC). */
export const classifySubscriptionEvent = (event: RcAlertEvent): SubscriptionAlertKind | null => {
  if (event.environment !== "PRODUCTION") return null;
  switch (event.type) {
    case "INITIAL_PURCHASE":
      if (event.period_type === "TRIAL") return "trial_started";
      return PAID_INITIAL_PERIODS.has(event.period_type ?? "") ? "first_payment" : null;
    case "RENEWAL":
      return event.is_trial_conversion === true ? "trial_converted" : "renewal";
    case "CANCELLATION":
      return event.cancel_reason === "CUSTOMER_SUPPORT" ? "refund" : "cancellation";
    case "BILLING_ISSUE":
      return "billing_issue";
    case "EXPIRATION":
      return "expiration";
    case "PRODUCT_CHANGE":
      return "product_change";
    default:
      return null;
  }
};

/** Pierwsza płatność za subskrypcję (liczona do "pierwszej płatnej w historii"). */
export const isPaidStart = (kind: SubscriptionAlertKind): boolean =>
  kind === "first_payment" || kind === "trial_converted";

// ---------------------------------------------------------------------------
// Treść.

type Lang = "pl" | "en";

const planLabel = (productId: string | undefined, lang: Lang): string => {
  const id = productId ?? "";
  if (/yearly|annual/i.test(id)) return lang === "pl" ? "PRO roczny" : "PRO yearly";
  if (/monthly/i.test(id)) return lang === "pl" ? "PRO miesięczny" : "PRO monthly";
  return id || (lang === "pl" ? "nieznany produkt" : "unknown product");
};

const STORE_LABELS: Record<string, string> = {
  APP_STORE: "App Store",
  MAC_APP_STORE: "Mac App Store",
  PLAY_STORE: "Google Play",
};
const storeLabel = (store: string | undefined): string => STORE_LABELS[store ?? ""] ?? (store || "nieznany sklep");

const finite = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

const formatNumber = (value: number, lang: Lang): string =>
  new Intl.NumberFormat(lang === "pl" ? "pl-PL" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const currencyLabel = (currency: string, lang: Lang): string => (lang === "pl" && currency === "PLN" ? "zł" : currency);

/** Kwota w walucie zakupu (np. "119,99 zł"); null, gdy payload jej nie niesie. */
const purchasedAmount = (event: RcAlertEvent, lang: Lang): string | null => {
  const amount = finite(event.price_in_purchased_currency);
  if (amount === null || !event.currency) return null;
  return `${formatNumber(amount, lang)} ${currencyLabel(event.currency, lang)}`;
};

/** Kwota do maila: waluta zakupu i, jeśli jest, równowartość w USD z pola price. */
const fullAmount = (event: RcAlertEvent): string => {
  const purchased = purchasedAmount(event, "pl");
  const usd = finite(event.price);
  const usdLabel = usd === null || event.currency === "USD" ? null : `${formatNumber(usd, "pl")} USD`;
  if (purchased && usdLabel) return `${purchased} (${usdLabel})`;
  return purchased ?? usdLabel ?? "brak w zdarzeniu";
};

const formatDate = (ms: number | undefined): string => {
  const value = finite(ms);
  if (value === null) return "brak w zdarzeniu";
  return new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
};

const CANCEL_REASONS: Record<string, string> = {
  UNSUBSCRIBE: "rezygnacja klienta",
  BILLING_ERROR: "błąd płatności",
  DEVELOPER_INITIATED: "anulowanie przez nas",
  PRICE_INCREASE: "brak zgody na podwyżkę ceny",
  CUSTOMER_SUPPORT: "zwrot przez sklep",
  UNKNOWN: "sklep nie podał powodu",
  SUBSCRIPTION_PAUSED: "koniec pauzy",
};

const EVENT_LABELS: Record<SubscriptionAlertKind, string> = {
  trial_started: "start okresu próbnego",
  first_payment: "nowa subskrypcja (pierwsza płatność)",
  trial_converted: "okres próbny zamieniony na płatny (pierwsza płatność)",
  renewal: "odnowienie",
  cancellation: "anulowanie (dostęp do końca opłaconego okresu)",
  refund: "zwrot pieniędzy",
  billing_issue: "problem z płatnością",
  expiration: "wygaśnięcie",
  product_change: "zmiana planu",
};

/** Tytuł bez prefiksu (push + temat maila). */
const headline = (event: RcAlertEvent, kind: SubscriptionAlertKind, isFirstPaid: boolean, lang: Lang): string => {
  const plan = planLabel(event.product_id, lang);
  const amount = purchasedAmount(event, lang);
  const withAmount = (text: string) => (amount ? `${text}, ${amount}` : text);
  const pl = lang === "pl";
  if (isFirstPaid) return withAmount(pl ? `PIERWSZA płatna subskrypcja: ${plan}` : `FIRST paid subscription: ${plan}`);
  switch (kind) {
    case "trial_started":
      return pl ? `Nowy okres próbny: ${plan}` : `New trial: ${plan}`;
    case "first_payment":
      return withAmount(pl ? `Nowa subskrypcja: ${plan}` : `New subscription: ${plan}`);
    case "trial_converted":
      return withAmount(pl ? `Trial zamieniony na płatny: ${plan}` : `Trial converted: ${plan}`);
    case "renewal":
      return withAmount(pl ? `Odnowienie: ${plan}` : `Renewal: ${plan}`);
    case "cancellation":
      if (event.period_type === "TRIAL") return pl ? `Anulowanie okresu próbnego: ${plan}` : `Trial cancelled: ${plan}`;
      return pl ? `Anulowanie: ${plan}` : `Cancellation: ${plan}`;
    case "refund":
      return withAmount(pl ? `Zwrot pieniędzy: ${plan}` : `Refund: ${plan}`);
    case "billing_issue":
      return pl ? `Problem z płatnością: ${plan}` : `Billing issue: ${plan}`;
    case "expiration":
      return pl ? `Subskrypcja wygasła: ${plan}` : `Subscription expired: ${plan}`;
    case "product_change":
      return pl
        ? `Zmiana planu: ${plan} na ${planLabel(event.new_product_id, lang)}`
        : `Plan change: ${plan} to ${planLabel(event.new_product_id, lang)}`;
  }
};

const customerEmailLabel = (email: string | null): string => {
  if (!email) return "brak adresu w profilu";
  return /@privaterelay\.appleid\.com$/i.test(email) ? `${email} (ukryty adres Apple)` : email;
};

export interface SubscriptionAlertContent {
  subject: string;
  html: string;
  text: string;
  push: { pl: { title: string; body: string }; en: { title: string; body: string }; data: Record<string, string> };
}

export const buildSubscriptionAlert = (input: {
  event: RcAlertEvent;
  kind: SubscriptionAlertKind;
  uid: string;
  isFirstPaid: boolean;
  customerEmail: string | null;
}): SubscriptionAlertContent => {
  const { event, kind, uid, isFirstPaid, customerEmail } = input;
  const titlePl = headline(event, kind, isFirstPaid, "pl");
  const panelUrl = `${ADMIN_PANEL_USER_URL}${encodeURIComponent(uid)}`;
  const productLine = event.product_id ? `${planLabel(event.product_id, "pl")} (${event.product_id})` : planLabel(undefined, "pl");

  const rows: Array<[string, string]> = [
    ["Zdarzenie", EVENT_LABELS[kind]],
    ["Produkt", productLine],
    ...(kind === "product_change" && event.new_product_id
      ? [["Nowy produkt", `${planLabel(event.new_product_id, "pl")} (${event.new_product_id})`] as [string, string]]
      : []),
    ["Sklep", storeLabel(event.store)],
    ["Kraj", event.country_code || "brak w zdarzeniu"],
    ["Kwota", fullAmount(event)],
    ["Data", formatDate(event.event_timestamp_ms ?? event.purchased_at_ms)],
    ...((kind === "cancellation" || kind === "refund") && event.cancel_reason
      ? [["Powód", `${CANCEL_REASONS[event.cancel_reason] ?? "inny"} (${event.cancel_reason})`] as [string, string]]
      : []),
    ...(kind === "expiration" && event.expiration_reason ? [["Powód", event.expiration_reason] as [string, string]] : []),
    ["E-mail klienta", customerEmailLabel(customerEmail)],
    ["Użytkownik", `${uid.slice(0, 6)}…`],
  ];

  const firstPaidBanner = isFirstPaid
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
    <tr><td bgcolor="${EMAIL_COLORS.bg}" style="background-color:${EMAIL_COLORS.bg};border-left:6px solid ${EMAIL_COLORS.lime};padding:16px;${EMAIL_FONT}font-size:18px;font-weight:700;color:${EMAIL_COLORS.text};">Pierwsza płatna subskrypcja w historii Strength Save</td></tr>
  </table>`
    : "";
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
${rows.map(([label, value]) => `    <tr><td style="${EMAIL_FONT}padding:6px 12px 6px 0;font-size:14px;color:${EMAIL_COLORS.muted};vertical-align:top;white-space:nowrap;">${esc(label)}</td><td style="${EMAIL_FONT}padding:6px 0;font-size:14px;color:${EMAIL_COLORS.text};">${esc(value)}</td></tr>`).join("\n")}
  </table>`;
  const html = renderEmailLayout({
    lang: "pl",
    preheader: titlePl,
    bodyHtml: [
      firstPaidBanner,
      emailHeading(esc(titlePl)),
      table,
      emailButton(panelUrl, "Karta użytkownika w panelu admina"),
      emailParagraph(`Adres karty: ${esc(panelUrl)}`, `font-size:12px;color:${EMAIL_COLORS.muted};`),
    ].join("\n"),
    reason: "Wiadomość wewnętrzna dla właściciela: zdarzenie subskrypcji z RevenueCat (tylko zakupy produkcyjne).",
    internal: true,
  });
  const text = [
    ...(isFirstPaid ? ["Pierwsza płatna subskrypcja w historii Strength Save", ""] : []),
    titlePl,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Karta użytkownika w panelu admina: ${panelUrl}`,
  ].join("\n");

  const pushBody = `${storeLabel(event.store)}${event.country_code ? `, ${event.country_code}` : ""}`;
  return {
    subject: `[Strength Save] ${titlePl}`,
    html,
    text,
    push: {
      pl: { title: titlePl, body: pushBody },
      en: { title: headline(event, kind, isFirstPaid, "en"), body: pushBody },
      data: { type: "subscription_alert", deepLink: `/admin/users/${uid}` },
    },
  };
};

// ---------------------------------------------------------------------------
// Wysyłka.

type DeliveryResponse = { success: boolean; error?: { code?: string } };

// Te same kody co getInvalidFcmTokens w daily-reminder.ts; import stamtąd
// wciągałby do webhooka płatności łańcuch cost-guard (onCall/pubsub).
const INVALID_TOKEN_CODES = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);
const invalidTokens = (tokens: string[], responses: DeliveryResponse[]): string[] =>
  responses.flatMap((response, index) => (
    !response.success && response.error?.code && INVALID_TOKEN_CODES.has(response.error.code) ? [tokens[index]] : []
  ));

export interface PushTarget {
  uid: string;
  language?: string;
  registrations: Array<{ id: string; token: string }>;
}

export interface SubscriptionAlertDeps {
  /** Transakcja: znacznik eventu + licznik płatnych. claimed=false = już powiadomione. */
  claim: (input: { eventId: string; paid: boolean; kind: SubscriptionAlertKind; uid: string }) => Promise<{ claimed: boolean; isFirstPaid: boolean }>;
  readCustomerEmail: (uid: string) => Promise<string | null>;
  sendEmail: (message: { to: string; subject: string; html: string; text: string }) => Promise<void>;
  /** Urządzenia konta właściciela; null = brak konfiguracji / wyłączony przełącznik. */
  resolvePushTarget: () => Promise<PushTarget | null>;
  sendMulticast: (tokens: string[], title: string, body: string, data: Record<string, string>) => Promise<{
    successCount: number;
    failureCount: number;
    responses: DeliveryResponse[];
  }>;
  deleteRegistrations: (registrationIds: string[]) => Promise<void>;
}

export type SubscriptionAlertOutcome =
  | { status: "skipped"; reason: "not-notifiable" | "no-event-id" | "already-notified" }
  | { status: "failed"; reason: "claim-failed" }
  | {
    status: "sent";
    kind: SubscriptionAlertKind;
    isFirstPaid: boolean;
    emails: number;
    emailErrors: string[];
    push: "sent" | "no-target" | "failed";
    pushSent: number;
    pushFailed: number;
  };

/** Nigdy nie rzuca: powiadomienie nie może zmienić odpowiedzi webhooka. */
export async function runSubscriptionAlert(deps: SubscriptionAlertDeps, event: RcAlertEvent, uid: string): Promise<SubscriptionAlertOutcome> {
  const kind = classifySubscriptionEvent(event);
  if (!kind) return { status: "skipped", reason: "not-notifiable" };
  if (typeof event.id !== "string" || event.id.length === 0) return { status: "skipped", reason: "no-event-id" };

  let claim: { claimed: boolean; isFirstPaid: boolean };
  try {
    claim = await deps.claim({ eventId: event.id, paid: isPaidStart(kind), kind, uid });
  } catch (error) {
    logger.error("[subscriptionAlert] claim failed", { eventId: event.id, message: error instanceof Error ? error.message : String(error) });
    return { status: "failed", reason: "claim-failed" };
  }
  if (!claim.claimed) return { status: "skipped", reason: "already-notified" };

  let customerEmail: string | null = null;
  try {
    customerEmail = await deps.readCustomerEmail(uid);
  } catch {
    customerEmail = null;
  }
  const content = buildSubscriptionAlert({ event, kind, uid, isFirstPaid: claim.isFirstPaid, customerEmail });

  let emails = 0;
  const emailErrors: string[] = [];
  for (const to of SUBSCRIPTION_ALERT_RECIPIENTS) {
    try {
      await deps.sendEmail({ to, subject: content.subject, html: content.html, text: content.text });
      emails += 1;
    } catch (error) {
      emailErrors.push(safeSesErrorCode(error));
    }
  }

  let push: "sent" | "no-target" | "failed" = "no-target";
  let pushSent = 0;
  let pushFailed = 0;
  try {
    const target = await deps.resolvePushTarget();
    const registrations = (target?.registrations ?? []).filter((registration) => !!registration.token);
    if (target && registrations.length > 0) {
      const copy = target.language === "en" ? content.push.en : content.push.pl;
      const tokens = registrations.map((registration) => registration.token);
      const res = await deps.sendMulticast(tokens, copy.title, copy.body, content.push.data);
      pushSent = res.successCount;
      pushFailed = res.failureCount;
      push = "sent";
      const invalid = invalidTokens(tokens, res.responses);
      if (invalid.length > 0) {
        await deps.deleteRegistrations(registrations.filter((r) => invalid.includes(r.token)).map((r) => r.id));
      }
    }
  } catch (error) {
    push = "failed";
    logger.error("[subscriptionAlert] push failed", { eventId: event.id, message: error instanceof Error ? error.message : String(error) });
  }

  return { status: "sent", kind, isFirstPaid: claim.isFirstPaid, emails, emailErrors, push, pushSent, pushFailed };
}

// ---------------------------------------------------------------------------
// Odbiorca pusha: konto właściciela z parametru, rozwiązywane serwerowo.

export interface OwnerPushTargetDeps {
  ownerEmail: string;
  getUidByEmail: (email: string) => Promise<string | null>;
  getUser: (uid: string) => Promise<Record<string, unknown> | null>;
  listRegistrations: (uid: string) => Promise<Array<{ id: string; token: string }>>;
}

export const resolveOwnerPushTarget = async (deps: OwnerPushTargetDeps): Promise<PushTarget | null> => {
  const email = deps.ownerEmail.trim();
  if (!email) {
    logger.warn("[subscriptionAlert] SUBSCRIPTION_ALERT_OWNER_EMAIL nieustawiony: bez pusha");
    return null;
  }
  const uid = await deps.getUidByEmail(email);
  if (!uid) {
    logger.warn("[subscriptionAlert] konto właściciela nie istnieje w Auth: bez pusha");
    return null;
  }
  const user = await deps.getUser(uid);
  // Bezpiecznik złej konfiguracji: push o cudzych zakupach tylko na konto admina.
  if (!user || user.role !== "admin") {
    logger.warn("[subscriptionAlert] konto z SUBSCRIPTION_ALERT_OWNER_EMAIL nie jest adminem: bez pusha");
    return null;
  }
  const prefs = user.notificationPrefs as { subscriptionAlerts?: unknown } | undefined;
  if (prefs?.subscriptionAlerts === false) return null;
  return {
    uid,
    ...(typeof user.language === "string" ? { language: user.language } : {}),
    registrations: await deps.listRegistrations(uid),
  };
};

/** Czy zalogowany user jest odbiorcą pusha (przełącznik w Profilu tylko dla niego). */
export const isSubscriptionAlertOwner = (callerEmail: unknown, ownerEmail: string): boolean =>
  typeof callerEmail === "string"
  && ownerEmail.trim().length > 0
  && callerEmail.trim().toLowerCase() === ownerEmail.trim().toLowerCase();

// ---------------------------------------------------------------------------
// Firestore / SES / FCM.

let ownerUidCache: { email: string; uid: string | null; at: number } | null = null;
const OWNER_UID_CACHE_MS = 10 * 60 * 1000;

const getUidByEmailCached = async (email: string): Promise<string | null> => {
  const now = Date.now();
  if (ownerUidCache && ownerUidCache.email === email && now - ownerUidCache.at < OWNER_UID_CACHE_MS) return ownerUidCache.uid;
  let uid: string | null = null;
  try {
    uid = (await admin.auth().getUserByEmail(email)).uid;
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }
  ownerUidCache = { email, uid, at: now };
  return uid;
};

export const buildSubscriptionAlertDeps = (db: FirebaseFirestore.Firestore): SubscriptionAlertDeps => ({
  claim: ({ eventId, paid, kind, uid }) => db.runTransaction(async (tx) => {
    const markerRef = db.collection(SUBSCRIPTION_ALERT_MARKERS_COLLECTION).doc(eventId);
    const configRef = db.collection(SUBSCRIPTION_ALERT_CONFIG_DOC.collection).doc(SUBSCRIPTION_ALERT_CONFIG_DOC.id);
    const marker = await tx.get(markerRef);
    const config = paid ? await tx.get(configRef) : null;
    if (marker.exists) return { claimed: false, isFirstPaid: false };
    const nowIso = new Date().toISOString();
    let isFirstPaid = false;
    if (paid && config) {
      const data = config.data() ?? {};
      const count = typeof data.paidSubscriptionCount === "number" ? data.paidSubscriptionCount : 0;
      isFirstPaid = count === 0 && !data.firstPaidAt;
      tx.set(configRef, {
        paidSubscriptionCount: count + 1,
        lastPaidAt: nowIso,
        ...(isFirstPaid ? { firstPaidAt: nowIso, firstPaidEventId: eventId } : {}),
      }, { merge: true });
    }
    // Tylko typ i skrót: bez adresu e-mail i kwot (znacznik żyje bez TTL).
    tx.set(markerRef, { kind, uidPrefix: uid.slice(0, 6), isFirstPaid, createdAt: nowIso });
    return { claimed: true, isFirstPaid };
  }),
  readCustomerEmail: async (uid) => {
    const snap = await db.collection("users").doc(uid).get();
    const email = snap.exists ? snap.data()?.email : null;
    return typeof email === "string" && email.length > 0 ? email : null;
  },
  sendEmail: async (message) => {
    await sendSesEmail(message);
  },
  resolvePushTarget: () => resolveOwnerPushTarget({
    ownerEmail: subscriptionAlertOwnerEmail.value(),
    getUidByEmail: getUidByEmailCached,
    getUser: async (uid) => {
      const snap = await db.collection("users").doc(uid).get();
      return snap.exists ? (snap.data() as Record<string, unknown>) : null;
    },
    listRegistrations: async (uid) => {
      const snap = await db.collection("fcm_token_registrations").where("userId", "==", uid).limit(20).get();
      return snap.docs.map((doc) => ({ id: doc.id, token: typeof doc.data().token === "string" ? doc.data().token as string : "" }));
    },
  }),
  sendMulticast: (tokens, title, body, data) => admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
    apns: { payload: { aps: { sound: "default" } } },
  }),
  deleteRegistrations: async (ids) => {
    await Promise.all(ids.map((id) => db.collection("fcm_token_registrations").doc(id).delete()));
  },
});

const ALERT_TIMEOUT_MS = 20_000;

/**
 * Wywoływane przez webhook PO udanym zapisie subskrypcji, PRZED odpowiedzią
 * (po odpowiedzi Cloud Run dławi CPU). Nie rzuca i ma sufit czasu, żeby RC
 * dostał 200 w swoim oknie nawet przy wiszącym SES/FCM.
 */
export async function notifySubscriptionEvent(event: RcAlertEvent, uid: string): Promise<void> {
  if (!classifySubscriptionEvent(event)) return;
  try {
    const outcome = await Promise.race([
      runSubscriptionAlert(buildSubscriptionAlertDeps(admin.firestore()), event, uid),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ALERT_TIMEOUT_MS).unref?.()),
    ]);
    if (outcome === "timeout") logger.error("[subscriptionAlert] timeout", { eventId: event.id });
    else logger.info("[subscriptionAlert]", { eventId: event.id, type: event.type, ...outcome });
  } catch (error) {
    logger.error("[subscriptionAlert] unexpected", { eventId: event.id, message: error instanceof Error ? error.message : String(error) });
  }
}
