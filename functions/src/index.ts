import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// --- Secrets from Google Cloud Secret Manager ---
const stravaClientId = defineSecret("strava-client-id");
const stravaClientSecret = defineSecret("strava-client-secret");
const stravaRedirectUri = defineSecret("strava-redirect-uri");
const openaiApiKey = defineSecret("openai-api-key");

/**
 * Generate Strava OAuth authorization URL
 */
export const stravaAuthUrl = onCall(
  { secrets: [stravaClientId, stravaRedirectUri] },
  async (request) => {
    const { userId } = request.data;
    if (!userId) {
      throw new HttpsError("invalid-argument", "userId is required");
    }

    const clientId = stravaClientId.value();
    const redirectUri = stravaRedirectUri.value();

    if (!clientId) {
      logger.error("[Strava] client_id not configured");
      throw new HttpsError("failed-precondition", "Strava client_id not configured");
    }

    const scope = "read,activity:read_all";
    const url =
      `https://www.strava.com/oauth/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&approval_prompt=force` +
      `&state=${userId}`;

    logger.info(`[Strava] Auth URL generated for ${userId}, redirect: ${redirectUri}`);
    return { url };
  },
);

/**
 * Exchange OAuth code for tokens and save to Firestore
 */
export const stravaCallback = onCall(
  { secrets: [stravaClientId, stravaClientSecret] },
  async (request) => {
    const { code, userId } = request.data;
    if (!code || !userId) {
      throw new HttpsError("invalid-argument", "code and userId are required");
    }

    logger.info(`[Strava] Callback: exchanging code for ${userId}`);

    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: stravaClientId.value(),
        client_secret: stravaClientSecret.value(),
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Strava] Token exchange failed (${response.status}):`, errorText);
      throw new HttpsError("internal", "Failed to exchange code for tokens");
    }

    const tokenData = await response.json();
    const athleteName = tokenData.athlete
      ? `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`.trim()
      : "unknown";
    logger.info(`[Strava] Token OK for athlete: ${athleteName} (id: ${tokenData.athlete?.id})`);

    await db.doc(`users/${userId}`).update({
      stravaConnected: true,
      stravaTokens: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_at,
      },
      stravaAthleteId: tokenData.athlete?.id || null,
      stravaAthleteName: athleteName !== "unknown" ? athleteName : null,
      stravaLastSync: null,
    });
    logger.info(`[Strava] User doc updated, stravaLastSync reset to null`);

    // Delete existing strava_activities for clean reconnect
    const existingActivities = await db
      .collection("strava_activities")
      .where("userId", "==", userId)
      .get();
    if (!existingActivities.empty) {
      const deleteBatch = db.batch();
      existingActivities.docs.forEach((d) => deleteBatch.delete(d.ref));
      await deleteBatch.commit();
      logger.info(`[Strava] Deleted ${existingActivities.size} old activities for clean reconnect`);
    }

    logger.info(`[Strava] Starting initial sync for ${userId}...`);
    const result = await syncUserActivities(userId, tokenData.access_token);
    logger.info(`[Strava] Callback complete: synced=${result.synced}, total=${result.totalFetched}`);

    return { success: true, ...result };
  },
);

/**
 * Manual sync of Strava activities
 */
export const stravaSync = onCall(
  { secrets: [stravaClientId, stravaClientSecret] },
  async (request) => {
    const { userId } = request.data;
    if (!userId) {
      throw new HttpsError("invalid-argument", "userId is required");
    }

    logger.info(`[Strava] Manual sync requested for ${userId}`);
    const userDoc = await db.doc(`users/${userId}`).get();
    const userData = userDoc.data();

    if (!userData?.stravaConnected || !userData?.stravaTokens) {
      logger.error(`[Strava] Not connected: stravaConnected=${userData?.stravaConnected}, hasTokens=${!!userData?.stravaTokens}`);
      throw new HttpsError("failed-precondition", "Strava not connected");
    }

    let accessToken = userData.stravaTokens.accessToken;
    const now = Math.floor(Date.now() / 1000);

    if (userData.stravaTokens.expiresAt <= now) {
      logger.info(`[Strava] Token expired (${userData.stravaTokens.expiresAt} <= ${now}), refreshing...`);
      accessToken = await refreshStravaToken(userId, userData.stravaTokens.refreshToken);
    }

    const result = await syncUserActivities(userId, accessToken);
    logger.info(`[Strava] Manual sync complete: synced=${result.synced}, total=${result.totalFetched}, lookback=${result.lookbackDays}d`);
    return { ...result, success: true };
  },
);

/**
 * Generate weekly summary text via OpenAI (key from Secret Manager)
 */
export const generateWeeklySummary = onCall(
  { secrets: [openaiApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

    const { stats } = request.data;
    if (!stats) {
      throw new HttpsError("invalid-argument", "stats is required");
    }

    const apiKey = openaiApiKey.value();
    if (!apiKey || apiKey === "PLACEHOLDER") {
      logger.error("[WeeklySummary] openai-api-key not configured in Secret Manager");
      throw new HttpsError("failed-precondition", "OpenAI API key not configured. Dodaj klucz w Google Cloud Console → Secret Manager → openai-api-key");
    }

    const prompt = `Jesteś trenerem personalnym. Napisz KRÓTKIE (max 150 słów) motywujące podsumowanie tygodnia treningowego po polsku.

Dane z tygodnia:
- Treningi siłowe: ${stats.workoutCount}
- Tonaż: ${stats.tonnageKg} kg
- Bieganie: ${stats.runKm} km
- Łączny czas aktywności: ~${stats.totalTimeMinutes} min
- Nowe rekordy: ${stats.prs?.length > 0 ? stats.prs.map((p: {exerciseName: string; newValue: number}) => `${p.exerciseName} (${p.newValue} kg)`).join(", ") : "brak"}

Zasady:
- Bądź konkretny, używaj liczb
- Pochwal za dobre rzeczy, delikatnie motywuj do poprawy jeśli trzeba
- Nie używaj emoji
- Max 150 słów
- Nie pisz "Oto podsumowanie" ani podobnych wstępów — zacznij od sedna`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Jesteś osobistym trenerem. Odpowiadaj po polsku, zwięźle i konkretnie." },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
      logger.error(`[WeeklySummary] OpenAI API error: ${errorMessage}`);
      throw new HttpsError("internal", `OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    logger.info(`[WeeklySummary] Generated summary (${text.length} chars) for ${request.auth.uid}`);

    return { text };
  },
);

// --- Helper functions ---

async function refreshStravaToken(userId: string, refreshToken: string): Promise<string> {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: stravaClientId.value(),
      client_secret: stravaClientSecret.value(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`[Strava] Token refresh failed (${response.status}):`, errorText);
    throw new HttpsError("internal", "Failed to refresh Strava token");
  }

  const tokenData = await response.json();
  logger.info(`[Strava] Token refreshed, new expiresAt: ${tokenData.expires_at}`);

  await db.doc(`users/${userId}`).update({
    "stravaTokens.accessToken": tokenData.access_token,
    "stravaTokens.refreshToken": tokenData.refresh_token,
    "stravaTokens.expiresAt": tokenData.expires_at,
  });

  return tokenData.access_token;
}

interface SyncResult {
  synced: number;
  totalFetched: number;
  alreadyExisted: number;
  lookbackDays: number;
}

async function syncUserActivities(userId: string, accessToken: string): Promise<SyncResult> {
  const userDoc = await db.doc(`users/${userId}`).get();
  const userData = userDoc.data();
  const lastSync = userData?.stravaLastSync;

  const now = Math.floor(Date.now() / 1000);
  const afterFromLastSync = lastSync
    ? Math.floor(new Date(lastSync).getTime() / 1000)
    : now - 365 * 24 * 60 * 60;

  const minLookback = now - 7 * 24 * 60 * 60;
  const after = Math.min(afterFromLastSync, minLookback);

  logger.info(`[Strava] syncUserActivities: lastSync=${lastSync || "null"}, after=${new Date(after * 1000).toISOString()}`);

  const apiUrl = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`;
  logger.info(`[Strava] API call: ${apiUrl}`);

  const response = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`[Strava] API failed (${response.status}):`, errorText);
    throw new HttpsError("internal", `Strava API error ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const activities = await response.json();
  const lookbackDays = Math.round((Date.now() / 1000 - after) / (24 * 60 * 60));
  logger.info(`[Strava] API returned ${activities.length} activities (lookback: ${lookbackDays} days)`);

  let synced = 0;
  let alreadyExisted = 0;

  const batch = db.batch();

  for (const activity of activities) {
    const existing = await db
      .collection("strava_activities")
      .where("stravaId", "==", activity.id)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!existing.empty) {
      alreadyExisted++;
      continue;
    }

    const activityDate = new Date(activity.start_date_local);
    const dateStr = activityDate.toISOString().split("T")[0];

    const docRef = db.collection("strava_activities").doc();
    batch.set(docRef, {
      userId,
      stravaId: activity.id,
      name: activity.name,
      type: activity.type,
      date: dateStr,
      distance: activity.distance || null,
      movingTime: activity.moving_time || null,
      elapsedTime: activity.elapsed_time || null,
      averageHeartrate: activity.average_heartrate || null,
      maxHeartrate: activity.max_heartrate || null,
      totalElevationGain: activity.total_elevation_gain || null,
      averageSpeed: activity.average_speed || null,
      calories: activity.calories || null,
      description: activity.description || null,
      sportType: activity.sport_type || null,
      averageCadence: activity.average_cadence || null,
      startDateLocal: activity.start_date_local || null,
      trainer: activity.trainer ?? null,
      kudosCount: activity.kudos_count || null,
      stravaUrl: `https://www.strava.com/activities/${activity.id}`,
      syncedAt: new Date().toISOString(),
    });

    synced++;
  }

  if (synced > 0) {
    await batch.commit();
  }

  await db.doc(`users/${userId}`).update({
    stravaLastSync: new Date().toISOString(),
  });

  logger.info(`[Strava] Result: ${synced} new, ${alreadyExisted} already existed, ${activities.length} total for ${userId}`);
  return { synced, totalFetched: activities.length, alreadyExisted, lookbackDays };
}
