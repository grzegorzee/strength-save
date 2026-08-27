import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const writes: Array<{ kind: "set" | "update"; path: string; data: Record<string, unknown> }> = [];
  const batch = {
    set: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
      writes.push({ kind: "set", path: ref.path, data });
    }),
    update: vi.fn((ref: { path: string }, data: Record<string, unknown>) => {
      writes.push({ kind: "update", path: ref.path, data });
    }),
    commit: vi.fn(async () => undefined),
  };
  const db = {
    batch: vi.fn(() => batch),
    collection: vi.fn((collection: string) => ({
      doc: vi.fn((id?: string) => ({ path: `${collection}/${id ?? "generated"}` })),
    })),
  };
  return { writes, batch, db, serverTimestamp: { __serverTimestamp: true } };
});

vi.mock("firebase-admin", () => ({
  firestore: Object.assign(
    vi.fn(() => firestoreMocks.db),
    { FieldValue: { serverTimestamp: vi.fn(() => firestoreMocks.serverTimestamp) } },
  ),
}));

import { recordConsent } from "./consents";
import { LEGAL_VERSIONS } from "./legal-versions";

describe("recordConsent response mirror", () => {
  beforeEach(() => {
    firestoreMocks.writes.length = 0;
    firestoreMocks.batch.set.mockClear();
    firestoreMocks.batch.update.mockClear();
    firestoreMocks.batch.commit.mockClear();
  });

  it("po commit zwraca nested mirror zgodny z atomowym update users/{uid}", async () => {
    const response = await recordConsent.run({
      auth: { uid: "user-1", token: {} },
      data: {
        entries: [
          { type: "terms", action: "granted", docVersion: LEGAL_VERSIONS.terms, lang: "pl", statementText: "Akceptuję regulamin." },
          { type: "privacy_ack", action: "granted", docVersion: LEGAL_VERSIONS.privacy, lang: "pl", statementText: "Potwierdzam politykę." },
          { type: "health", action: "granted", docVersion: LEGAL_VERSIONS.health, lang: "pl", statementText: "Wyrażam zgodę." },
        ],
        channel: "ios",
        appVersion: "1.0.0 (130)",
      },
      rawRequest: { headers: { "x-forwarded-for": "203.0.113.4" } },
    } as never);

    expect(firestoreMocks.batch.commit).toHaveBeenCalledTimes(1);
    const userUpdate = firestoreMocks.writes.find((write) => write.kind === "update");
    expect(userUpdate).toMatchObject({
      path: "users/user-1",
      data: {
        "consents.termsVersion": LEGAL_VERSIONS.terms,
        "consents.privacyVersion": LEGAL_VERSIONS.privacy,
        "consents.healthGranted": true,
        "consents.healthVersion": LEGAL_VERSIONS.health,
      },
    });
    expect(response).toEqual({
      ok: true,
      recorded: 3,
      mirror: {
        termsVersion: LEGAL_VERSIONS.terms,
        privacyVersion: LEGAL_VERSIONS.privacy,
        healthGranted: true,
        healthVersion: LEGAL_VERSIONS.health,
      },
    });
  });
});
