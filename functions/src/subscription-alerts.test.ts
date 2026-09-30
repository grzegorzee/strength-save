import { describe, expect, it, vi } from "vitest";
import {
  SUBSCRIPTION_ALERT_RECIPIENTS,
  buildSubscriptionAlert,
  classifySubscriptionEvent,
  isPaidStart,
  resolveOwnerPushTarget,
  runSubscriptionAlert,
  type SubscriptionAlertDeps,
  type RcAlertEvent,
} from "./subscription-alerts";

// Powiadomienia admina o zakupach (2026-09-30, aplikacja publiczna w sklepach).
// Kształty payloadu z dokumentacji RevenueCat "Event Types and Fields":
// period_type TRIAL|INTRO|NORMAL|PROMOTIONAL|PREPAID, is_trial_conversion tylko
// na RENEWAL, cancel_reason CUSTOMER_SUPPORT = zwrot przez support sklepu.

const UID = "AbCdEf123456uidXYZ";
const base = (over: Partial<RcAlertEvent> = {}): RcAlertEvent => ({
  id: "evt-1",
  type: "INITIAL_PURCHASE",
  environment: "PRODUCTION",
  period_type: "NORMAL",
  product_id: "strengthsave_pro_yearly",
  store: "APP_STORE",
  country_code: "PL",
  currency: "PLN",
  price_in_purchased_currency: 119.99,
  price: 31.99,
  event_timestamp_ms: Date.parse("2026-09-30T12:05:00Z"),
  app_user_id: UID,
  ...over,
});

describe("classifySubscriptionEvent", () => {
  it.each([
    [{ type: "INITIAL_PURCHASE", period_type: "TRIAL" }, "trial_started"],
    [{ type: "INITIAL_PURCHASE", period_type: "NORMAL" }, "first_payment"],
    [{ type: "INITIAL_PURCHASE", period_type: "INTRO" }, "first_payment"],
    [{ type: "RENEWAL", is_trial_conversion: true, period_type: "NORMAL" }, "trial_converted"],
    [{ type: "RENEWAL", is_trial_conversion: false }, "renewal"],
    [{ type: "RENEWAL" }, "renewal"],
    [{ type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE" }, "cancellation"],
    [{ type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT" }, "refund"],
    [{ type: "BILLING_ISSUE" }, "billing_issue"],
    [{ type: "EXPIRATION" }, "expiration"],
    [{ type: "PRODUCT_CHANGE", new_product_id: "strengthsave_pro_monthly" }, "product_change"],
  ] as const)("%o -> %s", (over, kind) => {
    expect(classifySubscriptionEvent(base(over as Partial<RcAlertEvent>))).toBe(kind);
  });

  it("SANDBOX nigdy nie powiadamia (także brak environment)", () => {
    expect(classifySubscriptionEvent(base({ environment: "SANDBOX" }))).toBeNull();
    expect(classifySubscriptionEvent(base({ environment: undefined }))).toBeNull();
    expect(classifySubscriptionEvent(base({ environment: "SANDBOX", type: "RENEWAL", is_trial_conversion: true }))).toBeNull();
  });

  it("zdarzenia bez znaczenia dla admina są pomijane", () => {
    for (const type of ["TEST", "TRANSFER", "UNCANCELLATION", "SUBSCRIBER_ALIAS", "SUBSCRIPTION_EXTENDED", "NON_RENEWING_PURCHASE"]) {
      expect(classifySubscriptionEvent(base({ type }))).toBeNull();
    }
    // Promocja nadana w RC to nie zakup.
    expect(classifySubscriptionEvent(base({ period_type: "PROMOTIONAL" }))).toBeNull();
  });

  it("pierwsza płatność = zakup NORMAL/INTRO albo konwersja triala", () => {
    expect(isPaidStart("first_payment")).toBe(true);
    expect(isPaidStart("trial_converted")).toBe(true);
    for (const kind of ["trial_started", "renewal", "cancellation", "refund", "billing_issue", "expiration", "product_change"] as const) {
      expect(isPaidStart(kind)).toBe(false);
    }
  });
});

describe("buildSubscriptionAlert", () => {
  const customerEmail = "klient@example.com";
  const alert = (over: Partial<RcAlertEvent> = {}, extra: { isFirstPaid?: boolean; email?: string | null } = {}) => {
    const event = base(over);
    return buildSubscriptionAlert({
      event,
      kind: classifySubscriptionEvent(event)!,
      uid: UID,
      isFirstPaid: extra.isFirstPaid ?? false,
      customerEmail: extra.email === undefined ? customerEmail : extra.email,
    });
  };

  it("mail: typ, produkt, sklep, kraj, obie kwoty, data, e-mail klienta, skrót uid i link do karty w panelu", () => {
    const { subject, text, html } = alert();
    expect(subject).toBe("[Strength Save] Nowa subskrypcja: PRO roczny, 119,99 zł");
    expect(text).toContain("Zdarzenie: nowa subskrypcja (pierwsza płatność)");
    expect(text).toContain("Produkt: PRO roczny (strengthsave_pro_yearly)");
    expect(text).toContain("Sklep: App Store");
    expect(text).toContain("Kraj: PL");
    expect(text).toContain("Kwota: 119,99 zł (31,99 USD)");
    expect(text).toContain("Data: 30.09.2026, 14:05");
    expect(text).toContain("E-mail klienta: klient@example.com");
    expect(text).toContain("Użytkownik: AbCdEf…");
    expect(text).toContain(`https://app.strengthsave.app/#/admin/users/${UID}`);
    expect(html).toContain(`https://app.strengthsave.app/#/admin/users/${UID}`);
    expect(html).toContain("klient@example.com");
  });

  it("ukryty adres Apple i brak adresu są oznaczone", () => {
    expect(alert({}, { email: "x1y2@privaterelay.appleid.com" }).text)
      .toContain("E-mail klienta: x1y2@privaterelay.appleid.com (ukryty adres Apple)");
    expect(alert({}, { email: null }).text).toContain("E-mail klienta: brak adresu w profilu");
  });

  it("imię klienta i nazwa wyświetlana nie trafiają do maila ani pusha", () => {
    const event = { ...base(), subscriber_attributes: { $displayName: { value: "Jan Kowalski" } } } as RcAlertEvent;
    const out = buildSubscriptionAlert({ event, kind: "first_payment", uid: UID, isFirstPaid: false, customerEmail });
    const all = [out.subject, out.html, out.text, out.push.pl.title, out.push.pl.body, out.push.en.title, out.push.en.body].join("\n");
    expect(all).not.toContain("Jan Kowalski");
  });

  it("push: typ zdarzenia i kwota, NIGDY adres e-mail ani uid", () => {
    const out = alert();
    expect(out.push.pl.title).toBe("Nowa subskrypcja: PRO roczny, 119,99 zł");
    expect(out.push.pl.body).toBe("App Store, PL");
    expect(out.push.en.title).toBe("New subscription: PRO yearly, 119.99 PLN");
    for (const lang of ["pl", "en"] as const) {
      const text = `${out.push[lang].title} ${out.push[lang].body}`;
      expect(text).not.toContain("@");
      expect(text).not.toContain(UID);
      expect(text).not.toContain("klient");
    }
    expect(out.push.data).toEqual({ type: "subscription_alert", deepLink: `/admin/users/${UID}` });
  });

  it("pierwsza płatna subskrypcja w historii: wyróżniony temat i nagłówek", () => {
    const out = alert({}, { isFirstPaid: true });
    expect(out.subject).toBe("[Strength Save] PIERWSZA płatna subskrypcja: PRO roczny, 119,99 zł");
    expect(out.text).toContain("Pierwsza płatna subskrypcja w historii Strength Save");
    expect(out.push.pl.title).toBe("PIERWSZA płatna subskrypcja: PRO roczny, 119,99 zł");
  });

  it.each([
    [{ type: "INITIAL_PURCHASE", period_type: "TRIAL", price_in_purchased_currency: 0, price: 0 }, "[Strength Save] Nowy okres próbny: PRO roczny"],
    [{ type: "RENEWAL", is_trial_conversion: true }, "[Strength Save] Trial zamieniony na płatny: PRO roczny, 119,99 zł"],
    [{ type: "RENEWAL", product_id: "strengthsave_pro_monthly:monthly", store: "PLAY_STORE", price_in_purchased_currency: 19.99 }, "[Strength Save] Odnowienie: PRO miesięczny, 19,99 zł"],
    [{ type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE" }, "[Strength Save] Anulowanie: PRO roczny"],
    [{ type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE", period_type: "TRIAL" }, "[Strength Save] Anulowanie okresu próbnego: PRO roczny"],
    [{ type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", price_in_purchased_currency: -119.99 }, "[Strength Save] Zwrot pieniędzy: PRO roczny, -119,99 zł"],
    [{ type: "BILLING_ISSUE" }, "[Strength Save] Problem z płatnością: PRO roczny"],
    [{ type: "EXPIRATION" }, "[Strength Save] Subskrypcja wygasła: PRO roczny"],
    [{ type: "PRODUCT_CHANGE", product_id: "strengthsave_pro_monthly", new_product_id: "strengthsave_pro_yearly" }, "[Strength Save] Zmiana planu: PRO miesięczny na PRO roczny"],
  ] as const)("temat %o", (over, subject) => {
    expect(alert(over as Partial<RcAlertEvent>).subject).toBe(subject);
  });

  it("zwrot: powód z cancel_reason po polsku", () => {
    expect(alert({ type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT" }).text).toContain("Powód: zwrot przez sklep (CUSTOMER_SUPPORT)");
  });

  it("brak kwoty w payloadzie: bez kwoty w temacie, 'brak w zdarzeniu' w treści", () => {
    const out = alert({ price_in_purchased_currency: undefined, currency: undefined, price: undefined });
    expect(out.subject).toBe("[Strength Save] Nowa subskrypcja: PRO roczny");
    expect(out.text).toContain("Kwota: brak w zdarzeniu");
  });

  it("zakaz pauz i promocji webowej; bez stopki z danymi firmy", () => {
    for (const over of [{}, { type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT" }, { type: "PRODUCT_CHANGE", new_product_id: "x_monthly" }]) {
      const out = alert(over as Partial<RcAlertEvent>);
      const all = [out.subject, out.html, out.text].join("\n");
      expect(all).not.toMatch(/[–—]/);
      expect(all).not.toContain("WEB3 POWER");
      expect(all).not.toContain("strengthsave.app/support");
    }
  });

  it("wartości z payloadu są escapowane w HTML", () => {
    const out = alert({ country_code: "<b>X</b>" }, { email: "a<script>@x.pl" });
    expect(out.html).not.toContain("<script>");
    expect(out.html).not.toContain("<b>X</b>");
  });
});

describe("runSubscriptionAlert", () => {
  const makeDeps = (over: Partial<SubscriptionAlertDeps> = {}) => {
    const claimed = new Set<string>();
    let paidCount = 0;
    const deps: SubscriptionAlertDeps = {
      claim: vi.fn(async ({ eventId, paid }) => {
        if (claimed.has(eventId)) return { claimed: false, isFirstPaid: false };
        claimed.add(eventId);
        const isFirstPaid = paid && paidCount === 0;
        if (paid) paidCount += 1;
        return { claimed: true, isFirstPaid };
      }),
      readCustomerEmail: vi.fn(async () => "klient@example.com"),
      sendEmail: vi.fn(async () => undefined),
      resolvePushTarget: vi.fn(async () => ({ uid: "owner-uid", language: "pl", registrations: [{ id: "r1", token: "tok-1" }] })),
      sendMulticast: vi.fn(async (tokens: string[]) => ({ successCount: tokens.length, failureCount: 0, responses: tokens.map(() => ({ success: true })) })),
      deleteRegistrations: vi.fn(async () => undefined),
      ...over,
    };
    return deps;
  };

  it("SANDBOX: zero odczytów, zero zapisów, zero wysyłek", async () => {
    const deps = makeDeps();
    expect(await runSubscriptionAlert(deps, base({ environment: "SANDBOX" }), UID)).toEqual({ status: "skipped", reason: "not-notifiable" });
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.sendMulticast).not.toHaveBeenCalled();
  });

  it("ten sam event dwa razy = jedno powiadomienie (idempotencja per event id)", async () => {
    const deps = makeDeps();
    await runSubscriptionAlert(deps, base(), UID);
    const second = await runSubscriptionAlert(deps, base(), UID);
    expect(second).toEqual({ status: "skipped", reason: "already-notified" });
    expect(deps.sendEmail).toHaveBeenCalledTimes(SUBSCRIPTION_ALERT_RECIPIENTS.length);
    expect(deps.sendMulticast).toHaveBeenCalledTimes(1);
  });

  it("event bez id nie jest wysyłany (brak klucza idempotencji)", async () => {
    const deps = makeDeps();
    expect(await runSubscriptionAlert(deps, base({ id: undefined }), UID)).toEqual({ status: "skipped", reason: "no-event-id" });
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it("odbiorcy maila to zamknięta lista (decyzja właściciela: tylko kontakt@gjasionowicz.pl); adres klienta nigdy nie trafia do To/CC/BCC", async () => {
    expect(SUBSCRIPTION_ALERT_RECIPIENTS).toEqual(["kontakt@gjasionowicz.pl"]);
    expect(Object.isFrozen(SUBSCRIPTION_ALERT_RECIPIENTS)).toBe(true);
    const deps = makeDeps();
    await runSubscriptionAlert(deps, base(), UID);
    const recipients = (deps.sendEmail as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0].to);
    expect(recipients).toEqual(SUBSCRIPTION_ALERT_RECIPIENTS);
    for (const call of (deps.sendEmail as ReturnType<typeof vi.fn>).mock.calls) {
      expect(Object.keys(call[0]).sort()).toEqual(["html", "subject", "text", "to"]);
    }
  });

  it("push idzie na tokeny właściciela, bez adresu e-mail klienta; martwe tokeny są usuwane", async () => {
    const deps = makeDeps({
      resolvePushTarget: vi.fn(async () => ({ uid: "owner-uid", language: "pl", registrations: [{ id: "r1", token: "tok-1" }, { id: "r2", token: "tok-dead" }] })),
      sendMulticast: vi.fn(async (tokens: string[]) => ({
        successCount: tokens.filter((t) => t !== "tok-dead").length,
        failureCount: tokens.filter((t) => t === "tok-dead").length,
        responses: tokens.map((t) => (t === "tok-dead" ? { success: false, error: { code: "messaging/registration-token-not-registered" } } : { success: true })),
      })),
    });
    const result = await runSubscriptionAlert(deps, base(), UID);
    expect(result).toMatchObject({ status: "sent", emails: 1, pushSent: 1, pushFailed: 1 });
    const calls = (deps.sendMulticast as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.map((c) => c[0])).toEqual([["tok-1", "tok-dead"]]);
    // Pierwsza płatność w świeżych zależnościach = wyróżniony tytuł.
    expect(calls[0][1]).toBe("PIERWSZA płatna subskrypcja: PRO roczny, 119,99 zł");
    expect(calls[0][2]).toBe("App Store, PL");
    for (const call of calls) expect(JSON.stringify(call)).not.toContain("klient@example.com");
    expect(deps.deleteRegistrations).toHaveBeenCalledWith(["r2"]);
  });

  it("brak skonfigurowanego odbiorcy pusha: sam mail, bez wyjątku", async () => {
    const deps = makeDeps({ resolvePushTarget: vi.fn(async () => null) });
    expect(await runSubscriptionAlert(deps, base(), UID)).toMatchObject({ status: "sent", emails: 1, pushSent: 0, push: "no-target" });
    expect(deps.sendMulticast).not.toHaveBeenCalled();
  });

  it("błąd SES nie blokuje pusha; funkcja nie rzuca", async () => {
    const sendEmail = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("throttled"), { name: "TooManyRequestsException" }));
    const deps = makeDeps({ sendEmail });
    const result = await runSubscriptionAlert(deps, base(), UID);
    expect(result).toMatchObject({ status: "sent", emails: 0, emailErrors: ["TooManyRequestsException"], pushSent: 1 });
  });

  it("błąd FCM i błąd odczytu adresu nie rzucają", async () => {
    const deps = makeDeps({
      sendMulticast: vi.fn(async () => { throw new Error("fcm down"); }),
      readCustomerEmail: vi.fn(async () => { throw new Error("firestore down"); }),
    });
    const result = await runSubscriptionAlert(deps, base(), UID);
    expect(result).toMatchObject({ status: "sent", emails: 1, pushSent: 0 });
    const text = (deps.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0].text as string;
    expect(text).toContain("E-mail klienta: brak adresu w profilu");
  });

  it("pierwsza płatna w historii: wyróżniony mail tylko raz, kolejne płatności zwykłe", async () => {
    const deps = makeDeps();
    await runSubscriptionAlert(deps, base({ id: "a", type: "INITIAL_PURCHASE", period_type: "TRIAL" }), UID);
    await runSubscriptionAlert(deps, base({ id: "b" }), UID);
    await runSubscriptionAlert(deps, base({ id: "c", type: "RENEWAL", is_trial_conversion: true }), UID);
    const subjects = (deps.sendEmail as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0].subject as string);
    expect(subjects.filter((s) => s.includes("PIERWSZA"))).toHaveLength(SUBSCRIPTION_ALERT_RECIPIENTS.length);
    expect(subjects[SUBSCRIPTION_ALERT_RECIPIENTS.length]).toContain("PIERWSZA płatna subskrypcja");
    expect(deps.claim).toHaveBeenCalledWith({ eventId: "a", paid: false, kind: "trial_started", uid: UID });
    expect(deps.claim).toHaveBeenCalledWith({ eventId: "c", paid: true, kind: "trial_converted", uid: UID });
  });

  it("błąd zajęcia znacznika (Firestore) = brak wysyłki, bez wyjątku", async () => {
    const deps = makeDeps({ claim: vi.fn(async () => { throw new Error("aborted"); }) });
    expect(await runSubscriptionAlert(deps, base(), UID)).toEqual({ status: "failed", reason: "claim-failed" });
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });
});

describe("resolveOwnerPushTarget", () => {
  const users: Record<string, Record<string, unknown>> = {
    "owner-uid": { role: "admin", language: "pl" },
    "other-admin": { role: "admin", language: "en" },
    "customer": { role: "user" },
  };
  const registrations: Record<string, Array<{ id: string; token: string }>> = {
    "owner-uid": [{ id: "o1", token: "owner-token" }],
    "other-admin": [{ id: "a1", token: "admin-token" }],
    "customer": [{ id: "c1", token: "customer-token" }],
  };
  const emails: Record<string, string> = { "owner@example.com": "owner-uid", "admin2@example.com": "other-admin", "buyer@example.com": "customer" };
  const deps = (ownerEmail: string) => ({
    ownerEmail,
    getUidByEmail: vi.fn(async (email: string) => emails[email] ?? null),
    getUser: vi.fn(async (uid: string) => users[uid] ?? null),
    listRegistrations: vi.fn(async (uid: string) => registrations[uid] ?? []),
  });

  it("push trafia tylko do tokenów skonfigurowanego konta właściciela", async () => {
    const d = deps("owner@example.com");
    expect(await resolveOwnerPushTarget(d)).toEqual({ uid: "owner-uid", language: "pl", registrations: [{ id: "o1", token: "owner-token" }] });
    expect(d.listRegistrations).toHaveBeenCalledTimes(1);
    expect(d.listRegistrations).toHaveBeenCalledWith("owner-uid");
  });

  it("brak konfiguracji albo nieznany adres = brak pusha", async () => {
    expect(await resolveOwnerPushTarget(deps(""))).toBeNull();
    expect(await resolveOwnerPushTarget(deps("   "))).toBeNull();
    expect(await resolveOwnerPushTarget(deps("nobody@example.com"))).toBeNull();
  });

  it("konto bez roli admin nie dostaje pusha nawet przy błędnej konfiguracji", async () => {
    expect(await resolveOwnerPushTarget(deps("buyer@example.com"))).toBeNull();
  });

  it("wyłączony przełącznik subscriptionAlerts = brak pusha", async () => {
    users["owner-uid"] = { role: "admin", notificationPrefs: { subscriptionAlerts: false } };
    expect(await resolveOwnerPushTarget(deps("owner@example.com"))).toBeNull();
    users["owner-uid"] = { role: "admin", language: "pl" };
  });
});
