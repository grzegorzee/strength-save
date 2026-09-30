import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { REVENUECAT_PROJECT_ID } from "./revenuecat-transfer";
import { serverApiKey } from "./revenuecat";
import { withCostGuard } from "./cost-guard";
import { SES_EMAIL_SECRETS, sendSesEmail } from "./ses-email";
import { emailButton, emailHeading, emailParagraph, esc, EMAIL_COLORS, EMAIL_FONT, renderEmailLayout } from "./email-layout";
import {
  SUBSCRIPTION_ALERT_MARKERS_COLLECTION,
  SUBSCRIPTION_ALERT_RECIPIENTS,
  isSubscriptionAlertOwner,
  subscriptionAlertOwnerEmail,
  type SubscriptionAlertKind,
} from "./subscription-alerts";

// Podsumowanie subskrypcji dla właściciela (2026-09-30): liczby z RevenueCat
// API v2 "Get overview metrics" (GET /v2/projects/{id}/metrics/overview,
// uprawnienie klucza charts_metrics:overview:read, limit domeny 25 zapytań/min).
// Klucz serwerowy nigdy nie trafia do klienta: panel woła callable admina,
// a wynik żyje w cache config/revenuecat_metrics (max 1 h), żeby wejście do
// panelu nie odpytywało RC za każdym razem. Tygodniowy mail z tymi samymi
// liczbami: weeklySubscriptionDigest (pod bezpiecznikiem kosztów).

export const METRICS_CACHE_TTL_MS = 60 * 60 * 1000;
export const METRICS_CACHE_DOC = { collection: "config", id: "revenuecat_metrics" } as const;
const METRICS_CURRENCY = "PLN";
const ADMIN_PANEL_URL = "https://app.strengthsave.app/#/admin";

export interface SubscriptionMetrics {
  activeTrials: number | null;
  activeSubscriptions: number | null;
  mrr: number | null;
  revenue28d: number | null;
  newCustomers28d: number | null;
  activeUsers28d: number | null;
  currency: string;
  /** Kiedy RC przeliczył metryki (ms), jeśli podał. */
  rcUpdatedAt: number | null;
}

export interface SubscriptionMetricsCache {
  metrics: SubscriptionMetrics;
  fetchedAt: number;
}

export interface SubscriptionMetricsResult {
  metrics: SubscriptionMetrics | null;
  fetchedAt: number | null;
  /** true = liczby nie są świeże (RC niedostępny); error mówi dlaczego. */
  stale: boolean;
  error: string | null;
}

const METRIC_IDS: Record<Exclude<keyof SubscriptionMetrics, "currency" | "rcUpdatedAt">, string> = {
  activeTrials: "active_trials",
  activeSubscriptions: "active_subscriptions",
  mrr: "mrr",
  revenue28d: "revenue",
  newCustomers28d: "new_customers",
  activeUsers28d: "active_users",
};

const finite = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

export const parseOverviewMetrics = (body: unknown): SubscriptionMetrics | null => {
  if (!body || typeof body !== "object") return null;
  const data = body as { metrics?: unknown; currency?: unknown };
  if (!Array.isArray(data.metrics)) return null;
  const items = data.metrics.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  const value = (id: string) => finite(items.find((item) => item.id === id)?.value);
  const updated = items.map((item) => finite(item.last_updated_at)).filter((ms): ms is number => ms !== null);
  return {
    activeTrials: value(METRIC_IDS.activeTrials),
    activeSubscriptions: value(METRIC_IDS.activeSubscriptions),
    mrr: value(METRIC_IDS.mrr),
    revenue28d: value(METRIC_IDS.revenue28d),
    newCustomers28d: value(METRIC_IDS.newCustomers28d),
    activeUsers28d: value(METRIC_IDS.activeUsers28d),
    currency: typeof data.currency === "string" ? data.currency : METRICS_CURRENCY,
    rcUpdatedAt: updated.length > 0 ? Math.max(...updated) : null,
  };
};

/** Odczyt z RC; treść odpowiedzi nie jest logowana. */
export const fetchRevenueCatOverview = async (key: string, fetchImpl: typeof fetch = fetch): Promise<SubscriptionMetrics> => {
  if (!key.startsWith("sk_")) throw new Error("REVENUECAT_SERVER_KEY_NOT_CONFIGURED");
  const url = `https://api.revenuecat.com/v2/projects/${REVENUECAT_PROJECT_ID}/metrics/overview?currency=${METRICS_CURRENCY}`;
  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`REVENUECAT_HTTP_${response.status}`);
  const metrics = parseOverviewMetrics(await response.json());
  if (!metrics) throw new Error("INVALID_RC_RESPONSE");
  return metrics;
};

const safeErrorCode = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "";
  return /^(REVENUECAT_[A-Z_0-9]+|INVALID_RC_RESPONSE)$/.test(message) ? message : "REVENUECAT_UNAVAILABLE";
};

export interface SubscriptionMetricsDeps {
  nowMs: number;
  readCache: () => Promise<SubscriptionMetricsCache | null>;
  writeCache: (cache: SubscriptionMetricsCache) => Promise<void>;
  fetchOverview: () => Promise<SubscriptionMetrics>;
}

export const getSubscriptionMetrics = async (
  deps: SubscriptionMetricsDeps,
  options: { force?: boolean } = {},
): Promise<SubscriptionMetricsResult> => {
  const cache = await deps.readCache();
  if (!options.force && cache && deps.nowMs - cache.fetchedAt < METRICS_CACHE_TTL_MS) {
    return { metrics: cache.metrics, fetchedAt: cache.fetchedAt, stale: false, error: null };
  }
  try {
    const metrics = await deps.fetchOverview();
    await deps.writeCache({ metrics, fetchedAt: deps.nowMs });
    return { metrics, fetchedAt: deps.nowMs, stale: false, error: null };
  } catch (error) {
    const code = safeErrorCode(error);
    logger.warn("[subscriptionMetrics] RC overview failed", { code });
    return { metrics: cache?.metrics ?? null, fetchedAt: cache?.fetchedAt ?? null, stale: true, error: code };
  }
};

export const loadSubscriptionMetricsForAdmin = async (
  deps: Omit<SubscriptionMetricsDeps, "nowMs"> & { nowMs: number; isAdmin: (uid: string) => Promise<boolean> },
  uid: string | undefined,
): Promise<SubscriptionMetricsResult> => {
  if (!uid) throw new HttpsError("unauthenticated", "Must be logged in");
  if (!await deps.isAdmin(uid)) throw new HttpsError("permission-denied", "Admin access required");
  return getSubscriptionMetrics(deps);
};

// ---------------------------------------------------------------------------
// Tygodniowy mail.

const EVENT_COUNT_LABELS: Record<SubscriptionAlertKind, string> = {
  trial_started: "Start okresu próbnego",
  first_payment: "Nowa subskrypcja",
  trial_converted: "Trial zamieniony na płatny",
  renewal: "Odnowienie",
  cancellation: "Anulowanie",
  refund: "Zwrot pieniędzy",
  billing_issue: "Problem z płatnością",
  expiration: "Wygaśnięcie",
  product_change: "Zmiana planu",
};

const money = (value: number | null, currency: string): string => {
  if (value === null) return "brak danych";
  const amount = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return `${amount} ${currency === "PLN" ? "zł" : currency}`;
};
const count = (value: number | null): string => (value === null ? "brak danych" : String(value));
const warsawTime = (ms: number): string =>
  new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" }).format(new Date(ms));

export const buildWeeklySubscriptionDigest = (input: {
  result: SubscriptionMetricsResult;
  eventCounts: Partial<Record<SubscriptionAlertKind, number>>;
}): { subject: string; html: string; text: string } => {
  const { result, eventCounts } = input;
  const m = result.metrics;
  const metricRows: Array<[string, string]> = m
    ? [
      ["Aktywne triale", count(m.activeTrials)],
      ["Aktywne subskrypcje", count(m.activeSubscriptions)],
      ["MRR", money(m.mrr, m.currency)],
      ["Przychód 28 dni", money(m.revenue28d, m.currency)],
      ["Nowi klienci 28 dni", count(m.newCustomers28d)],
    ]
    : [];
  const status = result.error
    ? `RevenueCat niedostępny (${result.error})${result.fetchedAt ? `, liczby z ${warsawTime(result.fetchedAt)}` : ""}`
    : result.fetchedAt ? `Stan RevenueCat z ${warsawTime(result.fetchedAt)}` : "";
  const eventRows = (Object.keys(EVENT_COUNT_LABELS) as SubscriptionAlertKind[])
    .filter((kind) => (eventCounts[kind] ?? 0) > 0)
    .map((kind): [string, string] => [EVENT_COUNT_LABELS[kind], String(eventCounts[kind])]);

  const table = (rows: Array<[string, string]>) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
${rows.map(([label, value]) => `    <tr><td style="${EMAIL_FONT}padding:6px 12px 6px 0;font-size:14px;color:${EMAIL_COLORS.muted};">${esc(label)}</td><td style="${EMAIL_FONT}padding:6px 0;font-size:14px;font-weight:600;color:${EMAIL_COLORS.text};">${esc(value)}</td></tr>`).join("\n")}
  </table>`;
  const noEvents = "Brak zdarzeń subskrypcji w ostatnich 7 dniach.";
  const subject = "[Strength Save] Subskrypcje: podsumowanie tygodnia";
  const html = renderEmailLayout({
    lang: "pl",
    preheader: m ? `Aktywne subskrypcje: ${count(m.activeSubscriptions)}, MRR: ${money(m.mrr, m.currency)}` : "RevenueCat niedostępny",
    bodyHtml: [
      emailHeading("Subskrypcje: podsumowanie tygodnia"),
      metricRows.length > 0 ? table(metricRows) : "",
      status ? emailParagraph(esc(status), `font-size:13px;color:${EMAIL_COLORS.muted};`) : "",
      emailHeading("Ostatnie 7 dni"),
      eventRows.length > 0 ? table(eventRows) : emailParagraph(noEvents),
      emailButton(ADMIN_PANEL_URL, "Panel admina"),
      emailParagraph(`Adres panelu: ${esc(ADMIN_PANEL_URL)}`, `font-size:12px;color:${EMAIL_COLORS.muted};`),
    ].join("\n"),
    reason: "Wiadomość wewnętrzna dla właściciela: tygodniowe podsumowanie subskrypcji (RevenueCat, zakupy produkcyjne).",
    internal: true,
  });
  const text = [
    "Subskrypcje: podsumowanie tygodnia",
    "",
    ...metricRows.map(([label, value]) => `${label}: ${value}`),
    ...(status ? [status] : []),
    "",
    "Ostatnie 7 dni:",
    ...(eventRows.length > 0 ? eventRows.map(([label, value]) => `${label}: ${value}`) : [noEvents]),
    "",
    `Panel admina: ${ADMIN_PANEL_URL}`,
  ].join("\n");
  return { subject, html, text };
};

// ---------------------------------------------------------------------------
// Firestore + wdrażane funkcje.

const cacheRef = () => admin.firestore().collection(METRICS_CACHE_DOC.collection).doc(METRICS_CACHE_DOC.id);

const firestoreMetricsDeps = (): Omit<SubscriptionMetricsDeps, "nowMs"> => ({
  readCache: async () => {
    const snap = await cacheRef().get();
    const data = snap.exists ? snap.data() : undefined;
    if (!data || typeof data.fetchedAt !== "number" || !data.metrics || typeof data.metrics !== "object") return null;
    return { metrics: data.metrics as SubscriptionMetrics, fetchedAt: data.fetchedAt };
  },
  writeCache: async (cache) => {
    await cacheRef().set(cache);
  },
  fetchOverview: () => fetchRevenueCatOverview(serverApiKey.value()),
});

const isAdminUid = async (uid: string): Promise<boolean> => {
  const snap = await admin.firestore().collection("users").doc(uid).get();
  return snap.exists && snap.data()?.role === "admin";
};

/** Karta „Subskrypcje” w panelu admina. */
export const adminSubscriptionMetrics = onCall(
  { secrets: [serverApiKey], region: "us-central1", timeoutSeconds: 30 },
  (request) => loadSubscriptionMetricsForAdmin({ ...firestoreMetricsDeps(), nowMs: Date.now(), isAdmin: isAdminUid }, request.auth?.uid),
);

/** Czy zalogowany admin jest odbiorcą pusha o zakupach (przełącznik w Profilu tylko dla niego). */
export const subscriptionAlertRecipientStatus = onCall(
  { region: "us-central1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Must be logged in");
    const recipient = isSubscriptionAlertOwner(request.auth?.token?.email, subscriptionAlertOwnerEmail.value())
      && await isAdminUid(uid);
    return { recipient };
  },
);

const countRecentAlertEvents = async (sinceIso: string): Promise<Partial<Record<SubscriptionAlertKind, number>>> => {
  const snap = await admin.firestore().collection(SUBSCRIPTION_ALERT_MARKERS_COLLECTION)
    .where("createdAt", ">=", sinceIso)
    .limit(2000)
    .get();
  const counts: Partial<Record<SubscriptionAlertKind, number>> = {};
  for (const doc of snap.docs) {
    const kind = doc.data().kind as SubscriptionAlertKind;
    if (kind in EVENT_COUNT_LABELS) counts[kind] = (counts[kind] ?? 0) + 1;
  }
  return counts;
};

/** Poniedziałek 08:00 czasu polskiego: liczby RC (świeży odczyt) + zdarzenia z 7 dni. */
export const weeklySubscriptionDigest = onSchedule(
  {
    schedule: "every monday 08:00",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 120,
    secrets: [serverApiKey, ...SES_EMAIL_SECRETS],
  },
  withCostGuard("weeklySubscriptionDigest", async () => {
    const nowMs = Date.now();
    const result = await getSubscriptionMetrics({ ...firestoreMetricsDeps(), nowMs }, { force: true });
    let eventCounts: Partial<Record<SubscriptionAlertKind, number>> = {};
    try {
      eventCounts = await countRecentAlertEvents(new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString());
    } catch (error) {
      logger.warn("[weeklySubscriptionDigest] licznik zdarzeń nieodczytany", { message: error instanceof Error ? error.message : String(error) });
    }
    const mail = buildWeeklySubscriptionDigest({ result, eventCounts });
    for (const to of SUBSCRIPTION_ALERT_RECIPIENTS) {
      await sendSesEmail({ to, subject: mail.subject, html: mail.html, text: mail.text });
    }
    logger.info("[weeklySubscriptionDigest] sent", { error: result.error, events: eventCounts });
  }),
);
