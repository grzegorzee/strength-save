import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";

// Z222: dzienny raport kosztów chmury. Metryki Firestore/Functions z Cloud
// Monitoring API (jedyne dostępne API na te liczby), maile jako przybliżenie
// dolne z email_verification_codes.sentAt (Resend nie wystawia dziennego
// licznika per projekt). Wynik: admin_cost_daily/{date}, czytelny tylko dla
// admina — zero danych treningowych, jeden dokument dziennie.

interface TimeSeriesPoint {
  value?: { int64Value?: string; doubleValue?: number };
}
interface TimeSeriesResponse {
  timeSeries?: Array<{ points?: TimeSeriesPoint[] }>;
}

export const summarizeCostTimeSeries = (response: unknown): number => {
  const data = response as TimeSeriesResponse | null;
  if (!data || !Array.isArray(data.timeSeries)) return 0;
  let total = 0;
  for (const seriesEntry of data.timeSeries) {
    for (const point of Array.isArray(seriesEntry?.points) ? seriesEntry.points : []) {
      const value = point?.value;
      if (!value) continue;
      if (typeof value.int64Value === "string") total += Number(value.int64Value) || 0;
      else if (typeof value.doubleValue === "number") total += value.doubleValue;
    }
  }
  return Math.round(total);
};

export interface DailyCostReport {
  date: string;
  firestore: { reads: number | null; writes: number | null; deletes: number | null };
  functions: { invocations: number | null };
  emails: { verificationSentApprox: number | null };
}

export interface CostDigestDeps {
  date: string;
  startIso: string;
  endIso: string;
  fetchMetric: (metricType: string, startIso: string, endIso: string) => Promise<unknown>;
  countVerificationEmails: (startIso: string, endIso: string) => Promise<number>;
  writeReport: (date: string, report: DailyCostReport) => Promise<void>;
}

const METRICS = {
  reads: "firestore.googleapis.com/document/read_count",
  writes: "firestore.googleapis.com/document/write_count",
  deletes: "firestore.googleapis.com/document/delete_count",
  invocations: "cloudfunctions.googleapis.com/function/execution_count",
} as const;

export const runDailyCostDigest = async (deps: CostDigestDeps): Promise<DailyCostReport> => {
  // Błąd jednej metryki nie wywraca raportu — pole zostaje null (jawnie "brak
  // odczytu"), reszta liczb dalej ma wartość operacyjną.
  const metric = async (metricType: string): Promise<number | null> => {
    try {
      return summarizeCostTimeSeries(await deps.fetchMetric(metricType, deps.startIso, deps.endIso));
    } catch (error) {
      logger.warn(`[costDigest] metryka ${metricType} nieodczytana`, error);
      return null;
    }
  };

  const emails = async (): Promise<number | null> => {
    try {
      return await deps.countVerificationEmails(deps.startIso, deps.endIso);
    } catch {
      return null;
    }
  };

  const report: DailyCostReport = {
    date: deps.date,
    firestore: {
      reads: await metric(METRICS.reads),
      writes: await metric(METRICS.writes),
      deletes: await metric(METRICS.deletes),
    },
    functions: { invocations: await metric(METRICS.invocations) },
    emails: { verificationSentApprox: await emails() },
  };

  await deps.writeReport(deps.date, report);
  return report;
};

const localDateKey = (date: Date, offsetDays = 0): string => {
  const shifted = new Date(date.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
};

/** Raport za wczoraj, po nocnym rollupie. */
export const dailyCostDigest = onSchedule(
  {
    schedule: "every day 06:10",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 120,
  },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT ?? admin.app().options.projectId;
    const date = localDateKey(new Date(), -1);
    const startIso = `${date}T00:00:00Z`;
    const endIso = `${localDateKey(new Date())}T00:00:00Z`;

    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/monitoring.read"] });
    const client = await auth.getClient();

    const report = await runDailyCostDigest({
      date,
      startIso,
      endIso,
      fetchMetric: async (metricType, start, end) => {
        const params = new URLSearchParams({
          filter: `metric.type = "${metricType}"`,
          "interval.startTime": start,
          "interval.endTime": end,
          "aggregation.alignmentPeriod": "86400s",
          "aggregation.perSeriesAligner": "ALIGN_SUM",
          "aggregation.crossSeriesReducer": "REDUCE_SUM",
        });
        const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`;
        const response = await client.request({ url });
        return response.data;
      },
      countVerificationEmails: async (start, end) => {
        const snapshot = await admin.firestore()
          .collection("email_verification_codes")
          .where("sentAt", ">=", start)
          .where("sentAt", "<", end)
          .get();
        return snapshot.size;
      },
      writeReport: async (reportDate, dailyReport) => {
        await admin.firestore().collection("admin_cost_daily").doc(reportDate).set({
          ...dailyReport,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      },
    });

    logger.info(`[costDigest] ${date}: reads=${report.firestore.reads} writes=${report.firestore.writes} invocations=${report.functions.invocations}`);
  },
);
