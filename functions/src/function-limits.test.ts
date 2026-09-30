import { describe, expect, it } from "vitest";
import * as exported from "./index";
import {
  DEFAULT_MAX_INSTANCES,
  MAX_INSTANCES_CEILING,
  MAX_INSTANCES_OVERRIDES,
} from "./function-limits";

// Cost guard (docs/COST-GUARDS.md, sekcja 1): KAŻDA wdrażana funkcja ma sufit
// instancji w manifeście, który czyta firebase deploy (__endpoint).
// Nieustawiona opcja to obiekt RESET_VALUE (runtime/manifest.js:43) = "domyślna platformy".
type Endpoint = { maxInstances?: unknown; concurrency?: unknown };

const deployedFunctions = Object.entries(exported as Record<string, unknown>)
  .map(([name, value]) => [name, (value as { __endpoint?: Endpoint } | null)?.__endpoint] as const)
  .filter((entry): entry is readonly [string, Endpoint] => entry[1] !== undefined);

describe("kontrakt limitów instancji", () => {
  it("indeks eksportuje realną listę funkcji (sanity: test nie przechodzi na pustym zbiorze)", () => {
    expect(deployedFunctions.length).toBeGreaterThan(60);
  });

  it("każda eksportowana funkcja ma maxInstances w manifeście deployu", () => {
    const missing = deployedFunctions
      .filter(([, endpoint]) => typeof endpoint.maxInstances !== "number" || endpoint.maxInstances < 1)
      .map(([name]) => name);
    expect(missing).toEqual([]);
  });

  it("limity mieszczą się pod sufitem i są domyślne poza jawnymi wyjątkami", () => {
    for (const [name, endpoint] of deployedFunctions) {
      const expected = (MAX_INSTANCES_OVERRIDES as Record<string, number>)[name] ?? DEFAULT_MAX_INSTANCES;
      expect({ name, maxInstances: endpoint.maxInstances }).toEqual({ name, maxInstances: expected });
      expect(endpoint.maxInstances as number).toBeLessThanOrEqual(MAX_INSTANCES_CEILING);
    }
  });

  it("każdy wyjątek wskazuje na istniejącą funkcję (brak martwych wpisów)", () => {
    const names = new Set(deployedFunctions.map(([name]) => name));
    expect(Object.keys(MAX_INSTANCES_OVERRIDES).filter((name) => !names.has(name))).toEqual([]);
  });

  it("concurrency zostaje domyślna (limit nie zmienia zachowania pojedynczej instancji)", () => {
    const custom = deployedFunctions.filter(([, endpoint]) => typeof endpoint.concurrency === "number").map(([name]) => name);
    expect(custom).toEqual([]);
  });
});
