import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { forEachWithConcurrency } from "./bounded-concurrency";

// Z96: nocny rollup aktywności. Czyta TYLKO userów aktywnych wczoraj (query po
// date w app_telemetry_daily), liczy okna 7/30 dni per user i zapisuje
// users/{uid}.activitySummary — lista userów w panelu admina czyta wtedy jedną
// kolekcję users zamiast setek dokumentów telemetrii. Koszt: O(aktywnych).

export interface TelemetryDailyDoc {
  userId: string;
  date: string;
  counters?: Record<string, number>;
}

export interface ActivitySummary {
  lastActiveAt: string;
  activeDays7: number;
  activeDays30: number;
  workouts7: number;
  workouts30: number;
  topScreens30: Array<{ key: string; count: number }>;
  updatedAt: string;
}

const shiftDate = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

export const computeActivitySummary = (
  dailyDocs: TelemetryDailyDoc[],
  today: string,
): ActivitySummary => {
  const floor7 = shiftDate(today, -7);
  const floor30 = shiftDate(today, -30);

  let lastActiveAt = "";
  let activeDays7 = 0;
  let activeDays30 = 0;
  let workouts7 = 0;
  let workouts30 = 0;
  const screens = new Map<string, number>();

  for (const dailyDoc of dailyDocs) {
    if (typeof dailyDoc.date !== "string") continue;
    if (dailyDoc.date > lastActiveAt) lastActiveAt = dailyDoc.date;
    if (dailyDoc.date < floor30) continue;

    activeDays30 += 1;
    const counters = dailyDoc.counters ?? {};
    const completed = typeof counters.action_workout_completed === "number"
      ? counters.action_workout_completed
      : 0;
    workouts30 += completed;

    if (dailyDoc.date >= floor7) {
      activeDays7 += 1;
      workouts7 += completed;
    }

    for (const [key, value] of Object.entries(counters)) {
      if (!key.startsWith("screen_") || typeof value !== "number") continue;
      screens.set(key, (screens.get(key) ?? 0) + value);
    }
  }

  const topScreens30 = [...screens.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, 5);

  return {
    lastActiveAt,
    activeDays7,
    activeDays30,
    workouts7,
    workouts30,
    topScreens30,
    updatedAt: new Date().toISOString(),
  };
};

export interface ActivityRollupDeps {
  listActiveUserIds: (date: string) => Promise<string[]>;
  getUserDailyDocs: (uid: string) => Promise<TelemetryDailyDoc[]>;
  writeActivitySummary: (uid: string, summary: ActivitySummary) => Promise<void>;
  today: string;
  yesterday: string;
}

const ROLLUP_CONCURRENCY = 8;

export const runActivityRollup = async (
  deps: ActivityRollupDeps,
): Promise<{ processed: number }> => {
  const userIds = await deps.listActiveUserIds(deps.yesterday);
  let processed = 0;

  await forEachWithConcurrency(userIds, ROLLUP_CONCURRENCY, async (uid) => {
    const dailyDocs = await deps.getUserDailyDocs(uid);
    const summary = computeActivitySummary(dailyDocs, deps.today);
    await deps.writeActivitySummary(uid, summary);
    processed += 1;
  });

  return { processed };
};

const localDateKey = (date: Date, offsetDays = 0): string => {
  const shifted = new Date(date.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  // 03:30 Europe/Warsaw = 01:30/02:30 UTC tego samego dnia — UTC daje poprawny dzień.
  return shifted.toISOString().slice(0, 10);
};

export const activityRollup = onSchedule(
  {
    schedule: "every day 03:30",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 300,
  },
  async () => {
    const db = admin.firestore();
    const today = localDateKey(new Date());
    const yesterday = localDateKey(new Date(), -1);
    logger.info(`[activityRollup] start, wczoraj: ${yesterday}`);

    const result = await runActivityRollup({
      today,
      yesterday,
      listActiveUserIds: async (date) => {
        const snapshot = await db.collection("app_telemetry_daily")
          .where("date", "==", date)
          .get();
        return [...new Set(snapshot.docs
          .map((docSnapshot) => docSnapshot.get("userId") as string)
          .filter((uid) => typeof uid === "string" && uid.length > 0))];
      },
      getUserDailyDocs: async (uid) => {
        const floor = localDateKey(new Date(), -31);
        const snapshot = await db.collection("app_telemetry_daily")
          .where("userId", "==", uid)
          .where("date", ">=", floor)
          .get();
        return snapshot.docs.map((docSnapshot) => docSnapshot.data() as TelemetryDailyDoc);
      },
      writeActivitySummary: async (uid, summary) => {
        await db.collection("users").doc(uid).set({ activitySummary: summary }, { merge: true });
      },
    });

    logger.info(`[activityRollup] done, przetworzeni: ${result.processed}`);
  },
);
