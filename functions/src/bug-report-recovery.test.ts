import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const mocks = vi.hoisted(() => ({
  firestore: vi.fn(),
  file: vi.fn(),
  send: vi.fn(),
}));
vi.mock("firebase-admin", () => ({
  firestore: mocks.firestore,
  storage: () => ({ bucket: () => ({ file: mocks.file }) }),
}));
vi.mock("./ses-email", () => ({
  SES_EMAIL_SECRETS: [],
  safeSesErrorCode: () => "test-error",
  sendSesEmail: mocks.send,
}));
vi.mock("./email-log", () => ({ writeEmailLog: vi.fn() }));
vi.mock("./security", () => ({ hasCallableAppAccess: () => true }));

import { cleanupStaleBugReports, finalizeBugReport } from "./bug-reports";

// Execute the actual scheduled handler against a small Firestore boundary.
// The report is already durable; no client needs to return to the app.
describe("abandoned bug report recovery", () => {
  const reportId = "user-1_0f2c65a0-3514-4b59-80b5-8fc35c3914ba";
  let report: Record<string, unknown> | undefined;
  const remove = vi.fn();
  const now = Date.parse("2026-09-16T14:00:00Z");
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(now);
    report = {
      userId: "user-1",
      clientRequestId: reportId.slice(7),
      status: "awaiting_upload",
      message: "Nie mogę zmienić kategorii po otwarciu klawiatury.",
      category: "ui",
      uploadPath: `bug-reports/user-1/${reportId}/screenshot.jpg`,
      createdAt: Timestamp.fromMillis(now - 25 * 60 * 60 * 1_000),
      updatedAt: Timestamp.fromMillis(now - 25 * 60 * 60 * 1_000),
      expiresAt: Timestamp.fromMillis(now + 179 * 24 * 60 * 60 * 1_000),
    };
    const ref = {
      id: reportId,
      get: async () => ({ exists: !!report, data: () => report }),
      update: vi.fn(async (patch: Record<string, unknown>) => { report = { ...report, ...patch }; }),
      delete: vi.fn(async () => { remove(); report = undefined; }),
    };
    const collection = () => {
      const filters: Array<(data: Record<string, unknown>) => boolean> = [];
      const query = {
        doc: () => ref,
        where: (field: string, op: string, value: unknown) => {
          filters.push(data => {
            const actual = data[field];
            if (op === "==") return actual === value;
            if (op === "<=") return Number(actual) <= Number(value);
            return false;
          });
          return query;
        },
        orderBy: () => query,
        limit: () => query,
        startAfter: () => query,
        get: async () => {
          const docs = report && filters.every(f => f(report!))
            ? [{ id: reportId, ref, data: () => report }] : [];
          return { docs, empty: docs.length === 0, size: docs.length };
        },
      };
      return query;
    };
    mocks.firestore.mockReturnValue({
      collection,
      runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
        get: () => ref.get(),
        update: (_ref: unknown, patch: Record<string, unknown>) => ref.update(patch),
      }),
    });
    mocks.file.mockReturnValue({
      delete: vi.fn(async () => undefined),
      exists: vi.fn(async () => [false]),
      getMetadata: vi.fn(async () => { throw Object.assign(new Error("not found"), { code: 404 }); }),
    });
    mocks.send.mockResolvedValue({ transport: "ses", sesMessageId: "test-message-id" });
  });

  const run = () => cleanupStaleBugReports.run({ scheduleTime: new Date(now).toISOString(), jobName: "test" });
  const finalize = (useScreenshot: boolean) => finalizeBugReport.run({
    auth: { uid: "user-1" }, data: { clientRequestId: reportId.slice(7), useScreenshot },
  } as never);

  it("finalizes a client request without a screenshot and a repeat sends no second email", async () => {
    await expect(finalize(false)).resolves.toMatchObject({ ok: true, screenshotAttached: false });
    await expect(finalize(false)).resolves.toMatchObject({ ok: true });
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("finalizes the client request even when the uploaded screenshot cannot be read", async () => {
    await expect(finalize(true)).resolves.toMatchObject({ ok: true, screenshotAttached: false });
    expect(report).toMatchObject({ status: "new", emailDelivery: { status: "accepted" } });
  });

  it("does not delete an attached screenshot or reopen a triaged report on retry", async () => {
    report!.status = "triaged";
    report!.screenshot = { path: report!.uploadPath };
    report!.emailDelivery = { status: "accepted" };
    await expect(finalize(false)).resolves.toMatchObject({ ok: true, screenshotAttached: true });
    expect(report!.status).toBe("triaged");
    expect(mocks.file).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("finalizes the abandoned description and emails the original report instead of deleting it", async () => {
    await run();
    expect(remove).not.toHaveBeenCalled();
    expect(report).toMatchObject({
      status: "new",
      message: "Nie mogę zmienić kategorii po otwarciu klawiatury.",
      emailDelivery: { status: "accepted" },
    });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "contact@strengthsave.app",
      text: expect.stringContaining(reportId),
    }));
    await run();
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it("leaves a fresh in-flight upload alone", async () => {
    report!.createdAt = Timestamp.fromMillis(now - 30_000);
    report!.updatedAt = Timestamp.fromMillis(now - 30_000);
    await run();
    expect(report!.status).toBe("awaiting_upload");
    expect(remove).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("uses the last retry time rather than deleting or finalizing an old but active upload", async () => {
    report!.updatedAt = Timestamp.fromMillis(now - 30_000);
    await run();
    expect(report!.status).toBe("awaiting_upload");
    expect(remove).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("keeps a valid JPEG which uploaded before the app was killed", async () => {
    const removeFile = vi.fn();
    mocks.file.mockReturnValue({
      getMetadata: async () => [{ contentType: "image/jpeg", size: 100 }],
      download: async () => [new Uint8Array([0xff, 0xd8, 0xff])],
      delete: removeFile,
    });
    await run();
    expect(report!.screenshot).toMatchObject({ path: report!.uploadPath, size: 100 });
    expect(removeFile).not.toHaveBeenCalled();
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("sends the description even when the uploaded image is invalid", async () => {
    mocks.file.mockReturnValue({
      getMetadata: async () => [{ contentType: "image/jpeg", size: 100 }],
      download: async () => [new Uint8Array([0, 1, 2])],
      delete: vi.fn(),
    });
    await run();
    expect(report).toMatchObject({ status: "new", screenshot: null, emailDelivery: { status: "accepted" } });
  });

  it("retries a failed email later without creating or finalizing another report", async () => {
    mocks.send.mockRejectedValueOnce(new Error("SES unavailable"));
    await run();
    expect(report).toMatchObject({ status: "new", emailDelivery: { status: "failed" } });
    await run();
    expect(mocks.send).toHaveBeenCalledTimes(1);
    vi.spyOn(Date, "now").mockReturnValue(now + 16 * 60_000);
    await run();
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(report).toMatchObject({ status: "new", emailDelivery: { status: "accepted" } });
  });

  it("recovers a committed report after the finalizer died before sending", async () => {
    report!.status = "new";
    report!.emailDelivery = { status: "pending" };
    report!.emailRetryAt = Timestamp.fromMillis(now - 1);
    await run();
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(report!.emailDelivery).toMatchObject({ status: "accepted" });
  });

  it("still removes data after the original retention period", async () => {
    report!.expiresAt = Timestamp.fromMillis(now - 1);
    await run();
    expect(remove).toHaveBeenCalledOnce();
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
