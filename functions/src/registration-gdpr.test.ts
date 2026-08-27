import { describe, expect, it } from "vitest";
import { gdprStoragePrefixesForUser } from "./registration";

describe("GDPR Storage coverage", () => {
  it("purges bug report screenshots together with avatars and body photos", () => {
    expect(gdprStoragePrefixesForUser("user-1")).toEqual([
      "avatars/user-1/",
      "body-photos/user-1/",
      "bug-reports/user-1/",
    ]);
  });
});
