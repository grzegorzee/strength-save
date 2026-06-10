import { describe, expect, it } from "vitest";

import { parseMaxHR } from "./max-hr";

describe("parseMaxHR", () => {
  it("accepts integers within 100-230", () => {
    expect(parseMaxHR(100)).toBe(100);
    expect(parseMaxHR(185)).toBe(185);
    expect(parseMaxHR(230)).toBe(230);
  });

  it("rejects out-of-range values", () => {
    expect(parseMaxHR(99)).toBeNull();
    expect(parseMaxHR(231)).toBeNull();
    expect(parseMaxHR(0)).toBeNull();
    expect(parseMaxHR(-180)).toBeNull();
  });

  it("rejects non-integers and non-numbers", () => {
    expect(parseMaxHR(180.5)).toBeNull();
    expect(parseMaxHR("180")).toBeNull();
    expect(parseMaxHR(NaN)).toBeNull();
    expect(parseMaxHR(Infinity)).toBeNull();
    expect(parseMaxHR(null)).toBeNull();
    expect(parseMaxHR(undefined)).toBeNull();
    expect(parseMaxHR({})).toBeNull();
  });
});
