import { describe, expect, it, vi } from "vitest";
import { summarizeCostTimeSeries, runDailyCostDigest } from "./cost-digest";

// Z222: dzienny raport kosztów chmury (Firestore/Functions/maile) z Cloud
// Monitoring API — liczby do admin_cost_daily, zero danych treningowych.

const series = (values: number[]) => ({
  timeSeries: values.map((value) => ({
    points: [{ value: { int64Value: String(value) } }],
  })),
});

describe("Z222 — summarizeCostTimeSeries", () => {
  it("sumuje punkty wszystkich serii (int64 jako string i double)", () => {
    expect(summarizeCostTimeSeries(series([100, 250]))).toBe(350);
    expect(summarizeCostTimeSeries({
      timeSeries: [{ points: [{ value: { doubleValue: 12.4 } }] }],
    })).toBe(12);
  });

  it("puste/uszkodzone odpowiedzi dają 0, nie wyjątek", () => {
    expect(summarizeCostTimeSeries({})).toBe(0);
    expect(summarizeCostTimeSeries({ timeSeries: [{}] })).toBe(0);
    expect(summarizeCostTimeSeries(null)).toBe(0);
  });
});

describe("Z222 — runDailyCostDigest", () => {
  it("zbiera metryki, maile i zapisuje raport pod datą", async () => {
    const fetchMetric = vi.fn(async (metricType: string) => {
      const byType: Record<string, number> = {
        "firestore.googleapis.com/document/read_count": 12345,
        "firestore.googleapis.com/document/write_count": 678,
        "firestore.googleapis.com/document/delete_count": 9,
        "cloudfunctions.googleapis.com/function/execution_count": 456,
      };
      return series([byType[metricType] ?? 0]);
    });
    const countVerificationEmails = vi.fn(async () => 7);
    const writeReport = vi.fn(async () => undefined);

    const report = await runDailyCostDigest({
      date: "2026-08-09",
      startIso: "2026-08-09T00:00:00Z",
      endIso: "2026-08-10T00:00:00Z",
      fetchMetric,
      countVerificationEmails,
      writeReport,
    });

    expect(report).toEqual({
      date: "2026-08-09",
      firestore: { reads: 12345, writes: 678, deletes: 9 },
      functions: { invocations: 456 },
      emails: { verificationSentApprox: 7 },
    });
    expect(writeReport).toHaveBeenCalledWith("2026-08-09", report);
    expect(fetchMetric).toHaveBeenCalledTimes(4);
  });

  it("błąd jednej metryki nie wywraca raportu (null w polu, reszta liczona)", async () => {
    const fetchMetric = vi.fn(async (metricType: string) => {
      if (metricType.includes("read_count")) throw new Error("monitoring 500");
      return series([5]);
    });
    const report = await runDailyCostDigest({
      date: "2026-08-09",
      startIso: "s",
      endIso: "e",
      fetchMetric,
      countVerificationEmails: async () => 0,
      writeReport: async () => undefined,
    });
    expect(report.firestore.reads).toBeNull();
    expect(report.firestore.writes).toBe(5);
  });
});
