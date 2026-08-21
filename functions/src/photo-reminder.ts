import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { forEachWithConcurrency } from "./bounded-concurrency";
import { getInvalidFcmTokens, type ReminderUser } from "./daily-reminder";

// WP-D D4: po miesiącu od PIERWSZEGO ukończonego treningu jednorazowe
// przypomnienie "dodaj fotkę sylwetki i zrób before/after". Kanały:
// push (jeśli tokeny + zgoda dailyReminder) oraz ZAWSZE dzwonek in-app
// (user_events, typ announcement, deterministyczny id = max raz).
// Znacznik users/{uid}.photoReminderSentAt pisze WYŁĄCZNIE ta funkcja
// (Admin SDK) — rules klienta go nie znają i znać nie muszą.
// Wzorzec reduced-mode-push: DI-testowalny rdzeń + wrapper onSchedule.

const FCM_TOKEN_REGISTRATIONS_COLLECTION = "fcm_token_registrations";
const CANDIDATE_CONCURRENCY = 5;

export const PHOTO_REMINDER_AFTER_DAYS = 30;
export const PHOTO_REMINDER_EVENT_KEY = "photo-reminder";

type DeliveryResponse = { success: boolean; error?: { code?: string } };

export interface PhotoReminderUser extends ReminderUser {
  /** ISO data wysłanego przypomnienia — obecność = nigdy więcej. */
  photoReminderSentAt?: string;
}

export interface PhotoReminderTexts {
  title: { pl: string; en: string };
  body: { pl: string; en: string };
}

export const PHOTO_REMINDER_TEXTS: PhotoReminderTexts = {
  title: { pl: "Miesiąc treningów za Tobą", en: "One month of training done" },
  body: {
    pl: "Dodaj zdjęcie sylwetki i zobacz swoje before/after w Pomiarach.",
    en: "Add a progress photo and see your before/after in Measurements.",
  },
};

export interface PhotoReminderUserEvent {
  type: "announcement";
  key: string;
  payload: { title: string; body: string };
  deepLink: string | null;
}

export interface PhotoReminderDeps {
  /** Aktywni userzy bez znacznika photoReminderSentAt (filtr defensywnie powtórzony w rdzeniu). */
  listCandidates: () => Promise<Array<{ uid: string; user: PhotoReminderUser }>>;
  /** Data (YYYY-MM-DD) pierwszego UKOŃCZONEGO treningu; null = brak. */
  getFirstWorkoutDate: (uid: string) => Promise<string | null>;
  /** Czy user ma już jakiekolwiek zdjęcie sylwetki w pomiarach. */
  hasBodyPhoto: (uid: string) => Promise<boolean>;
  listTokenRegistrations: () => Promise<Array<{ id: string; userId: string; token: string }>>;
  sendMulticast: (tokens: string[], title: string, body: string) => Promise<{
    successCount: number;
    failureCount: number;
    responses: DeliveryResponse[];
  }>;
  deleteRegistrations: (registrationIds: string[]) => Promise<void>;
  /** Idempotentny create user_events (deterministyczny id, already-exists połknięty). */
  writeUserEvent: (uid: string, event: PhotoReminderUserEvent) => Promise<void>;
  markReminderSent: (uid: string, sentAtISO: string) => Promise<void>;
  /** Dzisiejsza data YYYY-MM-DD. */
  today: () => string;
}

/** Data `days` dni przed `todayISO` (YYYY-MM-DD, arytmetyka UTC). */
const dateDaysBefore = (todayISO: string, days: number): string => {
  const date = new Date(`${todayISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};

export async function runPhotoReminder(
  deps: PhotoReminderDeps,
  texts: PhotoReminderTexts = PHOTO_REMINDER_TEXTS,
): Promise<{
  candidates: number;
  eligible: number;
  sent: number;
  failed: number;
  invalidTokens: number;
}> {
  let eligible = 0;
  let sent = 0;
  let failed = 0;
  let invalidTokens = 0;

  const candidates = await deps.listCandidates();
  if (candidates.length === 0) {
    return { candidates: 0, eligible, sent, failed, invalidTokens };
  }

  const todayISO = deps.today();
  const cutoff = dateDaysBefore(todayISO, PHOTO_REMINDER_AFTER_DAYS);

  const registrations = (await deps.listTokenRegistrations())
    .filter((registration) => !!registration.token && !!registration.userId);
  const byUser = new Map<string, Array<{ id: string; token: string }>>();
  registrations.forEach((registration) => {
    const list = byUser.get(registration.userId) ?? [];
    list.push({ id: registration.id, token: registration.token });
    byUser.set(registration.userId, list);
  });

  const processCandidate = async ({ uid, user }: { uid: string; user: PhotoReminderUser }) => {
    // Defensywne powtórzenie warunków kwalifikacji (deps mogą być luźniejsze).
    if (user.photoReminderSentAt) return;
    if (user.status !== "active") return;
    if (user.access?.enabled === false) return;

    const firstWorkout = await deps.getFirstWorkoutDate(uid);
    // Kwalifikacja: pierwszy ukończony trening >= 30 dni temu (first <= cutoff).
    if (!firstWorkout || firstWorkout > cutoff) return;
    if (await deps.hasBodyPhoto(uid)) return;

    eligible += 1;
    const lang = user.language === "en" ? "en" : "pl";
    const title = texts.title[lang];
    const body = texts.body[lang];

    // 1. Dzwonek in-app (gwarantowany kanał). Błąd = bez znacznika, retry jutro
    //    (create pod deterministycznym id jest idempotentny, nie zdubluje).
    try {
      await deps.writeUserEvent(uid, {
        type: "announcement",
        key: PHOTO_REMINDER_EVENT_KEY,
        payload: { title, body },
        deepLink: "/measurements",
      });
    } catch (e) {
      logger.error(`[photoReminder] user event write failed for ${uid}`, e);
      return;
    }

    // 2. Znacznik PRZED pushem — gwarancja "maksymalnie raz" dla pusha.
    try {
      await deps.markReminderSent(uid, todayISO);
    } catch (e) {
      logger.error(`[photoReminder] marker write failed for ${uid}`, e);
      return;
    }

    // 3. Push: tylko z tokenami i zgodą (dailyReminder = zbiorcza zgoda na
    //    przypomnienia treningowe, wzorzec reduced-mode-push).
    if (user.notificationPrefs?.dailyReminder === false) return;
    const userRegistrations = byUser.get(uid) ?? [];
    if (userRegistrations.length === 0) return;
    const tokens = userRegistrations.map((registration) => registration.token);

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
      logger.error(`[photoReminder] push send failed for ${uid}`, e);
    }
  };

  await forEachWithConcurrency(candidates, CANDIDATE_CONCURRENCY, processCandidate);

  return { candidates: candidates.length, eligible, sent, failed, invalidTokens };
}

export const photoReminder = onSchedule(
  {
    schedule: "every day 10:00",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 300,
  },
  async () => {
    const db = admin.firestore();
    const todayDate = new Date().toISOString().slice(0, 10);
    logger.info(`[photoReminder] start, data: ${todayDate}`);

    const result = await runPhotoReminder({
      listCandidates: async () => {
        // Firestore nie umie "pole nie istnieje" w where — filtr w pamięci
        // (baza userów jest mała; wzorzec zaakceptowany w planie WP-D).
        const snap = await db.collection("users").where("status", "==", "active").get();
        return snap.docs
          .map((doc) => ({ uid: doc.id, user: doc.data() as PhotoReminderUser }))
          .filter(({ user }) => !user.photoReminderSentAt);
      },
      getFirstWorkoutDate: async (uid) => {
        // Źródło 1: agregat all-time (Z217) — liczy WYŁĄCZNIE ukończone treningi,
        // 1 odczyt dokumentu, zero query. Agregat istnieje = jego wynik jest
        // rozstrzygający (null w totals = brak ukończonych treningów).
        const aggSnap = await db.collection("users").doc(uid)
          .collection("aggregates").doc("allTime").get();
        if (aggSnap.exists) {
          const first = (aggSnap.data()?.totals as { firstWorkoutDate?: unknown } | undefined)
            ?.firstWorkoutDate;
          return typeof first === "string" && first.length === 10 ? first : null;
        }
        // Fallback (brak agregatu): najstarszy workout po istniejącym indeksie
        // userId ASC + date ASC (żadnych NOWYCH composite indeksów — lekcja X12).
        const snap = await db.collection("workouts")
          .where("userId", "==", uid)
          .orderBy("date", "asc")
          .limit(1)
          .get();
        const date = snap.docs[0]?.data()?.date;
        return typeof date === "string" && date.length === 10 ? date : null;
      },
      hasBodyPhoto: async (uid) => {
        // Bez nierówności na photoUrl (wymagałaby indeksu) — pobierz do 20
        // pomiarów i sprawdź w pamięci (wzorzec z planu WP-D).
        const snap = await db.collection("measurements")
          .where("userId", "==", uid)
          .limit(20)
          .get();
        return snap.docs.some((doc) => {
          const url = doc.data()?.photoUrl;
          return typeof url === "string" && url.length > 0;
        });
      },
      listTokenRegistrations: async () => {
        const snap = await db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).get();
        return snap.docs.map((doc) => ({
          id: doc.id,
          userId: String(doc.data().userId ?? ""),
          token: typeof doc.data().token === "string" ? doc.data().token as string : "",
        }));
      },
      sendMulticast: (tokens, title, body) => admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: { type: "photo-reminder" },
        apns: { payload: { aps: { sound: "default" } } },
      }),
      deleteRegistrations: async (registrationIds) => {
        await Promise.all(registrationIds.map((id) => (
          db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION).doc(id).delete()
        )));
      },
      writeUserEvent: async (uid, event) => {
        // create (nie set) pod deterministycznym id — retry dostaje
        // ALREADY_EXISTS i zostawia oryginał (wzór weekly-digest B-T6).
        try {
          await db.collection("user_events").doc(`${uid}-${event.key}`).create({
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
      markReminderSent: async (uid, sentAtISO) => {
        await db.collection("users").doc(uid).update({ photoReminderSentAt: sentAtISO });
      },
      today: () => new Date().toISOString().slice(0, 10),
    });

    logger.info("[photoReminder] done", result);
  },
);
