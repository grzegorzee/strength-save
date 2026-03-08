import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Environment variables from functions/.env file
const getStravaConfig = () => ({
  clientId: process.env.STRAVA_CLIENT_ID || "",
  clientSecret: process.env.STRAVA_CLIENT_SECRET || "",
  redirectUri: process.env.STRAVA_REDIRECT_URI || "",
});

/**
 * Generate Strava OAuth authorization URL
 */
export const stravaAuthUrl = onCall(async (request) => {
  const { userId } = request.data;
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId is required");
  }

  const { clientId, redirectUri } = getStravaConfig();
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
});

/**
 * Exchange OAuth code for tokens and save to Firestore
 */
export const stravaCallback = onCall(async (request) => {
  const { code, userId } = request.data;
  if (!code || !userId) {
    throw new HttpsError("invalid-argument", "code and userId are required");
  }

  logger.info(`[Strava] Callback: exchanging code for ${userId}`);
  const { clientId, clientSecret } = getStravaConfig();

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
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
    stravaLastSync: null, // Force full lookback on new connection
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
});

/**
 * Manual sync of Strava activities
 */
export const stravaSync = onCall(async (request) => {
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
});

async function refreshStravaToken(userId: string, refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getStravaConfig();

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
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

  // Calculate 'after' timestamp
  const now = Math.floor(Date.now() / 1000);
  const afterFromLastSync = lastSync
    ? Math.floor(new Date(lastSync).getTime() / 1000)
    : now - 365 * 24 * 60 * 60;

  // Enforce minimum 7-day lookback — prevents "0 days" when lastSync is very recent
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
