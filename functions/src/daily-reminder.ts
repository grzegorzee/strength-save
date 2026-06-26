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
const USER_PAGE_SIZE = 100;
const REMINDER_CONCURRENCY = 10;

export const getInvalidFcmTokens = (tokens: string[], responses: DeliveryResponse[]): string[] => (
  responses.flatMap((response, index) => (
    !response.success && response.error?.code && INVALID_TOKEN_CODES.has(response.error.code)
      ? [tokens[index]]
      : []
  ))
);

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

    let candidates = 0;
    let sent = 0;
    let failed = 0;
    let invalidTokens = 0;

    const processUser = async (doc: admin.firestore.QueryDocumentSnapshot) => {
      const u = doc.data() as {
        displayName?: string;
        status?: string;
        access?: { enabled?: boolean };
        notificationPrefs?: { dailyReminder?: boolean };
      };

      if (u.notificationPrefs?.dailyReminder === false) return;
      if (u.access?.enabled === false || u.status === "suspended") return;
      const registrationSnap = await db.collection(FCM_TOKEN_REGISTRATIONS_COLLECTION)
        .where("userId", "==", doc.id).get();
      const tokens = registrationSnap.docs
        .map((registration) => registration.data().token)
        .filter((token): token is string => typeof token === "string" && !!token);
      if (tokens.length === 0) return;

      const planSnap = await db.collection("training_plans").doc(doc.id).get();
      const days: PlanDay[] = planSnap.exists ? ((planSnap.data()?.days as PlanDay[]) || []) : [];
      const todayDay = days.find((d) => d.weekday === today);
      if (!todayDay) return; // dziś dzień wolny — nie przypominamy

      candidates += 1;

      const firstName = (u.displayName || "").trim().split(" ")[0];
      const focus = todayDay.focus || todayDay.dayName || "trening";
      const title = firstName ? `Cześć ${firstName}! Czas na trening 💪` : "Czas na trening 💪";
      const body = `Dziś w planie: ${focus}. Wejdź i odhacz pierwszą serię.`;

      try {
        for (let index = 0; index < tokens.length; index += 500) {
          const tokenBatch = tokens.slice(index, index + 500);
          const res = await admin.messaging().sendEachForMulticast({
            tokens: tokenBatch,
            notification: { title, body },
            apns: { payload: { aps: { sound: "default" } } },
          });
          sent += res.successCount;
          failed += res.failureCount;

          const invalid = getInvalidFcmTokens(tokenBatch, res.responses);
          if (invalid.length > 0) {
            invalidTokens += invalid.length;
            const deletes = registrationSnap.docs
              .filter((registration) => invalid.includes(registration.data().token))
              .map((registration) => registration.ref.delete());
            await Promise.all(deletes);
          }
        }
      } catch (e) {
        logger.error(`[dailyReminder] send failed for ${doc.id}`, e);
      }
    };

    let last: admin.firestore.QueryDocumentSnapshot | undefined;
    do {
      let usersQuery = db.collection("users").orderBy(admin.firestore.FieldPath.documentId()).limit(USER_PAGE_SIZE);
      if (last) usersQuery = usersQuery.startAfter(last);
      const usersSnap = await usersQuery.get();
      if (usersSnap.empty) break;
      await forEachWithConcurrency(usersSnap.docs, REMINDER_CONCURRENCY, processUser);
      last = usersSnap.docs[usersSnap.docs.length - 1];
    } while (last);

    logger.info("[dailyReminder] done", { candidates, sent, failed, invalidTokens });
  },
);
