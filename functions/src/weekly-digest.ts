import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import { forEachWithConcurrency } from "./bounded-concurrency";
import {
  compareWeeks,
  computeWeekStats,
  detectWeekPRs,
  type DigestWorkout,
} from "./weekly-digest-stats";
import { buildWeeklyDigest, type DigestStrava, type UnitSystem } from "./weekly-digest-html";
import type { Lang } from "./email-templates";

export const resendApiKey = defineSecret("RESEND_API_KEY");
const DIGEST_CONCURRENCY = 10;

interface StravaDoc {
  date: string;
  type: string;
  distance?: number;
  movingTime?: number;
  name: string;
  averageSpeed?: number;
}

// R2-10: odbiorcy z kolekcji users (status active + opt-out weeklyDigest), a odczyty
// proporcjonalne do treningów (kwerendy zbiorcze), nie kwerendy per user.
// Zależności wstrzykiwane, żeby logika była testowalna bez emulatora.
export interface DigestUser {
  uid: string;
  email?: string;
  status?: string;
  notificationPrefs?: { weeklyDigest?: boolean };
  // Z160: język i jednostki do i18n treści maila.
  language?: string;
  displayName?: string;
  preferences?: { unit?: string; language?: string };
}

export interface WeeklyDigestDeps {
  listUsers: () => Promise<DigestUser[]>;
  queryCompletedWorkouts: (startStr: string, endStr: string) => Promise<DigestWorkout[]>;
  /** Z160: pełne dokumenty ukończonych treningów sprzed danej daty (baza PR-ów
   *  i poprzedni tydzień). Koszt: cała historia kolekcji — przy obecnej skali
   *  userów akceptowalne; przy wzroście → per-user limit albo agregaty. */
  queryWorkoutHistory: (beforeStr: string) => Promise<DigestWorkout[]>;
  queryStravaActivities: (startStr: string, endStr: string) => Promise<Array<StravaDoc & { userId: string }>>;
  sendEmail: (to: string, subject: string, html: string) => Promise<{ error?: { message: string } }>;
  /** B-T6: producent zdarzenia inboxa "raport tygodnia gotowy" (user_events).
   *  Idempotentny: create pod deterministycznym id, ALREADY_EXISTS połykane. */
  writeUserEvent?: (uid: string, event: {
    type: string;
    key: string;
    payload: Record<string, string | number | boolean | null>;
    deepLink: string | null;
  }) => Promise<void>;
  now?: () => Date;
}

const localDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const groupByUser = <T extends { userId?: string }>(docs: T[]): Map<string, T[]> => {
  const byUser = new Map<string, T[]>();
  docs.forEach((docItem) => {
    if (!docItem.userId) return;
    const list = byUser.get(docItem.userId) ?? [];
    list.push(docItem);
    byUser.set(docItem.userId, list);
  });
  return byUser;
};

const userLang = (user: DigestUser): Lang =>
  (user.language ?? user.preferences?.language) === "en" ? "en" : "pl";

const userUnit = (user: DigestUser): UnitSystem =>
  user.preferences?.unit === "lbs" ? "lbs" : "kg";

const buildStravaSummary = (activities: StravaDoc[]): DigestStrava | null => {
  const runs = activities.filter((a) => a.type === "Run");
  if (runs.length === 0) return null;
  const totalRunKm = Math.round(runs.reduce((sum, a) => sum + ((a.distance || 0) / 1000), 0) * 10) / 10;
  const best = runs
    .filter((a) => a.averageSpeed && a.averageSpeed > 0)
    .sort((a, b) => (b.averageSpeed || 0) - (a.averageSpeed || 0))[0];
  const longest = runs
    .filter((a) => a.distance && a.distance > 0)
    .sort((a, b) => (b.distance || 0) - (a.distance || 0))[0];
  return {
    runCount: runs.length,
    totalRunKm,
    ...(best && { bestRun: { name: best.name, km: Math.round(((best.distance || 0) / 1000) * 10) / 10 } }),
    ...(longest && { longestRun: { name: longest.name, km: Math.round(((longest.distance || 0) / 1000) * 10) / 10 } }),
  };
};

export async function runWeeklyDigest(deps: WeeklyDigestDeps): Promise<{ processed: number; sent: number; failed: number }> {
  // Zakres: poprzedni poniedziałek-niedziela.
  const now = deps.now ? deps.now() : new Date();
  const lastMonday = new Date(now);
  const day = lastMonday.getDay();
  const diff = day === 0 ? 6 : day - 1;
  lastMonday.setDate(lastMonday.getDate() - diff - 7);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const startStr = localDateStr(lastMonday);
  const endStr = localDateStr(lastSunday);
  // Poprzedni tydzień (do porównania WoW) wycinamy z kwerendy historii — bez
  // trzeciej kwerendy zbiorczej.
  const prevMonday = new Date(lastMonday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevStartStr = localDateStr(prevMonday);
  const prevEndStr = localDateStr(new Date(lastMonday.getTime() - 24 * 60 * 60 * 1000));

  logger.info(`[WeeklyDigest] Period: ${startStr} - ${endStr}`);

  const recipients = (await deps.listUsers()).filter((user) => (
    !!user.email
    // Brak pola status (konta sprzed hardeningu) = aktywny; jawnie nieaktywni pomijani.
    && (user.status === undefined || user.status === "active")
    // Opt-out: brak pola = wysyłaj.
    && user.notificationPrefs?.weeklyDigest !== false
  ));

  const [weekWorkouts, historyWorkouts, allStrava] = await Promise.all([
    deps.queryCompletedWorkouts(startStr, endStr),
    deps.queryWorkoutHistory(startStr),
    deps.queryStravaActivities(startStr, endStr),
  ]);
  const workoutsByUser = groupByUser(weekWorkouts);
  const historyByUser = groupByUser(historyWorkouts);
  const stravaByUser = groupByUser(allStrava);

  let processed = 0;
  let sent = 0;
  let failed = 0;
  const processUser = async (user: DigestUser & { email: string }) => {
    processed += 1;
    try {
      const workouts = workoutsByUser.get(user.uid) ?? [];
      if (workouts.length === 0) {
        return;
      }

      const lang = userLang(user);
      const unit = userUnit(user);
      const history = historyByUser.get(user.uid) ?? [];
      const prevWeek = history.filter((w) => (w.date ?? "") >= prevStartStr && (w.date ?? "") <= prevEndStr);

      const stats = computeWeekStats(workouts);
      const comparison = prevWeek.length > 0 ? compareWeeks(stats, computeWeekStats(prevWeek)) : null;
      const prs = detectWeekPRs(workouts, history);
      const strava = buildStravaSummary(stravaByUser.get(user.uid) ?? []);

      // B-T6: inbox w apce dostaje zdarzenie niezależnie od losów maila.
      if (deps.writeUserEvent) {
        await deps.writeUserEvent(user.uid, {
          type: "week",
          key: `week-${startStr}`,
          payload: {
            weekStart: startStr,
            workouts: stats.sessions,
            tonnageKg: Math.round(stats.tonnageKg),
            prs: prs.length,
          },
          deepLink: "/analytics",
        });
      }

      const locale = lang === "en" ? "en-US" : "pl-PL";
      const rangeLabel = `${lastMonday.toLocaleDateString(locale, { day: "numeric", month: "long" })} - ${lastSunday.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}`;

      const { subject, html } = buildWeeklyDigest({
        stats,
        comparison,
        prs,
        strava,
        lang,
        unit,
        displayName: user.displayName,
        rangeLabel,
      });

      // Resend SDK nie rzuca przy odrzuceniu — błąd wraca w response.error.
      const response = await deps.sendEmail(user.email, subject, html);
      if (response.error) {
        failed += 1;
        logger.error(`[WeeklyDigest] Provider rejected for ${user.email}: ${response.error.message}`);
        return;
      }
      sent += 1;
      logger.info(`[WeeklyDigest] Email sent to ${user.email}`);
    } catch (error) {
      failed += 1;
      logger.error(`[WeeklyDigest] Failed for ${user.email}:`, error);
    }
  };

  await forEachWithConcurrency(
    recipients.map((user) => ({ ...user, email: user.email as string })),
    DIGEST_CONCURRENCY,
    processUser,
  );

  logger.info("[WeeklyDigest] Done.", { processed, sent, failed });
  return { processed, sent, failed };
}

export const weeklyDigest = onSchedule(
  {
    schedule: "every monday 08:00",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 300,
    secrets: [resendApiKey],
  },
  async () => {
    const db = admin.firestore();
    logger.info("[WeeklyDigest] Starting...");

    const apiKey = resendApiKey.value();
    if (!apiKey) {
      logger.error("[WeeklyDigest] Missing secret: resend-api-key");
      return;
    }

    const resend = new Resend(apiKey);

    await runWeeklyDigest(buildWeeklyDigestDeps(db, resend));
  },
);

// Z160: deps wyciągnięte do funkcji, żeby ręczny trigger testowy (sendTestDigest)
// używał DOKŁADNIE tej samej ścieżki co poniedziałkowy harmonogram.
export function buildWeeklyDigestDeps(db: FirebaseFirestore.Firestore, resend: Resend): WeeklyDigestDeps {
  return {
    listUsers: async () => {
      // Paginacja po kolekcji users (1 read/user) zamiast listUsers z Auth —
      // profil niesie status, notificationPrefs, język i jednostki.
      const users: DigestUser[] = [];
      let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
      for (;;) {
        let query = db.collection("users")
          .select("email", "status", "notificationPrefs", "language", "displayName", "preferences")
          .orderBy("__name__")
          .limit(1000);
        if (last) query = query.startAfter(last);
        const page = await query.get();
        page.docs.forEach((doc) => {
          const data = doc.data() as Omit<DigestUser, "uid">;
          users.push({ uid: doc.id, ...data });
        });
        if (page.docs.length < 1000) break;
        last = page.docs[page.docs.length - 1];
      }
      return users;
    },
    queryCompletedWorkouts: async (startStr, endStr) => {
      const snapshot = await db.collection("workouts")
        .where("completed", "==", true)
        .where("date", ">=", startStr)
        .where("date", "<=", endStr)
        .get();
      return snapshot.docs.map((doc) => doc.data() as DigestWorkout);
    },
    queryWorkoutHistory: async (beforeStr) => {
      // Koszt świadomy (Z160): pełne dokumenty CAŁEJ historii ukończonych treningów.
      // Przy obecnej skali userów to akceptowalne; przy wzroście — limit per user
      // albo agregaty tygodniowe.
      const snapshot = await db.collection("workouts")
        .where("completed", "==", true)
        .where("date", "<", beforeStr)
        .get();
      return snapshot.docs.map((doc) => doc.data() as DigestWorkout);
    },
    queryStravaActivities: async (startStr, endStr) => {
      const snapshot = await db.collection("strava_activities")
        .where("date", ">=", startStr)
        .where("date", "<=", endStr)
        .get();
      return snapshot.docs.map((doc) => doc.data() as StravaDoc & { userId: string });
    },
    sendEmail: async (to, subject, html) => {
      const response = await resend.emails.send({
        from: "Strength Save <noreply@strengthsave.app>",
        to,
        subject,
        html,
      });
      return response.error ? { error: { message: response.error.message } } : {};
    },
    // B-T6: create (nie set) pod deterministycznym id — powtórny bieg digestu
    // dla tego samego tygodnia dostaje ALREADY_EXISTS i zostawia oryginał
    // (createdAt/readAt) w spokoju.
    writeUserEvent: async (uid, event) => {
      const id = `${uid}-${event.key}`;
      try {
        await db.collection("user_events").doc(id).create({
          v: 1,
          userId: uid,
          type: event.type,
          key: event.key,
          payload: event.payload,
          deepLink: event.deepLink,
          createdAt: Date.now(),
          readAt: null,
        });
      } catch (error) {
        const code = (error as { code?: number | string }).code;
        if (code !== 6 && code !== "already-exists") throw error;
      }
    },
  };
}
