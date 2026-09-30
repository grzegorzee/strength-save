import { describe, expect, it, vi } from "vitest";
import {
  COST_GUARD_DOC_ID,
  EMPTY_COST_GUARD_STATE,
  decideBudgetTransition,
  handleBudgetMessage,
  normalizeCostGuardState,
  parseBudgetNotification,
  setCostGuardByAdmin,
  withCostGuard,
  type BudgetNotification,
  type CostGuardState,
  type CostGuardStore,
} from "./cost-guard";

const PERIOD_SEPT = "2026-09-01T07:00:00Z";
const PERIOD_OCT = "2026-10-01T07:00:00Z";
const NOW = "2026-09-30T12:00:00.000Z";

// Kształt komunikatu budżetu Cloud Billing, schemaVersion 1.0.
const budgetMessage = (fields: Record<string, unknown>): string => Buffer.from(JSON.stringify({
  budgetDisplayName: "Firebase Project fittracker-workouts",
  costAmount: 10,
  costIntervalStart: PERIOD_SEPT,
  budgetAmount: 50,
  budgetAmountType: "SPECIFIED_AMOUNT",
  currencyCode: "PLN",
  ...fields,
})).toString("base64");

const notification = (costAmount: number, budgetPeriod = PERIOD_SEPT): BudgetNotification => ({
  costAmount,
  budgetAmount: 50,
  currencyCode: "PLN",
  budgetPeriod,
  budgetDisplayName: "b",
  alertThresholdExceeded: null,
  forecastThresholdExceeded: null,
});

const state = (patch: Partial<CostGuardState>): CostGuardState => ({ ...EMPTY_COST_GUARD_STATE, ...patch });

const memoryStore = (initial: CostGuardState | null = null) => {
  const box: { state: CostGuardState | null; writes: number; audits: Array<Record<string, unknown>> } = {
    state: initial,
    writes: 0,
    audits: [],
  };
  const store: CostGuardStore = {
    update: async (mutate) => {
      const { next, result, audit } = mutate(normalizeCostGuardState(box.state));
      if (next) {
        box.state = next;
        box.writes += 1;
      }
      if (audit) box.audits.push(audit);
      return result;
    },
  };
  return { box, store };
};

describe("parseBudgetNotification", () => {
  it("czyta koszt, budżet i okres z komunikatu", () => {
    expect(parseBudgetNotification(budgetMessage({ costAmount: 45.5, alertThresholdExceeded: 0.9 }))).toEqual({
      costAmount: 45.5,
      budgetAmount: 50,
      currencyCode: "PLN",
      budgetPeriod: PERIOD_SEPT,
      budgetDisplayName: "Firebase Project fittracker-workouts",
      alertThresholdExceeded: 0.9,
      forecastThresholdExceeded: null,
    });
  });

  it.each([
    ["brak danych", undefined],
    ["pusty string", ""],
    ["nie-JSON", Buffer.from("not json").toString("base64")],
    ["JSON bez kosztu", budgetMessage({ costAmount: undefined })],
    ["koszt jako string", budgetMessage({ costAmount: "12" })],
    ["ujemny koszt", budgetMessage({ costAmount: -1 })],
    ["budżet zero", budgetMessage({ budgetAmount: 0 })],
    ["brak okresu", budgetMessage({ costIntervalStart: undefined })],
    ["JSON null", Buffer.from("null").toString("base64")],
  ])("uszkodzony komunikat (%s) = null", (_label, data) => {
    expect(parseBudgetNotification(data)).toBeNull();
  });
});

describe("decideBudgetTransition", () => {
  it("poniżej progu: bez pauzy, tylko migawka kosztu", () => {
    const decision = decideBudgetTransition(EMPTY_COST_GUARD_STATE, notification(20), NOW);
    expect(decision.action).toBe("noop");
    expect(decision.claimAlertEmail).toBe(false);
    expect(decision.next).toMatchObject({ paused: false, costAmount: 20, ratio: 0.4, budgetPeriod: PERIOD_SEPT });
  });

  it("dokładnie 90% budżetu: pauza + rezerwacja maila dla okresu", () => {
    const decision = decideBudgetTransition(EMPTY_COST_GUARD_STATE, notification(45), NOW);
    expect(decision.action).toBe("pause");
    expect(decision.claimAlertEmail).toBe(true);
    expect(decision.next).toMatchObject({
      paused: true,
      reason: "budget-threshold",
      costAmount: 45,
      budgetAmount: 50,
      at: NOW,
      changedBy: "budget",
      alertEmailPeriod: PERIOD_SEPT,
    });
  });

  it("89,9%: jeszcze bez pauzy", () => {
    expect(decideBudgetTransition(EMPTY_COST_GUARD_STATE, notification(44.95), NOW).action).toBe("noop");
  });

  it("kolejny komunikat w tym samym okresie: bez drugiego maila (idempotencja)", () => {
    const paused = decideBudgetTransition(EMPTY_COST_GUARD_STATE, notification(45), NOW).next;
    const again = decideBudgetTransition(paused, notification(48), NOW);
    expect(again.action).toBe("noop");
    expect(again.claimAlertEmail).toBe(false);
    expect(again.next).toMatchObject({ paused: true, costAmount: 48 });
  });

  it("nowy okres budżetu z niskim kosztem: automatyczne wznowienie", () => {
    const paused = state({ paused: true, reason: "budget-threshold", budgetPeriod: PERIOD_SEPT, alertEmailPeriod: PERIOD_SEPT });
    const decision = decideBudgetTransition(paused, notification(0.4, PERIOD_OCT), NOW);
    expect(decision.action).toBe("resume");
    expect(decision.next).toMatchObject({ paused: false, reason: "new-budget-period", budgetPeriod: PERIOD_OCT });
  });

  it("nowy okres ponad progiem: pauza trwa i idzie nowy mail (jeden na okres)", () => {
    const paused = state({ paused: true, reason: "budget-threshold", budgetPeriod: PERIOD_SEPT, alertEmailPeriod: PERIOD_SEPT });
    const decision = decideBudgetTransition(paused, notification(46, PERIOD_OCT), NOW);
    expect(decision.next.paused).toBe(true);
    expect(decision.claimAlertEmail).toBe(true);
    expect(decision.next.alertEmailPeriod).toBe(PERIOD_OCT);
  });

  it("korekta kosztu pod próg w tym samym okresie: wznowienie", () => {
    const paused = state({ paused: true, reason: "budget-threshold", budgetPeriod: PERIOD_SEPT });
    expect(decideBudgetTransition(paused, notification(30), NOW).next).toMatchObject({ paused: false, reason: "below-threshold" });
  });

  it("ręczne wznowienie admina trzyma do końca okresu mimo kosztu ponad progiem", () => {
    const resumed = state({ paused: false, reason: "admin-resume", budgetPeriod: PERIOD_SEPT, manualResumePeriod: PERIOD_SEPT });
    const decision = decideBudgetTransition(resumed, notification(49), NOW);
    expect(decision.action).toBe("hold-manual-resume");
    expect(decision.next.paused).toBe(false);
    expect(decision.claimAlertEmail).toBe(false);
  });

  it("ręczne wznowienie nie przechodzi na następny okres", () => {
    const resumed = state({ paused: false, reason: "admin-resume", budgetPeriod: PERIOD_SEPT, manualResumePeriod: PERIOD_SEPT });
    expect(decideBudgetTransition(resumed, notification(46, PERIOD_OCT), NOW).action).toBe("pause");
  });

  it("ręczna pauza admina nie jest zdejmowana przez niski koszt ani nowy okres", () => {
    const manual = state({ paused: true, reason: "admin-pause", budgetPeriod: PERIOD_SEPT });
    expect(decideBudgetTransition(manual, notification(1, PERIOD_OCT), NOW).next).toMatchObject({ paused: true, reason: "admin-pause" });
  });

  it("próg konfigurowalny polem pauseAtRatio w dokumencie", () => {
    const custom = state({ pauseAtRatio: 0.5 });
    expect(decideBudgetTransition(custom, notification(25), NOW).action).toBe("pause");
    expect(normalizeCostGuardState({ pauseAtRatio: 7 }).pauseAtRatio).toBeNull();
  });
});

describe("handleBudgetMessage", () => {
  const deps = (store: CostGuardStore, sendAlertEmail = vi.fn(async () => undefined)) => ({
    store,
    sendAlertEmail,
    nowIso: () => NOW,
  });

  it("uszkodzona wiadomość: bez zapisu stanu i bez maila", async () => {
    const { box, store } = memoryStore();
    const send = vi.fn(async () => undefined);
    expect(await handleBudgetMessage(deps(store, send), "%%%")).toEqual({ action: "invalid", emailed: false });
    expect(box.writes).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("seria komunikatów ponad progiem = dokładnie jeden mail w okresie", async () => {
    const { box, store } = memoryStore();
    const send = vi.fn(async () => undefined);
    for (const cost of [45, 45, 47, 49, 51]) {
      await handleBudgetMessage(deps(store, send), budgetMessage({ costAmount: cost }));
    }
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toContain("90%");
    expect(box.state).toMatchObject({ paused: true, costAmount: 51, alertEmailPeriod: PERIOD_SEPT });
  });

  it("padnięty mail zwalnia rezerwację: następny komunikat ponawia wysyłkę", async () => {
    const { box, store } = memoryStore();
    const send = vi.fn()
      .mockRejectedValueOnce(new Error("ses down"))
      .mockResolvedValue(undefined);
    expect((await handleBudgetMessage(deps(store, send), budgetMessage({ costAmount: 46 }))).emailed).toBe(false);
    expect(box.state?.alertEmailPeriod).toBeNull();
    expect(box.state?.paused).toBe(true);
    expect((await handleBudgetMessage(deps(store, send), budgetMessage({ costAmount: 46 }))).emailed).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("pełny cykl: pauza we wrześniu, reset w październiku", async () => {
    const { box, store } = memoryStore();
    await handleBudgetMessage(deps(store), budgetMessage({ costAmount: 46 }));
    expect(box.state?.paused).toBe(true);
    const result = await handleBudgetMessage(deps(store), budgetMessage({ costAmount: 0.2, costIntervalStart: PERIOD_OCT }));
    expect(result.action).toBe("resume");
    expect(box.state).toMatchObject({ paused: false, reason: "new-budget-period", budgetPeriod: PERIOD_OCT });
  });
});

describe("withCostGuard", () => {
  it("paused: zadanie wychodzi przed pracą", async () => {
    const handler = vi.fn(async () => undefined);
    const guarded = withCostGuard("weeklyDigest", handler, async () => state({ paused: true, reason: "budget-threshold" }));
    await guarded({});
    expect(handler).not.toHaveBeenCalled();
    expect(guarded.costGuard).toBe("weeklyDigest");
  });

  it("brak pauzy (także brak dokumentu): zadanie rusza z tym samym eventem", async () => {
    const handler = vi.fn(async () => undefined);
    await withCostGuard("x", handler, async () => normalizeCostGuardState(null))({ scheduleTime: "t" });
    expect(handler).toHaveBeenCalledWith({ scheduleTime: "t" });
  });

  it("błąd odczytu flagi: fail-open, zadanie rusza", async () => {
    const handler = vi.fn(async () => undefined);
    await withCostGuard("x", handler, async () => { throw new Error("unavailable"); })({});
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("błąd samego zadania nie jest połykany (Cloud Scheduler widzi 500)", async () => {
    const guarded = withCostGuard("x", async () => { throw new Error("boom"); }, async () => normalizeCostGuardState(null));
    await expect(guarded({})).rejects.toThrow("boom");
  });
});

describe("setCostGuardByAdmin", () => {
  const adminDeps = (store: CostGuardStore, isAdmin = true) => ({
    isAdmin: vi.fn(async () => isAdmin),
    store,
    nowMs: () => Date.parse(NOW),
  });

  it("wymaga zalogowania i roli admina", async () => {
    const { box, store } = memoryStore();
    await expect(setCostGuardByAdmin(adminDeps(store), undefined, { paused: false })).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(setCostGuardByAdmin(adminDeps(store, false), "u1", { paused: false })).rejects.toMatchObject({ code: "permission-denied" });
    expect(box.writes).toBe(0);
  });

  it("odrzuca nie-boolean", async () => {
    const { store } = memoryStore();
    await expect(setCostGuardByAdmin(adminDeps(store), "a1", { paused: "no" })).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("wznowienie: stan + audyt w jednej operacji, trzyma do końca okresu", async () => {
    const { box, store } = memoryStore(state({ paused: true, reason: "budget-threshold", budgetPeriod: PERIOD_SEPT, ratio: 0.93 }));
    expect(await setCostGuardByAdmin(adminDeps(store), "a1", { paused: false })).toEqual({ success: true, paused: false });
    expect(box.state).toMatchObject({ paused: false, reason: "admin-resume", changedBy: "admin:a1", manualResumePeriod: PERIOD_SEPT });
    expect(box.audits).toHaveLength(1);
    expect(box.audits[0]).toMatchObject({
      adminUid: "a1",
      action: "costGuard:resume",
      targetUid: `config/${COST_GUARD_DOC_ID}`,
      createdAt: NOW,
    });
    // Kolejny komunikat ponad progiem nie cofa decyzji admina.
    const next = decideBudgetTransition(box.state as CostGuardState, notification(48), NOW);
    expect(next.next.paused).toBe(false);
  });

  it("ręczna pauza: reason admin-pause, audyt costGuard:pause", async () => {
    const { box, store } = memoryStore();
    await setCostGuardByAdmin(adminDeps(store), "a1", { paused: true });
    expect(box.state).toMatchObject({ paused: true, reason: "admin-pause", manualResumePeriod: null });
    expect(box.audits[0]).toMatchObject({ action: "costGuard:pause" });
  });
});
