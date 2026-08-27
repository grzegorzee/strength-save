import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  ERROR_SPIKE_THRESHOLD,
  buildErrorAlertHtml,
  buildErrorDigestDeps,
  errorStateDocId,
  runErrorDigest,
  type ErrorDigestDeps,
  type ErrorDigestEntry,
} from "./error-digest";

// WP-G Task G4: dzienny alert telemetrii. Nowy kod => mail; znany rzadki kod
// => cisza; znany kod z naglym wzrostem (> prog) => mail. Zero PII (bez uid).

const NOW = 1_755_750_000_000;

const buildDeps = (
  entries: ErrorDigestEntry[],
  seenCodes: string[],
): ErrorDigestDeps & {
  sendAlertEmail: ReturnType<typeof vi.fn>;
  markCodesSeen: ReturnType<typeof vi.fn>;
} => {
  const sendAlertEmail = vi.fn(async () => {});
  const markCodesSeen = vi.fn(async () => {});
  return {
    nowMs: NOW,
    listRecentErrors: async () => entries,
    loadSeenCodes: async (codes) => new Set(codes.filter((code) => seenCodes.includes(code))),
    markCodesSeen,
    sendAlertEmail,
  };
};

describe("WP-G — runErrorDigest", () => {
  it("nowy kod bledu wysyla mail z kodem, licznoscia i platforma (bez uid)", async () => {
    const deps = buildDeps([
      { code: "render-crash", platform: "ios", detail: "[E-8UE4S] Invalid date-only value:  at WorkoutHistory" },
      { code: "render-crash", platform: "web" },
    ], []);

    const { alerts } = await runErrorDigest(deps);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      code: "render-crash",
      reason: "new-code",
      count: 2,
      platforms: ["ios", "web"],
    });
    expect(deps.sendAlertEmail).toHaveBeenCalledTimes(1);
    const [subject, html] = deps.sendAlertEmail.mock.calls[0] as [string, string];
    expect(subject).toContain("render-crash");
    expect(html).toContain("E-8UE4S");
    expect(html).not.toContain("uid");
  });

  it("znany kod ponizej progu nie wysyla maila, ale stan jest dopisywany", async () => {
    const deps = buildDeps([
      { code: "draft-save-retry", platform: "ios" },
      { code: "draft-save-retry", platform: "ios" },
    ], ["draft-save-retry"]);

    const { alerts } = await runErrorDigest(deps);

    expect(alerts).toEqual([]);
    expect(deps.sendAlertEmail).not.toHaveBeenCalled();
    expect(deps.markCodesSeen).toHaveBeenCalledWith(
      [{ code: "draft-save-retry", count: 2 }],
      NOW,
    );
  });

  it("znany kod z naglym wzrostem (> prog) alarmuje jako spike", async () => {
    const entries: ErrorDigestEntry[] = Array.from(
      { length: ERROR_SPIKE_THRESHOLD + 1 },
      () => ({ code: "sync-conflict", platform: "android" }),
    );
    const deps = buildDeps(entries, ["sync-conflict"]);

    const { alerts } = await runErrorDigest(deps);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].reason).toBe("spike");
    expect(alerts[0].count).toBe(ERROR_SPIKE_THRESHOLD + 1);
    expect(deps.sendAlertEmail).toHaveBeenCalledTimes(1);
  });

  it("pusta doba: zero maili, zero zapisow stanu", async () => {
    const deps = buildDeps([], []);
    const { alerts } = await runErrorDigest(deps);
    expect(alerts).toEqual([]);
    expect(deps.sendAlertEmail).not.toHaveBeenCalled();
    expect(deps.markCodesSeen).not.toHaveBeenCalled();
  });

  it("padniety mail NIE oznacza kodow jako widzianych (alert nie ginie)", async () => {
    const deps = buildDeps([{ code: "new-crash", platform: "web" }], []);
    deps.sendAlertEmail.mockRejectedValueOnce(new Error("SES 500"));

    await expect(runErrorDigest(deps)).rejects.toThrow("SES 500");
    expect(deps.markCodesSeen).not.toHaveBeenCalled();
  });
});

describe("WP-G — pomocnicze", () => {
  it("errorStateDocId koduje znaki niedozwolone w sciezce dokumentu", () => {
    expect(errorStateDocId("a/b c")).toBe("a%2Fb%20c");
  });

  it("buildErrorAlertHtml escapuje HTML w detail", () => {
    const html = buildErrorAlertHtml([{
      code: "x",
      reason: "new-code",
      count: 1,
      platforms: ["web"],
      sampleDetail: "<script>alert(1)</script>",
    }]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("error digest: wspólny transport Amazon SES", () => {
  const source = readFileSync(new URL("./error-digest.ts", import.meta.url), "utf8");

  it("nie ma runtime Resend i binduje wszystkie sekrety SES", () => {
    expect(source).toContain('from "./ses-email"');
    expect(source).toContain("sendSesEmail");
    expect(source).toMatch(/secrets: \[\.\.\.SES_EMAIL_SECRETS\]/);
    expect(source).not.toContain('from "resend"');
    expect(source).not.toContain("RESEND_API_KEY");
  });

  it("adapter produkcyjny używa wstrzykniętego sendera SES", async () => {
    const sender = vi.fn(async () => ({ transport: "ses" as const, sesMessageId: "ses-error-1" }));
    const deps = buildErrorDigestDeps({} as FirebaseFirestore.Firestore, sender, NOW);

    await expect(deps.sendAlertEmail("Alert", "<p>Błąd</p>")).resolves.toBeUndefined();
    expect(sender).toHaveBeenCalledWith({
      to: "contact@strengthsave.app",
      subject: "Alert",
      html: "<p>Błąd</p>",
    });
  });

  it("adapter propaguje odrzucenie SES, aby kod nie został oznaczony jako widziany", async () => {
    const sender = vi.fn(async (): Promise<never> => { throw new Error("SES unavailable"); });
    const deps = buildErrorDigestDeps({} as FirebaseFirestore.Firestore, sender, NOW);

    await expect(deps.sendAlertEmail("Alert", "<p>Błąd</p>"))
      .rejects.toThrow("SES unavailable");
  });
});
