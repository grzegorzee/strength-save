import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { forEachWithConcurrency } from "./bounded-concurrency";

// Codzienne poranne przypomnienie o treningu (push). Spersonalizowane: imię + dzisiejszy focus.
// Wysyłamy TYLKO gdy: user ma token, nie wyłączył przypomnień, ma dostęp i dziś jest dzień treningowy.

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface PlanDay { weekday?: string; focus?: string; dayName?: string }

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
  status?: string;
  access?: { enabled?: boolean };
  notificationPrefs?: { dailyReminder?: boolean };
}

export interface DailyReminderDeps {
  listTokenRegistrations: () => Promise<Array<{ id: string; userId: string; token: string }>>;
  getUsers: (userIds: string[]) => Promise<Map<string, ReminderUser>>;
  getPlanDays: (userIds: string[]) => Promise<Map<string, PlanDay[]>>;
  sendMulticast: (tokens: string[], title: string, body: string) => Promise<{
    successCount: number;
    failureCount: number;
    responses: DeliveryResponse[];
  }>;
  deleteRegistrations: (registrationIds: string[]) => Promise<void>;
  today: string;
}

export async function runDailyReminder(deps: DailyReminderDeps): Promise<{
  candidates: number;
  sent: number;
  failed: number;
  invalidTokens: number;
}> {
  let candidates = 0;
  let sent = 0;
  let failed = 0;
  let invalidTokens = 0;

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
    return true;
  });

  const plans = await deps.getPlanDays(eligibleUserIds);

  const processUser = async (uid: string) => {
    const user = users.get(uid);
    if (!user) return;
    const days = plans.get(uid) ?? [];
    const todayDay = days.find((d) => d.weekday === deps.today);
    if (!todayDay) return; // dziś dzień wolny — nie przypominamy

    candidates += 1;

    const userRegistrations = byUser.get(uid) ?? [];
    const tokens = userRegistrations.map((registration) => registration.token);
    const firstName = (user.displayName || "").trim().split(" ")[0];
    const focus = todayDay.focus || todayDay.dayName || "trening";
    const title = firstName ? `Cześć ${firstName}! Czas na trening 💪` : "Czas na trening 💪";
    const body = `Dziś w planie: ${focus}. Wejdź i odhacz pierwszą serię.`;

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

  return { candidates, sent, failed, invalidTokens };
}

export const dailyTrainingReminder = onSchedule(
  {
    schedule: "every day 07:00",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 300,
  },
  async () => {
    const db = admin.firestore();
    // 07:00 Warsaw = 05:00/06:00 UTC, ten sam dzień kalendarzowy → getDay() w UTC daje poprawny dzień tygodnia.
    const today = WEEKDAYS[new Date().getDay()];
    logger.info(`[dailyReminder] start, dzień: ${today}`);

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
          .map((snap) => [snap.id, (snap.data()?.days as PlanDay[]) || []]));
      },
      sendMulticast: (tokens, title, body) => admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        apns: { payload: { aps: { sound: "default" } } },
      }),
      deleteRegistrations: async (registrationIds) => {
        await Promise.all(registrationIds.map((id) => (
          db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).doc(id).delete()
        )));
      },
      today,
    });

    logger.info("[dailyReminder] done", result);
  },
);
