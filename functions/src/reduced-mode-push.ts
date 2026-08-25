import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { forEachWithConcurrency } from "./bounded-concurrency";
import { getInvalidFcmTokens, type ReminderUser } from "./daily-reminder";

// Push przed koncem trybu "nie na 100%" (Runna pakiet 1, spec C3): wieczorem
// w OSTATNIM dniu trybu przypominamy, ze od jutra wracamy stopniowo (rampa
// 85% -> 92% -> 100%). Wzorzec dailyReminder: DI-testowalny rdzen + wrapper
// onSchedule, iteracja po posiadaczach tokenow, sprzatanie martwych tokenow.

const FCM_TOKEN_REGISTRATIONS_COLLECTION = "fcm_token_registrations";
const PUSH_CONCURRENCY = 10;

type DeliveryResponse = { success: boolean; error?: { code?: string } };

export interface ReducedModePushDeps {
  listTokenRegistrations: () => Promise<Array<{ id: string; userId: string; token: string }>>;
  /** Ids userow, ktorych reducedMode.endDate == dzis. */
  getUsersWithModeEndingToday: () => Promise<string[]>;
  getUsers: (userIds: string[]) => Promise<Map<string, ReminderUser>>;
  sendMulticast: (tokens: string[], title: string, body: string) => Promise<{
    successCount: number;
    failureCount: number;
    responses: DeliveryResponse[];
  }>;
  deleteRegistrations: (registrationIds: string[]) => Promise<void>;
}

export interface ModeEndingTexts {
  title: { pl: string; en: string };
  body: { pl: string; en: string };
}

const REDUCED_MODE_TEXTS: ModeEndingTexts = {
  title: { pl: "Tryb lżejszy kończy się dziś 🔄", en: "Easy mode ends today 🔄" },
  body: {
    pl: "Od jutra wracamy stopniowo: najpierw ~85%, potem ~92%, potem pełna moc.",
    en: "From tomorrow we ramp back up: ~85%, then ~92%, then full power.",
  },
};

export const VACATION_TEXTS: ModeEndingTexts = {
  title: { pl: "Urlop kończy się dziś 🏋️", en: "Vacation ends today 🏋️" },
  body: {
    pl: "Witaj z powrotem! Wracamy stopniowo: ~85%, potem ~92%, potem pełna moc.",
    en: "Welcome back! We ramp up gradually: ~85%, then ~92%, then full power.",
  },
};

export async function runReducedModeEndingPush(
  deps: ReducedModePushDeps,
  texts: ModeEndingTexts = REDUCED_MODE_TEXTS,
): Promise<{
  candidates: number;
  sent: number;
  failed: number;
  invalidTokens: number;
}> {
  let candidates = 0;
  let sent = 0;
  let failed = 0;
  let invalidTokens = 0;

  const endingToday = new Set(await deps.getUsersWithModeEndingToday());
  if (endingToday.size === 0) return { candidates, sent, failed, invalidTokens };

  const registrations = (await deps.listTokenRegistrations())
    .filter((registration) => !!registration.token && !!registration.userId && endingToday.has(registration.userId));
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
    // X35c (WP-E): własny przełącznik modeEnding (koniec urlopu / trybu lżejszego).
    if (user.notificationPrefs?.modeEnding === false) return false;
    if (user.access?.enabled === false || user.status === "suspended") return false;
    return true;
  });

  const processUser = async (uid: string) => {
    const user = users.get(uid);
    if (!user) return;
    candidates += 1;

    const userRegistrations = byUser.get(uid) ?? [];
    const tokens = userRegistrations.map((registration) => registration.token);
    const lang = user.language === "en" ? "en" : "pl";
    const title = texts.title[lang];
    const body = texts.body[lang];

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
      logger.error(`[reducedModePush] send failed for ${uid}`, e);
    }
  };

  await forEachWithConcurrency(eligibleUserIds, PUSH_CONCURRENCY, processUser);

  return { candidates, sent, failed, invalidTokens };
}

// Push konca urlopu (spec C4): ten sam rdzen, inna kwerenda i tresc.
export const vacationEndingPush = onSchedule(
  {
    schedule: "every day 18:10",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 300,
  },
  async () => {
    const db = admin.firestore();
    const todayDate = new Date().toISOString().slice(0, 10);
    logger.info(`[vacationPush] start, data: ${todayDate}`);

    const result = await runReducedModeEndingPush({
      getUsersWithModeEndingToday: async () => {
        const snap = await db.collection("training_plans")
          .where("vacation.endDate", "==", todayDate)
          .get();
        return snap.docs.map((doc) => doc.id);
      },
      listTokenRegistrations: async () => {
        const snap = await db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).get();
        return snap.docs.map((doc) => ({
          id: doc.id,
          userId: String(doc.data().userId ?? ""),
          token: typeof doc.data().token === "string" ? doc.data().token as string : "",
        }));
      },
      getUsers: async (userIds) => {
        const snapshots: admin.firestore.DocumentSnapshot[] = [];
        for (let i = 0; i < userIds.length; i += 300) {
          snapshots.push(...await db.getAll(...userIds.slice(i, i + 300).map((uid) => db.collection("users").doc(uid))));
        }
        return new Map(snapshots
          .filter((snap) => snap.exists)
          .map((snap) => [snap.id, snap.data() as ReminderUser]));
      },
      sendMulticast: (tokens, title, body) => admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: { type: "vacation-ending" },
        apns: { payload: { aps: { sound: "default" } } },
      }),
      deleteRegistrations: async (registrationIds) => {
        await Promise.all(registrationIds.map((id) => (
          db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).doc(id).delete()
        )));
      },
    }, VACATION_TEXTS);

    logger.info("[vacationPush] done", result);
  },
);

export const reducedModeEndingPush = onSchedule(
  {
    schedule: "every day 18:00",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 300,
  },
  async () => {
    const db = admin.firestore();
    // 18:00 Warsaw = 16:00/17:00 UTC, ten sam dzien kalendarzowy.
    const todayDate = new Date().toISOString().slice(0, 10);
    logger.info(`[reducedModePush] start, data: ${todayDate}`);

    const result = await runReducedModeEndingPush({
      getUsersWithModeEndingToday: async () => {
        const snap = await db.collection("training_plans")
          .where("reducedMode.endDate", "==", todayDate)
          .get();
        return snap.docs.map((doc) => doc.id);
      },
      listTokenRegistrations: async () => {
        const snap = await db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).get();
        return snap.docs.map((doc) => ({
          id: doc.id,
          userId: String(doc.data().userId ?? ""),
          token: typeof doc.data().token === "string" ? doc.data().token as string : "",
        }));
      },
      getUsers: async (userIds) => {
        const snapshots: admin.firestore.DocumentSnapshot[] = [];
        for (let i = 0; i < userIds.length; i += 300) {
          snapshots.push(...await db.getAll(...userIds.slice(i, i + 300).map((uid) => db.collection("users").doc(uid))));
        }
        return new Map(snapshots
          .filter((snap) => snap.exists)
          .map((snap) => [snap.id, snap.data() as ReminderUser]));
      },
      sendMulticast: (tokens, title, body) => admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: { type: "reduced-mode-ending" },
        apns: { payload: { aps: { sound: "default" } } },
      }),
      deleteRegistrations: async (registrationIds) => {
        await Promise.all(registrationIds.map((id) => (
          db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).doc(id).delete()
        )));
      },
    });

    logger.info("[reducedModePush] done", result);
  },
);
