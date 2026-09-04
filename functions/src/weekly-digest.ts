import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { forEachWithConcurrency } from "./bounded-concurrency";
import {
  compareWeeks,
  computeWeekStats,
  detectWeekPRs,
  selectCompletedDigestWorkouts,
  type DigestWorkout,
} from "./weekly-digest-stats";
import { buildWeeklyDigest, type DigestStrava, type UnitSystem } from "./weekly-digest-html";
import type { Lang } from "./email-templates";
import { writeEmailLog, type EmailLogWrite } from "./email-log";
import { localDayParts, shiftDateStr } from "./local-time";
import { SES_EMAIL_SECRETS, safeSesErrorCode, sendSesEmail } from "./ses-email";

const DIGEST_CONCURRENCY = 10;
/** Bug 11 (X30): digest wychodzi w poniedziałek o tej lokalnej godzinie ODBIORCY. */
export const DIGEST_LOCAL_HOUR = 8;

/** Digest korzysta wyłącznie z bazowych danych aktywności. Projekcja chroni
 * przed przypadkowym odczytem HR/kalorii zapisanych w dokumentach legacy. */
export const STRAVA_DIGEST_BASE_FIELDS = [
  "userId",
  "date",
  "type",
  "sportType",
  "distance",
  "movingTime",
  "name",
  "averageSpeed",
] as const;

interface StravaDoc {
  date: string;
  type: string;
  /** X27/WP-C: warianty biegowe (TrailRun/VirtualRun) siedzą w sportType. */
  sportType?: string;
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
  /** Bug 11 (X30): strefa IANA z klienta; brak/nieznana = Europe/Warsaw. */
  timeZone?: string;
}

export interface WeeklyDigestDeps {
  listUsers: () => Promise<DigestUser[]>;
  queryCompletedWorkouts: (startStr: string, endStr: string) => Promise<DigestWorkout[]>;
  /** Z160: pełne dokumenty ukończonych treningów sprzed danej daty (baza PR-ów
   *  i poprzedni tydzień). Koszt: cała historia kolekcji — przy obecnej skali
   *  userów akceptowalne; przy wzroście → per-user limit albo agregaty. */
  queryWorkoutHistory: (beforeStr: string) => Promise<DigestWorkout[]>;
  queryStravaActivities: (startStr: string, endStr: string) => Promise<Array<StravaDoc & { userId: string }>>;
  sendEmail: (to: string, subject: string, html: string) => Promise<{
    transport?: "ses";
    sesMessageId?: string;
    error?: { message: string };
  }>;
  /** B-T6: producent zdarzenia inboxa "raport tygodnia gotowy" (user_events).
   *  Idempotentny: create pod deterministycznym id, ALREADY_EXISTS połykane. */
  writeUserEvent?: (uid: string, event: {
    type: string;
    key: string;
    payload: Record<string, string | number | boolean | null>;
    deepLink: string | null;
  }) => Promise<void>;
  /** T21b: rejestr wysyłek email_log (best-effort, wpis per odbiorca). */
  logEmail?: (entry: EmailLogWrite, html?: string) => Promise<void>;
  now?: () => Date;
}

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

// X27/WP-C: run-like jak w src/lib/strava-utils.isRunLike (functions nie
// importują z src/, stąd lokalna kopia semantyki: Run || sportType z "Run").
const isRunLikeDoc = (a: StravaDoc): boolean =>
  a.type === "Run" || (a.sportType?.includes("Run") ?? false);

// Export dla testów jednostkowych (X27/WP-C) — produkcyjnie woła go tylko digest.
export const buildStravaSummary = (activities: StravaDoc[]): DigestStrava | null => {
  const runs = activities.filter(isRunLikeDoc);
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
  const now = deps.now ? deps.now() : new Date();

  const recipients = (await deps.listUsers()).filter((user) => {
    if (!user.email) return false;
    // Brak pola status (konta sprzed hardeningu) = aktywny; jawnie nieaktywni pomijani.
    if (!(user.status === undefined || user.status === "active")) return false;
    // Opt-out: brak pola = wysyłaj.
    if (user.notificationPrefs?.weeklyDigest === false) return false;
    // Bug 11 (X30): poniedziałek 08:00 W STREFIE ODBIORCY (bieg co godzinę).
    // Wcześniej jeden bieg o 08:00 Warszawy = niedziela wieczór na zachodzie
    // USA, digest wychodził przed końcem weekendu odbiorcy.
    const local = localDayParts(now, user.timeZone);
    return local.weekday === "monday" && local.hour === DIGEST_LOCAL_HOUR;
  });

  if (recipients.length === 0) {
    // Kwerendy zbiorcze (cała historia workouts) tylko, gdy ktoś ma teraz poranek.
    logger.info("[WeeklyDigest] Nobody at local Monday morning, skipping.");
    return { processed: 0, sent: 0, failed: 0 };
  }

  // Zakres: poprzedni poniedziałek-niedziela W DACIE LOKALNEJ odbiorców. Wszyscy
  // odbiorcy jednego biegu mają tę samą lokalną datę (poniedziałek 08:xx tej
  // samej chwili), więc okno liczymy raz. workouts.date klient pisze lokalnie.
  const mondayStr = localDayParts(now, recipients[0].timeZone).dateStr;
  const startStr = shiftDateStr(mondayStr, -7);
  const endStr = shiftDateStr(mondayStr, -1);
  // Poprzedni tydzień (do porównania WoW) wycinamy z kwerendy historii — bez
  // trzeciej kwerendy zbiorczej.
  const prevStartStr = shiftDateStr(mondayStr, -14);
  const prevEndStr = shiftDateStr(mondayStr, -8);
  // Etykieta zakresu: daty w południe UTC + format w UTC, niezależnie od strefy serwera.
  const lastMonday = new Date(`${startStr}T12:00:00Z`);
  const lastSunday = new Date(`${endStr}T12:00:00Z`);

  logger.info(`[WeeklyDigest] Period: ${startStr} - ${endStr}`);

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
      const workouts = selectCompletedDigestWorkouts(workoutsByUser.get(user.uid) ?? []);
      if (workouts.length === 0) {
        return;
      }

      const lang = userLang(user);
      const unit = userUnit(user);
      const history = selectCompletedDigestWorkouts(historyByUser.get(user.uid) ?? []);
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
          // X29: lista tygodni, nie tab summary.
          deepLink: "/analytics?tab=weekly",
        });
      }

      const locale = lang === "en" ? "en-US" : "pl-PL";
      const rangeLabel = `${lastMonday.toLocaleDateString(locale, { day: "numeric", month: "long", timeZone: "UTC" })} - ${lastSunday.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}`;

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

      const response = await deps.sendEmail(user.email, subject, html);
      // T21b: wpis do email_log po każdej próbie (udanej i nieudanej);
      // awaria rejestru nie może zabrać digestu pozostałym odbiorcom.
      if (deps.logEmail) {
        try {
          await deps.logEmail({
            uid: user.uid,
            to: user.email,
            type: "weekly_digest",
            subject,
            transport: "ses",
            ...(response.sesMessageId ? { sesMessageId: response.sesMessageId } : {}),
            status: response.error ? "failed" : "sent",
            ...(response.error ? { error: response.error.message } : {}),
            sentAt: new Date().toISOString(),
            lang,
          }, html);
        } catch (error) {
          logger.error(`[WeeklyDigest] email_log write failed for ${user.email}`, error);
        }
      }
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
    // Bug 11 (X30): poniedziałek 08:00 lokalnie mieści się między niedzielą
    // 18:00Z (UTC+14) a poniedziałkiem 18:00Z (UTC-10) — bieg co godzinę
    // w te dwa dni, runWeeklyDigest filtruje odbiorców po ich strefie i bez
    // odbiorców kończy przed kwerendami zbiorczymi.
    schedule: "0 * * * 0,1",
    timeZone: "UTC",
    timeoutSeconds: 300,
    secrets: [...SES_EMAIL_SECRETS],
  },
  async () => {
    const db = admin.firestore();
    logger.info("[WeeklyDigest] Starting...");

    await runWeeklyDigest(buildWeeklyDigestDeps(db));
  },
);

// Z160: deps wyciągnięte do funkcji, żeby ręczny trigger testowy (sendTestDigest)
// używał DOKŁADNIE tej samej ścieżki co poniedziałkowy harmonogram.
export function buildWeeklyDigestDeps(
  db: FirebaseFirestore.Firestore,
  emailSender: typeof sendSesEmail = sendSesEmail,
): WeeklyDigestDeps {
  return {
    listUsers: async () => {
      // Paginacja po kolekcji users (1 read/user) zamiast listUsers z Auth —
      // profil niesie status, notificationPrefs, język i jednostki.
      const users: DigestUser[] = [];
      let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
      for (;;) {
        let query = db.collection("users")
          .select("email", "status", "notificationPrefs", "language", "displayName", "preferences", "timeZone")
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
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DigestWorkout));
    },
    queryWorkoutHistory: async (beforeStr) => {
      // Koszt świadomy (Z160): pełne dokumenty CAŁEJ historii ukończonych treningów.
      // Przy obecnej skali userów to akceptowalne; przy wzroście — limit per user
      // albo agregaty tygodniowe.
      const snapshot = await db.collection("workouts")
        .where("completed", "==", true)
        .where("date", "<", beforeStr)
        .get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DigestWorkout));
    },
    queryStravaActivities: async (startStr, endStr) => {
      const snapshot = await db.collection("strava_activities")
        .where("date", ">=", startStr)
        .where("date", "<=", endStr)
        .select(...STRAVA_DIGEST_BASE_FIELDS)
        .get();
      return snapshot.docs.map((doc) => doc.data() as StravaDoc & { userId: string });
    },
    sendEmail: async (to, subject, html) => {
      try {
        return await emailSender({ to, subject, html });
      } catch (error) {
        return {
          transport: "ses",
          error: { message: safeSesErrorCode(error) },
        };
      }
    },
    // T21b: rejestr wysyłek widoczny w panelu admina (sekcja Maile).
    logEmail: (entry, html) => writeEmailLog(db, entry, html),
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
