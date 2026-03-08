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
    throw new HttpsError("failed-precondition", "Strava client_id not configured");
  }

  const scope = "read,activity:read_all";
  const url =
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&state=${userId}`;

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
    logger.error("Strava token exchange failed:", errorText);
    throw new HttpsError("internal", "Failed to exchange code for tokens");
  }

  const tokenData = await response.json();

  await db.doc(`users/${userId}`).update({
    stravaConnected: true,
    stravaTokens: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_at,
    },
    stravaAthleteId: tokenData.athlete?.id || null,
    stravaAthleteName:
      tokenData.athlete
        ? `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`.trim()
        : null,
  });

  const synced = await syncUserActivities(userId, tokenData.access_token);

  return { success: true, synced };
});

/**
 * Manual sync of Strava activities
 */
export const stravaSync = onCall(async (request) => {
  const { userId } = request.data;
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId is required");
  }

  const userDoc = await db.doc(`users/${userId}`).get();
  const userData = userDoc.data();

  if (!userData?.stravaConnected || !userData?.stravaTokens) {
    throw new HttpsError("failed-precondition", "Strava not connected");
  }

  let accessToken = userData.stravaTokens.accessToken;
  const now = Math.floor(Date.now() / 1000);

  if (userData.stravaTokens.expiresAt <= now) {
    accessToken = await refreshStravaToken(userId, userData.stravaTokens.refreshToken);
  }

  const synced = await syncUserActivities(userId, accessToken);
  return { synced };
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
    throw new HttpsError("internal", "Failed to refresh Strava token");
  }

  const tokenData = await response.json();

  await db.doc(`users/${userId}`).update({
    "stravaTokens.accessToken": tokenData.access_token,
    "stravaTokens.refreshToken": tokenData.refresh_token,
    "stravaTokens.expiresAt": tokenData.expires_at,
  });

  return tokenData.access_token;
}

async function syncUserActivities(userId: string, accessToken: string): Promise<number> {
  const userDoc = await db.doc(`users/${userId}`).get();
  const userData = userDoc.data();
  const lastSync = userData?.stravaLastSync;
  const after = lastSync
    ? Math.floor(new Date(lastSync).getTime() / 1000)
    : Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    logger.error("Strava activities fetch failed:", await response.text());
    throw new HttpsError("internal", "Failed to fetch Strava activities");
  }

  const activities = await response.json();
  let synced = 0;

  const batch = db.batch();

  for (const activity of activities) {
    const existing = await db
      .collection("strava_activities")
      .where("stravaId", "==", activity.id)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!existing.empty) continue;

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

  return synced;
}
