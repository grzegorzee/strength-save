import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// CommonJS require exposes these legacy namespace properties, but the real
// Node ESM namespace and Functions emulator loader do not. Evaluate the actual
// production imports/references against the installed SDK, without SDK mocks,
// initialization, credentials or network operations.
describe("Firebase Admin static values survive the ESM/runtime boundary", () => {
  it.each([
    "workout-aggregate.ts", "bug-reports.ts", "repairs/admin-user-repair.ts",
    "registration.ts", "index.ts", "error-digest.ts", "cost-digest.ts",
    "revenuecat.ts", "consents.ts",
  ])("%s uses callable SDK statics", (filename) => {
    const source = readFileSync(new URL(`./${filename}`, import.meta.url), "utf8");
    const imports = source.match(/^import .* from ["']firebase-admin(?:\/firestore)?["'];$/gm) ?? [];
    const references = [...new Set(source.match(/\b(?:admin\.firestore\.)?(?:FieldPath|FieldValue|Timestamp)(?=\.(?:documentId|serverTimestamp|arrayRemove|delete|increment|arrayUnion|fromMillis))/g))];
    expect(references.length).toBeGreaterThan(0);
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", [
      ...imports,
      `console.log(JSON.stringify([${references.map((ref) => `typeof ${ref}`).join(",")}]))`,
    ].join("\n")], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" });
    expect(JSON.parse(output)).toEqual(references.map(() => "function"));
  });
});
