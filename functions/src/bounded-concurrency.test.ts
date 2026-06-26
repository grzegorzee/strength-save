import { describe, expect, it } from "vitest";
import { forEachWithConcurrency } from "./bounded-concurrency";

describe("forEachWithConcurrency", () => {
  it("processes a 1k-user batch exactly once with a strict concurrency cap", async () => {
    let active = 0;
    let peak = 0;
    const processed: number[] = [];
    await forEachWithConcurrency(Array.from({ length: 1000 }, (_, index) => index), 10, async (user) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      processed.push(user);
      active -= 1;
    });
    expect(peak).toBeLessThanOrEqual(10);
    expect(new Set(processed).size).toBe(1000);
  });
});
