import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Codzienne poranne przypomnienie o treningu (push). Spersonalizowane: imię + dzisiejszy focus.
// Wysyłamy TYLKO gdy: user ma token, nie wyłączył przypomnień, ma dostęp i dziś jest dzień treningowy.

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface PlanDay { weekday?: string; focus?: string; dayName?: string }

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

    const usersSnap = await db.collection("users").get();
    let sent = 0;

    for (const doc of usersSnap.docs) {
      const u = doc.data() as {
        displayName?: string;
        fcmTokens?: unknown;
        status?: string;
        access?: { enabled?: boolean };
        notificationPrefs?: { dailyReminder?: boolean };
      };

      if (u.notificationPrefs?.dailyReminder === false) continue;
      if (u.access?.enabled === false || u.status === "suspended") continue;
      const tokens = Array.isArray(u.fcmTokens)
        ? u.fcmTokens.filter((t): t is string => typeof t === "string" && !!t)
        : [];
      if (tokens.length === 0) continue;

      const planSnap = await db.collection("training_plans").doc(doc.id).get();
      const days: PlanDay[] = planSnap.exists ? ((planSnap.data()?.days as PlanDay[]) || []) : [];
      const todayDay = days.find((d) => d.weekday === today);
      if (!todayDay) continue; // dziś dzień wolny — nie przypominamy

      const firstName = (u.displayName || "").trim().split(" ")[0];
      const focus = todayDay.focus || todayDay.dayName || "trening";
      const title = firstName ? `Cześć ${firstName}! Czas na trening 💪` : "Czas na trening 💪";
      const body = `Dziś w planie: ${focus}. Wejdź i odhacz pierwszą serię.`;

      try {
        const res = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body } });
        sent += res.successCount;
      } catch (e) {
        logger.error(`[dailyReminder] send failed for ${doc.id}`, e);
      }
    }

    logger.info(`[dailyReminder] done, wysłano ${sent} powiadomień`);
  },
);
