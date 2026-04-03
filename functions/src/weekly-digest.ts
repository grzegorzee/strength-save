import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Resend } from "resend";

const resendApiKey = defineSecret("RESEND_API_KEY");

interface WorkoutDoc {
  userId: string;
  completed: boolean;
  date: string;
  exercises: Array<{
    exerciseId: string;
    sets: Array<{ reps: number; weight: number; completed: boolean; isWarmup?: boolean }>;
  }>;
}

interface StravaDoc {
  date: string;
  type: string;
  distance?: number;
  movingTime?: number;
  name: string;
  averageSpeed?: number;
}

function escapeHtmlStr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function listAllAuthUsers(): Promise<Array<{ uid: string; email: string }>> {
  const users: Array<{ uid: string; email: string }> = [];
  let pageToken: string | undefined;

  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    users.push(
      ...result.users
        .filter(user => user.email)
        .map(user => ({ uid: user.uid, email: user.email! })),
    );
    pageToken = result.pageToken;
  } while (pageToken);

  return users;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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

    // Get all user emails from Firebase Auth
    const userEmails = await listAllAuthUsers();

    if (userEmails.length === 0) {
      logger.info("[WeeklyDigest] No users with email found, skipping.");
      return;
    }

    // Get last Monday-Sunday range
    const now = new Date();
    const lastMonday = new Date(now);
    const day = lastMonday.getDay();
    const diff = day === 0 ? 6 : day - 1;
    lastMonday.setDate(lastMonday.getDate() - diff - 7);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const startStr = lastMonday.toISOString().split("T")[0];
    const endStr = lastSunday.toISOString().split("T")[0];

    logger.info(`[WeeklyDigest] Period: ${startStr} - ${endStr}`);

    const processUser = async (user: { uid: string; email: string }) => {
      try {
        // Query workouts for this user
        const workoutsSnap = await db
          .collection("workouts")
          .where("userId", "==", user.uid)
          .where("completed", "==", true)
          .where("date", ">=", startStr)
          .where("date", "<=", endStr)
          .get();

        const workouts = workoutsSnap.docs.map(d => d.data() as WorkoutDoc);
        const sessionCount = workouts.length;

        if (sessionCount === 0) {
          logger.info(`[WeeklyDigest] No workouts for ${user.email}, skipping.`);
          return;
        }

        // Calculate tonnage
        const tonnage = workouts.reduce((total, w) =>
          total + w.exercises.reduce((exTotal, ex) =>
            exTotal + ex.sets
              .filter(s => s.completed && !s.isWarmup)
              .reduce((s, set) => s + set.reps * set.weight, 0),
          0),
        0);

        // Query strava activities for this user
        const stravaSnap = await db
          .collection("strava_activities")
          .where("userId", "==", user.uid)
          .where("date", ">=", startStr)
          .where("date", "<=", endStr)
          .get();

        const stravaActivities = stravaSnap.docs.map(d => d.data() as StravaDoc);
        const runs = stravaActivities.filter(a => a.type === "Run");
        const totalRunKm = Math.round(
          runs.reduce((sum, a) => sum + ((a.distance || 0) / 1000), 0) * 10
        ) / 10;

        // Best run (fastest pace)
        const bestRun = runs
          .filter(a => a.averageSpeed && a.averageSpeed > 0)
          .sort((a, b) => (b.averageSpeed || 0) - (a.averageSpeed || 0))[0];

        // Longest run
        const longestRun = runs
          .filter(a => a.distance && a.distance > 0)
          .sort((a, b) => (b.distance || 0) - (a.distance || 0))[0];

        const dateRange = `${lastMonday.toLocaleDateString("pl-PL", { day: "numeric", month: "long" })} - ${lastSunday.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}`;

        const subject = `💪 Tydzień ${startStr}: ${sessionCount} treningów, ${(tonnage / 1000).toFixed(1)}t tonażu${totalRunKm > 0 ? `, ${totalRunKm}km biegu` : ""}`;

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;">
    <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:32px;color:#fff;text-align:center;">
      <h1 style="margin:0;font-size:24px;">💪 Podsumowanie tygodnia</h1>
      <p style="margin:8px 0 0;opacity:0.8;font-size:14px;">${escapeHtmlStr(dateRange)}</p>
    </div>

    <div style="padding:24px;">
      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;text-align:center;padding:16px;background:#f0f9ff;border-radius:8px;">
          <div style="font-size:32px;font-weight:700;color:#1a1a2e;">${sessionCount}</div>
          <div style="font-size:12px;color:#64748b;">Treningi</div>
        </div>
        <div style="flex:1;text-align:center;padding:16px;background:#f0fdf4;border-radius:8px;">
          <div style="font-size:32px;font-weight:700;color:#1a1a2e;">${(tonnage / 1000).toFixed(1)}t</div>
          <div style="font-size:12px;color:#64748b;">Tonaż</div>
        </div>
      </div>

      ${totalRunKm > 0 ? `
      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;text-align:center;padding:16px;background:#fff7ed;border-radius:8px;">
          <div style="font-size:32px;font-weight:700;color:#1a1a2e;">${totalRunKm}km</div>
          <div style="font-size:12px;color:#64748b;">Bieg</div>
        </div>
        <div style="flex:1;text-align:center;padding:16px;background:#fdf4ff;border-radius:8px;">
          <div style="font-size:32px;font-weight:700;color:#1a1a2e;">${runs.length}</div>
          <div style="font-size:12px;color:#64748b;">Biegi</div>
        </div>
      </div>
      ` : ""}

      ${bestRun ? `
      <div style="margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:8px;border-left:4px solid #f97316;">
        <p style="margin:0;font-size:13px;color:#64748b;">🏃 Najszybszy bieg</p>
        <p style="margin:4px 0 0;font-weight:600;">${escapeHtmlStr(bestRun.name)} — ${((bestRun.distance || 0) / 1000).toFixed(1)} km</p>
      </div>
      ` : ""}

      ${longestRun ? `
      <div style="margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:8px;border-left:4px solid #3b82f6;">
        <p style="margin:0;font-size:13px;color:#64748b;">📏 Najdłuższy dystans</p>
        <p style="margin:4px 0 0;font-weight:600;">${escapeHtmlStr(longestRun.name)} — ${((longestRun.distance || 0) / 1000).toFixed(1)} km</p>
      </div>
      ` : ""}

      <div style="text-align:center;padding-top:16px;border-top:1px solid #e2e8f0;">
        <a href="https://grzegorzee.github.io/strength-save/" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;">
          Otwórz Strength Save
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

        await resend.emails.send({
          from: "Strength Save <onboarding@resend.dev>",
          to: user.email,
          subject,
          html,
        });
        logger.info(`[WeeklyDigest] Email sent to ${user.email}`);
      } catch (error) {
        logger.error(`[WeeklyDigest] Failed for ${user.email}:`, error);
      }
    };

    for (const batch of chunkArray(userEmails, 10)) {
      await Promise.allSettled(batch.map(processUser));
    }

    logger.info("[WeeklyDigest] Done.");
  },
);
