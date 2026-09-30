import { describe, expect, it } from "vitest";
import * as exported from "./index";
import { COST_GUARD_EXEMPT, COST_GUARD_TOPIC } from "./cost-guard";

// Kontrakt bezpiecznika (docs/COST-GUARDS.md, sekcja 3): każde onSchedule
// sprawdza config/cost_guard (withCostGuard) ALBO jest na jawnej liście wyjątków
// z uzasadnieniem. Nowe zadanie cykliczne bez decyzji = czerwony test.
type Deployed = {
  __endpoint?: { scheduleTrigger?: unknown; eventTrigger?: { eventFilters?: Record<string, string>; retry?: unknown } };
  run?: { costGuard?: string };
};

const entries = Object.entries(exported as Record<string, Deployed>);
const scheduled = entries.filter(([, fn]) => fn?.__endpoint?.scheduleTrigger !== undefined);

describe("kontrakt bezpiecznika kosztów", () => {
  it("indeks ma realne zadania cykliczne (sanity)", () => {
    expect(scheduled.length).toBeGreaterThanOrEqual(13);
  });

  it("każde onSchedule jest owinięte withCostGuard albo jest jawnym wyjątkiem", () => {
    const undecided = scheduled
      .filter(([name, fn]) => fn.run?.costGuard !== name && !(name in COST_GUARD_EXEMPT))
      .map(([name]) => name);
    expect(undecided).toEqual([]);
  });

  it("wyjątki nie są owinięte (lista mówi prawdę) i wskazują istniejące zadania", () => {
    const names = new Set(scheduled.map(([name]) => name));
    for (const name of Object.keys(COST_GUARD_EXEMPT)) {
      expect({ name, exists: names.has(name) }).toEqual({ name, exists: true });
      const fn = scheduled.find(([n]) => n === name)?.[1];
      expect({ name, guarded: fn?.run?.costGuard !== undefined }).toEqual({ name, guarded: false });
    }
  });

  it("krytyczne prawnie zadania są wyjątkami", () => {
    expect(Object.keys(COST_GUARD_EXEMPT)).toEqual(expect.arrayContaining([
      "resumeDeletionOperations",
      "cleanupExpiredSesEvents",
      "cleanupStaleBugReports",
    ]));
  });

  it("listener budżetu słucha dedykowanego topicu bez retry", () => {
    const listener = (exported as Record<string, Deployed>).costGuardBudgetListener;
    const trigger = listener?.__endpoint?.eventTrigger;
    expect(trigger?.eventFilters?.topic).toBe(COST_GUARD_TOPIC);
    expect(trigger?.retry).toBe(false);
  });

  it("przełącznik admina jest wdrażany", () => {
    expect((exported as Record<string, Deployed>).adminSetCostGuard?.__endpoint).toBeDefined();
  });
});

describe("cost guard alert recipients", () => {
  it("alerts go to the product inbox and the owner's Gmail (decision 2026-09-30)", async () => {
    const { COST_GUARD_ALERT_RECIPIENTS } = await import("./cost-guard");
    expect(COST_GUARD_ALERT_RECIPIENTS).toEqual(["contact@strengthsave.app", "g.jasionowicz@gmail.com"]);
  });
});
