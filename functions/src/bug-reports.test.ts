import { describe, expect, it } from "vitest";
import {
  BUG_REPORT_CATEGORIES,
  BUG_REPORT_MAX_SCREENSHOT_BYTES,
  bugReportDocId,
  buildNextRateLimit,
  isJpegMagicBytes,
  canTransitionBugReportStatus,
  bugReportScreenshotUrlExpiry,
  normalizeAdminBugReportId,
  normalizeAdminUpdateBugReportData,
  bugReportExpiresAt,
  shouldCleanupStaleBugReport,
  shouldCleanupBugReport,
  normalizeBugReporterEmail,
  resolveBugReportScreenshotPath,
  normalizeCreateBugReportData,
  normalizeFinalizeBugReportData,
  buildBugReportEmail,
} from "./bug-reports";

describe("bug report input contract", () => {
  const id = "0f2c65a0-3514-4b59-80b5-8fc35c3914ba";

  it("keeps the client and backend category union closed", () => {
    expect(BUG_REPORT_CATEGORIES).toEqual(["crash", "sync", "workout", "ui", "account", "other"]);
  });

  it("normalizes a bounded auth-token email snapshot without trusting client data", () => {
    expect(normalizeBugReporterEmail("  User.Name@Example.COM  ")).toBe("user.name@example.com");
    expect(normalizeBugReporterEmail("not-an-email")).toBeNull();
    expect(normalizeBugReporterEmail(`${"a".repeat(250)}@example.com`)).toBeNull();
    expect(normalizeBugReporterEmail(undefined)).toBeNull();
  });

  it("uses an idempotent uid + UUID document id and exact private upload path", () => {
    expect(bugReportDocId("user-1", id)).toBe(`user-1_${id}`);
    expect(normalizeCreateBugReportData({
      clientRequestId: id,
      category: "workout",
      message: "Przycisk zapisu nie reaguje po powrocie z tła.",
    }, "user-1")).toMatchObject({
      clientRequestId: id,
      reportId: `user-1_${id}`,
      uploadPath: `bug-reports/user-1/user-1_${id}/screenshot.jpg`,
    });
  });

  it.each([
    { clientRequestId: "not-a-uuid", category: "workout", message: "x".repeat(20) },
    { clientRequestId: id, category: "unknown", message: "x".repeat(20) },
    { clientRequestId: id, category: "other", message: "too short" },
    { clientRequestId: id, category: "other", message: "x".repeat(4001) },
  ])("rejects malformed create payload %#", (payload) => {
    expect(() => normalizeCreateBugReportData(payload, "user-1")).toThrow();
  });

  it("accepts finalize with or without a screenshot but never a caller-provided path", () => {
    expect(normalizeFinalizeBugReportData({ clientRequestId: id, useScreenshot: true }, "user-1"))
      .toEqual({ reportId: `user-1_${id}`, useScreenshot: true });
    expect(normalizeFinalizeBugReportData({ clientRequestId: "not-a-uuid", useScreenshot: false }, "user-1"))
      .toBeNull();
  });
});

describe("bug report rate limiting", () => {
  const now = Date.parse("2026-08-27T10:15:00.000Z");

  it("allows at most 3 new reports/hour and 10/day", () => {
    let state = null;
    for (let index = 0; index < 3; index += 1) {
      state = buildNextRateLimit(state, now);
    }
    expect(state).toMatchObject({ hourCount: 3, dayCount: 3 });
    expect(() => buildNextRateLimit(state, now)).toThrowError("BUG_REPORT_HOURLY_LIMIT");

    expect(() => buildNextRateLimit({
      hourKey: "2026-08-27T10",
      hourCount: 1,
      dayKey: "2026-08-27",
      dayCount: 10,
    }, now)).toThrowError("BUG_REPORT_DAILY_LIMIT");
  });

  it("resets only the elapsed window", () => {
    expect(buildNextRateLimit({
      hourKey: "2026-08-27T09",
      hourCount: 3,
      dayKey: "2026-08-27",
      dayCount: 5,
    }, now)).toMatchObject({ hourCount: 1, dayCount: 6 });
  });
});

describe("bug report screenshot contract", () => {
  it("uses a strict 1.5 MiB JPEG ceiling and verifies JPEG magic bytes", () => {
    expect(BUG_REPORT_MAX_SCREENSHOT_BYTES).toBe(1_572_864);
    expect(isJpegMagicBytes(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);
    expect(isJpegMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });
});

describe("bug report Amazon SES notification", () => {
  it("builds an escaped operator email without exposing a screenshot publicly", () => {
    const email = buildBugReportEmail("user-1_report", {
      category: "ui",
      message: "Przycisk <Zapisz> nie działa.\nPo powrocie z tła.",
      context: { platform: "ios", route: "/workout/day-1" },
      screenshot: { path: "bug-reports/private/screenshot.jpg" },
    });

    expect(email.to).toBe("contact@strengthsave.app");
    expect(email.subject).toContain("ui");
    expect(email.html).toContain("Przycisk &lt;Zapisz&gt; nie działa.");
    expect(email.html).not.toContain("bug-reports/private/screenshot.jpg");
    expect(email.text).toContain("Screenshot: dostępny bezpiecznie w panelu admina");
  });
});

describe("bug report admin contract", () => {
  const reportId = "user-1_0f2c65a0-3514-4b59-80b5-8fc35c3914ba";

  it("accepts only a valid report id and clamps no admin input silently", () => {
    expect(normalizeAdminBugReportId({ reportId })).toBe(reportId);
    expect(normalizeAdminBugReportId({ reportId: "../foreign" })).toBeNull();
    expect(normalizeAdminUpdateBugReportData({
      reportId,
      status: "triaged",
      priority: "high",
      note: "Odtworzone na iOS 18.",
    })).toEqual({ reportId, status: "triaged", priority: "high", note: "Odtworzone na iOS 18." });
    expect(normalizeAdminUpdateBugReportData({ reportId, status: "unknown" })).toBeNull();
    expect(normalizeAdminUpdateBugReportData({ reportId, status: "triaged", priority: "urgent" })).toBeNull();
    expect(normalizeAdminUpdateBugReportData({ reportId, status: "triaged", note: "x".repeat(2_001) })).toBeNull();
  });

  it("uses a closed transition graph with explicit reopen paths", () => {
    expect(canTransitionBugReportStatus("new", "triaged")).toBe(true);
    expect(canTransitionBugReportStatus("triaged", "in_progress")).toBe(true);
    expect(canTransitionBugReportStatus("in_progress", "resolved")).toBe(true);
    expect(canTransitionBugReportStatus("resolved", "in_progress")).toBe(true);
    expect(canTransitionBugReportStatus("closed", "new")).toBe(false);
    expect(canTransitionBugReportStatus("duplicate", "resolved")).toBe(false);
    expect(canTransitionBugReportStatus("awaiting_upload", "triaged")).toBe(false);
  });

  it("limits signed screenshot URLs to exactly five minutes", () => {
    expect(bugReportScreenshotUrlExpiry(1_000)).toBe(301_000);
  });

  it("signs only the exact screenshot path stored on that report", () => {
    const exact = `bug-reports/user-1/${reportId}/screenshot.jpg`;
    expect(resolveBugReportScreenshotPath(reportId, { userId: "user-1", screenshot: { path: exact } })).toBe(exact);
    expect(resolveBugReportScreenshotPath(reportId, { userId: "user-1", screenshot: { path: "avatars/user-1/a.jpg" } })).toBeNull();
    expect(resolveBugReportScreenshotPath(reportId, { userId: "user-1" })).toBeNull();
  });

  it("retains reports for 180 days and cleans only stale awaiting uploads after 24h", () => {
    const now = Date.parse("2026-08-27T12:00:00.000Z");
    expect(bugReportExpiresAt(now)).toBe(now + 180 * 24 * 60 * 60 * 1_000);
    expect(shouldCleanupStaleBugReport("awaiting_upload", now - 24 * 60 * 60 * 1_000 - 1, now)).toBe(true);
    expect(shouldCleanupStaleBugReport("awaiting_upload", now - 60 * 60 * 1_000, now)).toBe(false);
    expect(shouldCleanupStaleBugReport("new", now - 2 * 24 * 60 * 60 * 1_000, now)).toBe(false);
    expect(shouldCleanupBugReport("resolved", now - 10, now - 1, now)).toBe(true);
    expect(shouldCleanupBugReport("resolved", now - 10, now + 1, now)).toBe(false);
  });
});
