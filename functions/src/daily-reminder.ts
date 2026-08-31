import { onSchedule } from "firebase-functions/v2/scheduler";
import { localizeFocusEn } from "./focus-en";
import type { Lang } from "./email-templates";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { forEachWithConcurrency } from "./bounded-concurrency";
import { localDayParts } from "./local-time";
import { resolvePlannedDayForDate, type ScheduleOverrides } from "./plan-day-resolver";

// Codzienne poranne przypomnienie o treningu (push). Spersonalizowane: imię + dzisiejszy focus.
// Wysyłamy TYLKO gdy: user ma token, nie wyłączył przypomnień, ma dostęp i dziś jest dzień treningowy.
//
// Bug 11 (X30): bieg CO GODZINĘ (UTC), a "dziś" i pora liczone PER USER z jego
// strefy (users/{uid}.timeZone, brak = Warszawa). Wcześniej jeden bieg o 07:00
// Warszawy z dniem z zegara serwera: zachód USA dostawał push o 22:00 z planem
// JUTRZEJSZEGO dnia, wschód budził się o 01:00-02:00.

/** Lokalna godzina, o której user dostaje poranny push. */
export const REMINDER_LOCAL_HOUR = 7;

interface PlanDay { id?: string; weekday?: string; focus?: string; dayName?: string }
export interface ReminderPlan {
  days: PlanDay[];
  startDate?: string;
  skippedDates?: string[];
  scheduleOverrides?: ScheduleOverrides;
  status?: string;
}

type DeliveryResponse = { success: boolean; error?: { code?: string } };

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);
const FCM_TOKEN_REGISTRATIONS_COLLECTION = "fcm_token_registrations";
const REMINDER_CONCURRENCY = 10;

export const getInvalidFcmTokens = (tokens: string[], responses: DeliveryResponse[]): string[] => (
  responses.flatMap((response, index) => (
    !response.success && response.error?.code && INVALID_TOKEN_CODES.has(response.error.code)
      ? [tokens[index]]
      : []
  ))
);

// R2-12: iterujemy po fcm_token_registrations (posiadacze tokenów), nie po CAŁEJ
// kolekcji users — koszt O(userów z tokenem), a nie O(wszystkich kont).
// Zależności wstrzykiwane, żeby logika była testowalna bez emulatora.
export interface ReminderUser {
  displayName?: string;
  /** Z167: język UI usera — push idzie w jego języku (brak pola = PL). */
  language?: string;
  /** Bug 11 (X30): strefa IANA z klienta; brak/nieznana = Europe/Warsaw. */
  timeZone?: string;
  status?: string;
  access?: { enabled?: boolean };
  /** X35c (WP-E): osobny przełącznik per typ; brak pola = włączone. */
  notificationPrefs?: {
    dailyReminder?: boolean;
    weeklyDigest?: boolean;
    photoReminder?: boolean;
    modeEnding?: boolean;
    prPush?: boolean;
    announcements?: boolean;
  };
}

export interface DailyReminderDeps {
  listTokenRegistrations: () => Promise<Array<{ id: string; userId: string; token: string }>>;
  getUsers: (userIds: string[]) => Promise<Map<string, ReminderUser>>;
  /** Tablica = zgodność testów/legacy; produkcja zawsze zwraca pełny dokument. */
  getPlanDays: (userIds: string[]) => Promise<Map<string, PlanDay[] | ReminderPlan>>;
  sendMulticast: (tokens: string[], title: string, body: string) => Promise<{
    successCount: number;
    failureCount: number;
    responses: DeliveryResponse[];
  }>;
  deleteRegistrations: (registrationIds: string[]) => Promise<void>;
  /** Z146: dzisiejszy trening usera (1 query per KANDYDAT, nie per user) — null gdy brak.
   *  Bug 11: data lokalna usera (workouts.date klient pisze w swojej strefie). */
  getTodayWorkout: (userId: string, todayDate: string) => Promise<{ startedAt?: number; completed?: boolean } | null>;
  /** Chwila biegu; "dziś" i pora wychodzą z niej PER USER (strefa usera). */
  now: Date;
}

export async function runDailyReminder(deps: DailyReminderDeps): Promise<{
  candidates: number;
  sent: number;
  failed: number;
  invalidTokens: number;
  skippedActive: number;
}> {
  let candidates = 0;
  let sent = 0;
  let failed = 0;
  let invalidTokens = 0;
  let skippedActive = 0;

  const registrations = (await deps.listTokenRegistrations())
    .filter((registration) => !!registration.token && !!registration.userId);
  const byUser = new Map<string, Array<{ id: string; token: string }>>();
  registrations.forEach((registration) => {
    const list = byUser.get(registration.userId) ?? [];
    list.push({ id: registration.id, token: registration.token });
    byUser.set(registration.userId, list);
  });

  const users = await deps.getUsers([...byUser.keys()]);
  const eligibleUserIds = [...byUser.keys()].filter((uid) => {
    const user = users.get(uid);
    if (!user) return false;
    if (user.notificationPrefs?.dailyReminder === false) return false;
    if (user.access?.enabled === false || user.status === "suspended") return false;
    // Bug 11: tylko userzy, u których lokalnie jest właśnie pora poranna.
    return localDayParts(deps.now, user.timeZone).hour === REMINDER_LOCAL_HOUR;
  });

  const plans = await deps.getPlanDays(eligibleUserIds);

  const processUser = async (uid: string) => {
    const user = users.get(uid);
    if (!user) return;
    const rawPlan = plans.get(uid);
    const plan: ReminderPlan = Array.isArray(rawPlan) ? { days: rawPlan } : (rawPlan ?? { days: [] });
    const local = localDayParts(deps.now, user.timeZone);
    if (plan.status === "ended" || plan.skippedDates?.includes(local.dateStr)) return;
    const todayDay = resolvePlannedDayForDate(
      local.dateStr,
      plan.days,
      plan.scheduleOverrides,
      plan.startDate,
    );
    if (!todayDay) return; // dziś dzień wolny — nie przypominamy

    candidates += 1;

    // Z146/Z155: dokument workouts na dziś powstaje wyłącznie po starcie treningu,
    // więc samo jego istnienie znaczy "user już dziś zaczął albo skończył" — nie
    // spamujemy. (Guard X18C sprawdzał startedAt, którego klient nie wysyłał przed
    // finalnym synciem — push przychodził W TRAKCIE treningu.)
    // Świadome ograniczenie: draft offline (IndexedDB) jest niewidoczny dla backendu,
    // więc trening rozpoczęty offline bez syncu nadal dostanie push — akceptowalne,
    // autosave syncuje przy pierwszym zapisie online.
    const todayWorkout = await deps.getTodayWorkout(uid, local.dateStr);
    if (todayWorkout) {
      skippedActive += 1;
      return;
    }

    const userRegistrations = byUser.get(uid) ?? [];
    const tokens = userRegistrations.map((registration) => registration.token);
    const firstName = (user.displayName || "").trim().split(" ")[0];
    const lang: Lang = user.language === "en" ? "en" : "pl";
    const focusRaw = todayDay.focus || todayDay.dayName || (lang === "en" ? "training" : "trening");
    const focus = lang === "en" ? localizeFocusEn(focusRaw) : focusRaw;
    const title = lang === "en"
      ? (firstName ? `Hey ${firstName}! Time to train` : "Time to train")
      : (firstName ? `Cześć ${firstName}! Czas na trening` : "Czas na trening");
    const body = lang === "en"
      ? `Today's plan: ${focus}. Open the app and log your first set.`
      : `Dziś w planie: ${focus}. Wejdź i odhacz pierwszą serię.`;

    try {
      for (let index = 0; index < tokens.length; index += 500) {
        const tokenBatch = tokens.slice(index, index + 500);
        const res = await deps.sendMulticast(tokenBatch, title, body);
        sent += res.successCount;
        failed += res.failureCount;

        const invalid = getInvalidFcmTokens(tokenBatch, res.responses);
        if (invalid.length > 0) {
          invalidTokens += invalid.length;
          const invalidIds = userRegistrations
            .filter((registration) => invalid.includes(registration.token))
            .map((registration) => registration.id);
          await deps.deleteRegistrations(invalidIds);
        }
      }
    } catch (e) {
      logger.error(`[dailyReminder] send failed for ${uid}`, e);
    }
  };

  await forEachWithConcurrency(eligibleUserIds, REMINDER_CONCURRENCY, processUser);

  return { candidates, sent, failed, invalidTokens, skippedActive };
}

export const dailyTrainingReminder = onSchedule(
  {
    // Bug 11 (X30): pełna godzina UTC, co godzinę — każda strefa ma swoje 07:00
    // w innym biegu (runDailyReminder filtruje po lokalnej godzinie usera).
    schedule: "0 * * * *",
    timeZone: "UTC",
    timeoutSeconds: 300,
  },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    logger.info(`[dailyReminder] start, ${now.toISOString()}`);

    const chunkedGetAll = async (refs: admin.firestore.DocumentReference[]) => {
      const snapshots: admin.firestore.DocumentSnapshot[] = [];
      for (let i = 0; i < refs.length; i += 300) {
        snapshots.push(...await db.getAll(...refs.slice(i, i + 300)));
      }
      return snapshots;
    };

    const result = await runDailyReminder({
      listTokenRegistrations: async () => {
        const snap = await db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).get();
        return snap.docs.map((doc) => ({
          id: doc.id,
          userId: String(doc.data().userId ?? ""),
          token: typeof doc.data().token === "string" ? doc.data().token as string : "",
        }));
      },
      getUsers: async (userIds) => {
        const snapshots = await chunkedGetAll(userIds.map((uid) => db.collection("users").doc(uid)));
        return new Map(snapshots
          .filter((snap) => snap.exists)
          .map((snap) => [snap.id, snap.data() as ReminderUser]));
      },
      getPlanDays: async (userIds) => {
        const snapshots = await chunkedGetAll(userIds.map((uid) => db.collection("training_plans").doc(uid)));
        return new Map(snapshots
          .filter((snap) => snap.exists)
          .map((snap) => {
            const data = snap.data() ?? {};
            const rawOverrides = data.scheduleOverrides;
            return [snap.id, {
              days: Array.isArray(data.days) ? data.days as PlanDay[] : [],
              ...(typeof data.startDate === "string" ? { startDate: data.startDate } : {}),
              ...(Array.isArray(data.skippedDates)
                ? { skippedDates: data.skippedDates.filter((date): date is string => typeof date === "string") }
                : {}),
              ...(rawOverrides && typeof rawOverrides === "object" && !Array.isArray(rawOverrides)
                ? { scheduleOverrides: rawOverrides as ScheduleOverrides }
                : {}),
              ...(typeof data.status === "string" ? { status: data.status } : {}),
            } satisfies ReminderPlan] as [string, ReminderPlan];
          }));
      },
      sendMulticast: (tokens, title, body) => admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        // Z146: typ w payloadzie — klient nie pokazuje toastu dla daily-reminder,
        // gdy user ma aktywną sesję treningową (koniec podwójnego banera).
        data: { type: "daily-reminder" },
        apns: { payload: { aps: { sound: "default" } } },
      }),
      deleteRegistrations: async (registrationIds) => {
        await Promise.all(registrationIds.map((id) => (
          db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).doc(id).delete()
        )));
      },
      getTodayWorkout: async (userId, todayDate) => {
        // Query z composite indexem userId+date (istnieje w firestore.indexes.json).
        const snap = await db.collection("workouts")
          .where("userId", "==", userId)
          .where("date", "==", todayDate)
          .limit(1)
          .get();
        if (snap.empty) return null;
        const data = snap.docs[0].data();
        return {
          ...(data.startedAt !== undefined && { startedAt: Number(data.startedAt) }),
          ...(data.completed !== undefined && { completed: !!data.completed }),
        };
      },
      now,
    });

    logger.info("[dailyReminder] done", result);
  },
);
