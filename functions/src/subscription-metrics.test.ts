import { describe, expect, it, vi } from "vitest";
import {
  METRICS_CACHE_TTL_MS,
  buildWeeklySubscriptionDigest,
  fetchRevenueCatOverview,
  getSubscriptionMetrics,
  loadSubscriptionMetricsForAdmin,
  parseOverviewMetrics,
  type SubscriptionMetricsCache,
} from "./subscription-metrics";
import { SUBSCRIPTION_ALERT_RECIPIENTS } from "./subscription-alerts";

// Kształt odpowiedzi GET /v2/projects/{id}/metrics/overview (dokumentacja RC API v2,
// "Get overview metrics", uprawnienie charts_metrics:overview:read). Identyfikatory
// metryk potwierdzone odczytem na kluczu projektu 2026-09-30 (bez wartości).
const overview = {
  object: "overview_metrics",
  currency: "PLN",
  metrics: [
    { object: "overview_metric", id: "active_trials", name: "Active Trials", unit: "#", period: "P0D", value: 4, last_updated_at: 1_790_000_000_000, last_updated_at_iso8601: "2026-09-21T10:13:20Z" },
    { object: "overview_metric", id: "active_subscriptions", name: "Active Subscriptions", unit: "#", period: "P0D", value: 2, last_updated_at: 1_790_000_000_000, last_updated_at_iso8601: null },
    { object: "overview_metric", id: "mrr", name: "MRR", unit: "$", period: "P28D", value: 29.5, last_updated_at: null, last_updated_at_iso8601: null },
    { object: "overview_metric", id: "revenue", name: "Revenue", unit: "$", period: "P28D", value: 139.98, last_updated_at: null, last_updated_at_iso8601: null },
    { object: "overview_metric", id: "new_customers", name: "New Customers", unit: "#", period: "P28D", value: 30, last_updated_at: null, last_updated_at_iso8601: null },
    { object: "overview_metric", id: "active_users", name: "Active Users", unit: "#", period: "P28D", value: 55, last_updated_at: null, last_updated_at_iso8601: null },
  ],
};
const parsed = parseOverviewMetrics(overview)!;

describe("parseOverviewMetrics", () => {
  it("mapuje metryki RC na liczby karty", () => {
    expect(parsed).toEqual({
      activeTrials: 4,
      activeSubscriptions: 2,
      mrr: 29.5,
      revenue28d: 139.98,
      newCustomers28d: 30,
      activeUsers28d: 55,
      currency: "PLN",
      rcUpdatedAt: 1_790_000_000_000,
    });
  });

  it("brak metryki = null (nie zero), zła odpowiedź = null", () => {
    expect(parseOverviewMetrics({ object: "overview_metrics", currency: "PLN", metrics: [] })).toMatchObject({ activeTrials: null, mrr: null });
    expect(parseOverviewMetrics({ message: "forbidden" })).toBeNull();
    expect(parseOverviewMetrics(null)).toBeNull();
  });
});

describe("fetchRevenueCatOverview", () => {
  it("woła endpoint overview projektu z walutą PLN i kluczem Bearer", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(overview), { status: 200 }));
    expect(await fetchRevenueCatOverview("sk_test", fetchImpl as unknown as typeof fetch)).toEqual(parsed);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.revenuecat.com/v2/projects/proj67cb081f/metrics/overview?currency=PLN");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test");
  });

  it("HTTP 403 (klucz bez uprawnienia) i zły klucz = czytelny kod błędu", async () => {
    const forbidden = vi.fn(async () => new Response("{}", { status: 403 }));
    await expect(fetchRevenueCatOverview("sk_test", forbidden as unknown as typeof fetch)).rejects.toThrow("REVENUECAT_HTTP_403");
    await expect(fetchRevenueCatOverview("", forbidden as unknown as typeof fetch)).rejects.toThrow("REVENUECAT_SERVER_KEY_NOT_CONFIGURED");
  });
});

describe("getSubscriptionMetrics (cache max 1 h)", () => {
  const NOW = 1_800_000_000_000;
  const deps = (cache: SubscriptionMetricsCache | null, fetchOverview = vi.fn(async () => parsed)) => ({
    nowMs: NOW,
    readCache: vi.fn(async () => cache),
    writeCache: vi.fn(async () => undefined),
    fetchOverview,
  });

  it("świeży cache: zero zapytań do RC", async () => {
    const d = deps({ metrics: parsed, fetchedAt: NOW - METRICS_CACHE_TTL_MS + 1000 });
    expect(await getSubscriptionMetrics(d)).toEqual({ metrics: parsed, fetchedAt: NOW - METRICS_CACHE_TTL_MS + 1000, stale: false, error: null });
    expect(d.fetchOverview).not.toHaveBeenCalled();
  });

  it("cache starszy niż 1 h albo brak: odczyt z RC i zapis cache", async () => {
    for (const cache of [null, { metrics: parsed, fetchedAt: NOW - METRICS_CACHE_TTL_MS - 1 }]) {
      const d = deps(cache);
      expect(await getSubscriptionMetrics(d)).toEqual({ metrics: parsed, fetchedAt: NOW, stale: false, error: null });
      expect(d.writeCache).toHaveBeenCalledWith({ metrics: parsed, fetchedAt: NOW });
    }
  });

  it("wymuszone odświeżenie (digest) omija cache", async () => {
    const d = deps({ metrics: parsed, fetchedAt: NOW - 1000 });
    await getSubscriptionMetrics(d, { force: true });
    expect(d.fetchOverview).toHaveBeenCalledTimes(1);
  });

  it("błąd RC przy starym cache: stare liczby z flagą stale i kodem błędu", async () => {
    const d = deps({ metrics: parsed, fetchedAt: NOW - 2 * METRICS_CACHE_TTL_MS }, vi.fn(async () => { throw new Error("REVENUECAT_HTTP_503"); }));
    expect(await getSubscriptionMetrics(d)).toEqual({ metrics: parsed, fetchedAt: NOW - 2 * METRICS_CACHE_TTL_MS, stale: true, error: "REVENUECAT_HTTP_503" });
    expect(d.writeCache).not.toHaveBeenCalled();
  });

  it("błąd RC bez cache: brak liczb i kod błędu (karta pokazuje wyjście: ponów)", async () => {
    const d = deps(null, vi.fn(async () => { throw new Error("REVENUECAT_HTTP_403"); }));
    expect(await getSubscriptionMetrics(d)).toEqual({ metrics: null, fetchedAt: null, stale: true, error: "REVENUECAT_HTTP_403" });
  });

  it("nieznany błąd nie wycieka treścią (tylko kod)", async () => {
    const d = deps(null, vi.fn(async () => { throw new Error("Bearer sk_secret leaked in message"); }));
    expect((await getSubscriptionMetrics(d)).error).toBe("REVENUECAT_UNAVAILABLE");
  });
});

describe("loadSubscriptionMetricsForAdmin (callable)", () => {
  const base = { readCache: async () => null, writeCache: async () => undefined, fetchOverview: async () => parsed, nowMs: 1 };
  it("wymaga zalogowanego admina", async () => {
    await expect(loadSubscriptionMetricsForAdmin({ ...base, isAdmin: async () => true }, undefined)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(loadSubscriptionMetricsForAdmin({ ...base, isAdmin: async () => false }, "user-1")).rejects.toMatchObject({ code: "permission-denied" });
    await expect(loadSubscriptionMetricsForAdmin({ ...base, isAdmin: async () => true }, "admin-1")).resolves.toMatchObject({ metrics: parsed });
  });
});

describe("buildWeeklySubscriptionDigest", () => {
  it("liczby z RC i zdarzenia z 7 dni, bez pauz i bez stopki z danymi firmy", () => {
    const mail = buildWeeklySubscriptionDigest({
      result: { metrics: parsed, fetchedAt: Date.parse("2026-10-05T06:00:00Z"), stale: false, error: null },
      eventCounts: { trial_started: 3, first_payment: 1, renewal: 2 },
    });
    expect(mail.subject).toBe("[Strength Save] Subskrypcje: podsumowanie tygodnia");
    expect(mail.text).toContain("Aktywne triale: 4");
    expect(mail.text).toContain("Aktywne subskrypcje: 2");
    expect(mail.text).toContain("MRR: 29,50 zł");
    expect(mail.text).toContain("Przychód 28 dni: 139,98 zł");
    expect(mail.text).toContain("Start okresu próbnego: 3");
    expect(mail.text).toContain("Nowa subskrypcja: 1");
    expect(mail.text).toContain("https://app.strengthsave.app/#/admin");
    const all = `${mail.subject}\n${mail.html}\n${mail.text}`;
    expect(all).not.toMatch(/[–—]/);
    expect(all).not.toContain("WEB3 POWER");
    expect(all).not.toContain("strengthsave.app/support");
  });

  it("RC niedostępny: mail nadal wychodzi z informacją o błędzie", () => {
    const mail = buildWeeklySubscriptionDigest({ result: { metrics: null, fetchedAt: null, stale: true, error: "REVENUECAT_HTTP_503" }, eventCounts: {} });
    expect(mail.text).toContain("RevenueCat niedostępny (REVENUECAT_HTTP_503)");
    expect(mail.text).toContain("Brak zdarzeń subskrypcji w ostatnich 7 dniach");
  });

  it("digest idzie na tę samą zamkniętą listę co alerty", () => {
    expect(SUBSCRIPTION_ALERT_RECIPIENTS).toEqual(["kontakt@gjasionowicz.pl"]);
  });
});

