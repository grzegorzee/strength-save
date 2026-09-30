import { describe, expect, it } from "vitest";
import { parseLiveUpdateChannel } from "./security";

describe("parseLiveUpdateChannel (kanał OTA przypisywany przez admina)", () => {
  it("przyjmuje wyłącznie internal i production", () => {
    expect(parseLiveUpdateChannel("internal")).toBe("internal");
    expect(parseLiveUpdateChannel("production")).toBe("production");
  });

  it("odrzuca wszystko inne (także wielkość liter, spacje, typy)", () => {
    for (const value of ["Internal", " internal", "beta", "", null, undefined, 1, true, {}]) {
      expect(parseLiveUpdateChannel(value)).toBeNull();
    }
  });
});
