import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as admin from "firebase-admin";

// Łańcuch serwerowy płatności na emulatorze Firestore (2026-09-30, przed premierą):
// prawdziwy handler revenuecatWebhook + prawdziwy readRevenueCatSubscription
// (parsowanie API v2) + prawdziwe transakcje Firestore. Podmieniona jest wyłącznie
// warstwa HTTP RevenueCat (globalny fetch) na deterministyczny fake z kształtami
// odpowiedzi API v2, bo emulator nie ma dostępu do produkcyjnego RC.
// Uruchomienie: npm run test:functions:emulator (firebase emulators:exec).

vi.mock("firebase-functions/v2/https", () => ({ onRequest: (_options: unknown, handler: unknown) => handler }));
vi.mock("firebase-functions/params", () => ({
  defineSecret: (name: string) => ({ value: () => (name === "REVENUECAT_WEBHOOK_AUTH" ? "emulator-webhook-auth" : "sk_emulator_fake") }),
}));

import { revenuecatWebhook } from "./revenuecat";

const hasEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const describeWithEmulator = hasEmulator ? describe : describe.skip;
const projectId = process.env.GCLOUD_PROJECT || "strength-save-m1-test";

// ---------------------------------------------------------------- fake RevenueCat API v2

const PRO_ID = "entl_pro_fake";
const PRODUCTS: Record<string, string> = {
  prod_ios_monthly: "strengthsave_pro_monthly",
  prod_ios_yearly: "strengthsave_pro_yearly",
  prod_play_monthly: "strengthsave_pro_monthly:monthly",
  prod_play_yearly: "strengthsave_pro_yearly:yearly",
};
type Env = "production" | "sandbox";
interface FakeSub {
  product_id: keyof typeof PRODUCTS;
  status: "trialing" | "active" | "in_grace_period" | "expired";
  auto_renewal_status: "will_renew" | "will_not_renew" | "will_change_product";
  store: "app_store" | "play_store";
  environment: Env;
  starts: number;
  ends: number;
}
const rc = {
  customers: new Map<string, FakeSub[]>(),
  requests: 0,
  failNext: 0,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
  rc.requests += 1;
  if (rc.failNext > 0) { rc.failNext -= 1; return json({ message: "unavailable" }, 503); }
  const url = new URL(String(input));
  const path = url.pathname.replace("/v2/projects/proj67cb081f", "");
  if (path === "/entitlements") return json({ items: [{ id: PRO_ID, lookup_key: "pro" }], next_page: null });
  const product = path.match(/^\/products\/([^/]+)$/);
  if (product) return json({ id: product[1], store_identifier: PRODUCTS[product[1]] });
  const customer = path.match(/^\/customers\/([^/]+)\/(active_entitlements|subscriptions)$/);
  if (!customer) return json({ message: "not found" }, 404);
  const subs = rc.customers.get(decodeURIComponent(customer[1])) ?? [];
  const now = Date.now();
  const live = subs.filter(sub => sub.status !== "expired" && sub.ends > now);
  if (customer[2] === "active_entitlements") {
    const latest = Math.max(...live.map(sub => sub.ends));
    return json({ items: live.length ? [{ entitlement_id: PRO_ID, expires_at: latest }] : [], next_page: null });
  }
  const env = url.searchParams.get("environment");
  return json({
    items: subs.filter(sub => sub.environment === env).map(sub => ({
      product_id: sub.product_id,
      status: sub.status,
      gives_access: sub.status !== "expired" && sub.ends > now,
      auto_renewal_status: sub.auto_renewal_status,
      store: sub.store,
      current_period_starts_at: sub.starts,
      current_period_ends_at: sub.ends,
      entitlements: { items: [{ id: PRO_ID }], next_page: null },
    })),
    next_page: null,
  });
};

// ---------------------------------------------------------------- webhook delivery

let eventSeq = 0;
async function deliver(event: Record<string, unknown>, authorization = "emulator-webhook-auth") {
  eventSeq += 1;
  const response = { statusCode: 0, body: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(b: unknown) { this.body = b; }, send(b: unknown) { this.body = b; } };
  await (revenuecatWebhook as unknown as (req: unknown, res: unknown) => Promise<void>)({
    method: "POST", headers: { authorization }, body: { api_version: "1.0", event: { id: `evt-${eventSeq}`, event_timestamp_ms: Date.now() + eventSeq, ...event } },
  }, response);
  return response;
}

const userDoc = (uid: string) => admin.firestore().collection("users").doc(uid);
const readUser = async (uid: string) => (await userDoc(uid).get()).data() ?? null;
const HOUR = 3_600_000;

describeWithEmulator("RevenueCat webhook → users/{uid}.subscription (emulator Firestore)", () => {
  beforeAll(() => {
    if (admin.apps.length === 0) admin.initializeApp({ projectId });
    vi.stubGlobal("fetch", fakeFetch);
  });
  afterAll(() => { vi.unstubAllGlobals(); });
  beforeEach(() => { rc.customers.clear(); rc.failNext = 0; });

  const matrix = [
    { store: "APP_STORE", rcStore: "app_store", env: "SANDBOX", monthly: "prod_ios_monthly", yearly: "prod_ios_yearly" },
    { store: "APP_STORE", rcStore: "app_store", env: "PRODUCTION", monthly: "prod_ios_monthly", yearly: "prod_ios_yearly" },
    { store: "PLAY_STORE", rcStore: "play_store", env: "SANDBOX", monthly: "prod_play_monthly", yearly: "prod_play_yearly" },
    { store: "PLAY_STORE", rcStore: "play_store", env: "PRODUCTION", monthly: "prod_play_monthly", yearly: "prod_play_yearly" },
  ] as const;

  it.each(matrix)("pełny cykl życia $store/$env: zakup → odnowienie → anulowanie → cofnięcie → problem z płatnością → zmiana planu → wygaśnięcie", async (c) => {
    const uid = `rc-chain-${c.store}-${c.env}-${Date.now()}`.toLowerCase();
    await userDoc(uid).set({ uid, status: "active", role: "user", access: { enabled: true } });
    const environment = c.env.toLowerCase() as Env;
    const set = (sub: Partial<FakeSub>) => {
      const base: FakeSub = { product_id: c.monthly, status: "active", auto_renewal_status: "will_renew", store: c.rcStore, environment, starts: Date.now(), ends: Date.now() + HOUR };
      rc.customers.set(uid, [{ ...base, ...sub }]);
    };
    const ev = (type: string, extra: Record<string, unknown> = {}) => deliver({ type, app_user_id: uid, store: c.store, environment: c.env, product_id: PRODUCTS[c.monthly], ...extra });
    const steps: Array<[string, Partial<FakeSub>, Record<string, unknown>]> = [
      ["INITIAL_PURCHASE", { status: "trialing" }, { tier: "trial", status: "active", willRenew: true }],
      ["RENEWAL", { ends: Date.now() + 2 * HOUR }, { tier: "monthly", status: "active", willRenew: true }],
      ["CANCELLATION", { auto_renewal_status: "will_not_renew", ends: Date.now() + 2 * HOUR }, { tier: "monthly", status: "active", willRenew: false }],
      ["UNCANCELLATION", { ends: Date.now() + 2 * HOUR }, { tier: "monthly", status: "active", willRenew: true }],
      ["BILLING_ISSUE", { status: "in_grace_period", ends: Date.now() + 3 * HOUR }, { tier: "monthly", status: "billing_issue", willRenew: true }],
      ["PRODUCT_CHANGE", { product_id: c.yearly, ends: Date.now() + 4 * HOUR }, { tier: "yearly", status: "active", willRenew: true }],
      ["EXPIRATION", { status: "expired", ends: Date.now() - 1000 }, { tier: "none", status: "expired", willRenew: false, expiresAt: null }],
    ];
    for (const [type, state, expected] of steps) {
      set(state);
      const res = await ev(type);
      expect(res.statusCode, type).toBe(200);
      const sub = (await readUser(uid))?.subscription;
      expect(sub, type).toMatchObject(expected);
      if (expected.status !== "expired") {
        expect(sub, type).toMatchObject({ store: c.store, environment: c.env });
        expect(Date.parse(sub.expiresAt), type).toBeGreaterThan(Date.now());
      }
    }
  });

  it("zdublowane dostarczenie tego samego eventu nie zmienia dokumentu (idempotencja)", async () => {
    const uid = `rc-dup-${Date.now()}`;
    await userDoc(uid).set({ uid, status: "active" });
    rc.customers.set(uid, [{ product_id: "prod_ios_monthly", status: "active", auto_renewal_status: "will_renew", store: "app_store", environment: "sandbox", starts: Date.now(), ends: Date.now() + HOUR }]);
    const event = { id: "same-event-id", type: "RENEWAL", app_user_id: uid, event_timestamp_ms: Date.now() };
    expect((await deliver(event)).statusCode).toBe(200);
    const first = await userDoc(uid).get();
    const second = await deliver(event);
    expect(second.statusCode).toBe(200);
    expect(second.body).toMatchObject({ skipped: "stale-or-duplicate" });
    expect((await userDoc(uid).get()).updateTime?.isEqual(first.updateTime!)).toBe(true);
  });

  it("stary event dostarczony po nowszym nie wskrzesza dostępu", async () => {
    const uid = `rc-order-${Date.now()}`;
    await userDoc(uid).set({ uid, status: "active" });
    rc.customers.set(uid, [{ product_id: "prod_ios_monthly", status: "expired", auto_renewal_status: "will_not_renew", store: "app_store", environment: "sandbox", starts: Date.now() - 2 * HOUR, ends: Date.now() - 1000 }]);
    await deliver({ type: "EXPIRATION", app_user_id: uid, event_timestamp_ms: Date.now() });
    rc.customers.set(uid, [{ product_id: "prod_ios_monthly", status: "active", auto_renewal_status: "will_renew", store: "app_store", environment: "sandbox", starts: Date.now(), ends: Date.now() + HOUR }]);
    const res = await deliver({ type: "RENEWAL", app_user_id: uid, event_timestamp_ms: Date.now() - 60_000 });
    expect(res.body).toMatchObject({ skipped: "stale-or-duplicate" });
    expect((await readUser(uid))?.subscription).toMatchObject({ tier: "none", status: "expired" });
  });

  it("zła lub brakująca autoryzacja: 401 i zero zapisu, zero zapytań do RC", async () => {
    const uid = `rc-auth-${Date.now()}`;
    await userDoc(uid).set({ uid, status: "active" });
    const before = await userDoc(uid).get();
    const requests = rc.requests;
    for (const auth of ["wrong-secret", "", "Bearer emulator-webhook-auth"]) {
      const res = await deliver({ type: "INITIAL_PURCHASE", app_user_id: uid }, auth);
      expect(res.statusCode).toBe(401);
    }
    expect(rc.requests).toBe(requests);
    const after = await userDoc(uid).get();
    expect(after.updateTime?.isEqual(before.updateTime!)).toBe(true);
    expect(after.data()?.subscription).toBeUndefined();
  });

  it("aktywny grant comp admina nie jest nadpisywany; stan sklepu trafia do storeSubscription (bug 7 X30)", async () => {
    const uid = `rc-comp-${Date.now()}`;
    const comp = { tier: "comp", status: "active", expiresAt: null, grantedBy: "admin" };
    await userDoc(uid).set({ uid, status: "active", subscription: comp });
    rc.customers.set(uid, [{ product_id: "prod_ios_yearly", status: "active", auto_renewal_status: "will_renew", store: "app_store", environment: "sandbox", starts: Date.now(), ends: Date.now() + HOUR }]);
    for (const type of ["INITIAL_PURCHASE", "RENEWAL", "CANCELLATION"]) {
      expect((await deliver({ type, app_user_id: uid })).statusCode).toBe(200);
    }
    rc.customers.set(uid, [{ product_id: "prod_ios_yearly", status: "expired", auto_renewal_status: "will_not_renew", store: "app_store", environment: "sandbox", starts: Date.now() - HOUR, ends: Date.now() - 1000 }]);
    expect((await deliver({ type: "EXPIRATION", app_user_id: uid })).statusCode).toBe(200);
    const data = await readUser(uid);
    expect(data?.subscription).toEqual(comp);
    expect(data?.storeSubscription).toMatchObject({ tier: "none", status: "expired" });
  });

  it("po wygaśnięciu grantu comp webhook przywraca stan sklepowy w subscription i czyści storeSubscription", async () => {
    const uid = `rc-comp-expired-${Date.now()}`;
    await userDoc(uid).set({ uid, status: "active", subscription: { tier: "comp", status: "active", expiresAt: new Date(Date.now() - 1000).toISOString() }, storeSubscription: { tier: "monthly", status: "active" } });
    rc.customers.set(uid, [{ product_id: "prod_play_monthly", status: "active", auto_renewal_status: "will_renew", store: "play_store", environment: "production", starts: Date.now(), ends: Date.now() + HOUR }]);
    expect((await deliver({ type: "RENEWAL", app_user_id: uid, store: "PLAY_STORE" })).statusCode).toBe(200);
    const data = await readUser(uid);
    expect(data?.subscription).toMatchObject({ tier: "monthly", status: "active", store: "PLAY_STORE", environment: "PRODUCTION" });
    expect(data?.storeSubscription).toBeUndefined();
  });

  it("wygaśnięcie zakupu na jednej platformie nie zabiera PRO opłaconego w drugim sklepie", async () => {
    const uid = `rc-cross-${Date.now()}`;
    await userDoc(uid).set({ uid, status: "active" });
    rc.customers.set(uid, [
      { product_id: "prod_ios_yearly", status: "active", auto_renewal_status: "will_renew", store: "app_store", environment: "production", starts: Date.now(), ends: Date.now() + 5 * HOUR },
      { product_id: "prod_play_monthly", status: "expired", auto_renewal_status: "will_not_renew", store: "play_store", environment: "production", starts: Date.now() - HOUR, ends: Date.now() - 1000 },
    ]);
    expect((await deliver({ type: "EXPIRATION", app_user_id: uid, store: "PLAY_STORE" })).statusCode).toBe(200);
    expect((await readUser(uid))?.subscription).toMatchObject({ tier: "yearly", status: "active", store: "APP_STORE" });
  });

  it("TRANSFER przenosi dostęp: stary właściciel traci PRO, nowy dostaje", async () => {
    const from = `rc-transfer-a-${Date.now()}`;
    const to = `rc-transfer-b-${Date.now()}`;
    await userDoc(from).set({ uid: from, status: "active", subscription: { tier: "monthly", status: "active", expiresAt: new Date(Date.now() + HOUR).toISOString(), eventTimestamp: 1 } });
    await userDoc(to).set({ uid: to, status: "active" });
    rc.customers.set(to, [{ product_id: "prod_ios_monthly", status: "active", auto_renewal_status: "will_renew", store: "app_store", environment: "sandbox", starts: Date.now(), ends: Date.now() + HOUR }]);
    const res = await deliver({ type: "TRANSFER", transferred_from: [from], transferred_to: [to] });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ reconciled: 2 });
    expect((await readUser(from))?.subscription).toMatchObject({ tier: "none", status: "expired" });
    expect((await readUser(to))?.subscription).toMatchObject({ tier: "monthly", status: "active" });
  });

  it("anonimowy app_user_id z aliasem uid trafia do właściwego konta", async () => {
    const uid = `rc-alias-${Date.now()}`;
    await userDoc(uid).set({ uid, status: "active" });
    rc.customers.set(uid, [{ product_id: "prod_ios_monthly", status: "trialing", auto_renewal_status: "will_renew", store: "app_store", environment: "sandbox", starts: Date.now(), ends: Date.now() + HOUR }]);
    await deliver({ type: "INITIAL_PURCHASE", app_user_id: "$RCAnonymousID:abc", aliases: ["$RCAnonymousID:abc", uid] });
    expect((await readUser(uid))?.subscription).toMatchObject({ tier: "trial", status: "active" });
  });

  it("zakup dla nieistniejącego users/{uid}: 503 (RC ponowi), dokument nie powstaje", async () => {
    const uid = `rc-missing-${Date.now()}`;
    rc.customers.set(uid, [{ product_id: "prod_ios_monthly", status: "trialing", auto_renewal_status: "will_renew", store: "app_store", environment: "sandbox", starts: Date.now(), ends: Date.now() + HOUR }]);
    const res = await deliver({ type: "INITIAL_PURCHASE", app_user_id: uid });
    expect(res.statusCode).toBe(503);
    expect((await userDoc(uid).get()).exists).toBe(false);
  });

  it("awaria API RevenueCat: 503 i ostatni zatwierdzony stan zostaje", async () => {
    const uid = `rc-outage-${Date.now()}`;
    const current = { tier: "monthly", status: "active", expiresAt: new Date(Date.now() + HOUR).toISOString(), eventTimestamp: 1 };
    await userDoc(uid).set({ uid, status: "active", subscription: current });
    rc.failNext = 1;
    const res = await deliver({ type: "EXPIRATION", app_user_id: uid });
    expect(res.statusCode).toBe(503);
    expect((await readUser(uid))?.subscription).toEqual(current);
  });
});
