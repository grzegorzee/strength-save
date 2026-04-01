import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { checkUsageLimit, recordUsage } from "./ai-usage";

admin.initializeApp();

// Re-export weekly digest
export { weeklyDigest } from "./weekly-digest";

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
    const { userId, fullSync } = request.data;
    if (!userId) {
      throw new HttpsError("invalid-argument", "userId is required");
    }

    logger.info(`[Strava] Manual sync requested for ${userId}, fullSync=${!!fullSync}`);
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

    const result = await syncUserActivities(userId, accessToken, !!fullSync);
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

    // Cost tracking
    const userId = request.auth.uid;
    try {
      await checkUsageLimit(userId);
    } catch (limitErr) {
      if (typeof limitErr === "string" && limitErr.startsWith("LIMIT_EXCEEDED")) {
        throw new HttpsError("resource-exhausted", limitErr);
      }
      throw limitErr;
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
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "Jesteś osobistym trenerem. Odpowiadaj po polsku, zwięźle i konkretnie." },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 500,
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
    logger.info(`[WeeklySummary] Generated summary (${text.length} chars) for ${userId}`);

    // Record usage
    if (data.usage) {
      await recordUsage(userId, data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0, "gpt-5-mini");
    }

    return { text };
  },
);

/**
 * Generic OpenAI proxy — all frontend AI calls go through here (key stays server-side)
 */
export const proxyOpenAI = onCall(
  { secrets: [openaiApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

    const { messages, model, maxTokens } = request.data;
    if (!messages || !Array.isArray(messages)) {
      throw new HttpsError("invalid-argument", "messages array is required");
    }

    const apiKey = openaiApiKey.value();
    if (!apiKey || apiKey === "PLACEHOLDER") {
      logger.error("[ProxyOpenAI] openai-api-key not configured");
      throw new HttpsError("failed-precondition", "OpenAI API key not configured");
    }

    // Cost tracking
    const userId = request.auth.uid;
    const usedModel = model || "gpt-5-mini";
    try {
      await checkUsageLimit(userId);
    } catch (limitErr) {
      if (typeof limitErr === "string" && limitErr.startsWith("LIMIT_EXCEEDED")) {
        throw new HttpsError("resource-exhausted", limitErr);
      }
      throw limitErr;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-5-mini",
        messages,
        max_completion_tokens: maxTokens || 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
      logger.error(`[ProxyOpenAI] OpenAI error: ${errorMessage}`);
      throw new HttpsError("internal", `OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    logger.info(`[ProxyOpenAI] OK (${text.length} chars) for ${userId}`);

    // Record usage
    if (data.usage) {
      await recordUsage(userId, data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0, usedModel);
    }

    return { text };
  },
);

/**
 * Streaming OpenAI proxy via SSE (onRequest — not onCall, needed for streaming)
 * Auth: Authorization: Bearer {Firebase ID token}
 */
export const streamOpenAI = onRequest(
  {
    secrets: [openaiApiKey],
    cors: ["https://grzegorzee.github.io", "http://localhost:5173", "http://localhost:4173"],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (req, res) => {
    // Only POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Manual auth via Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Authorization header" });
      return;
    }

    let userId: string;
    try {
      const token = authHeader.split("Bearer ")[1];
      const decoded = await admin.auth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Check usage limit
    try {
      await checkUsageLimit(userId);
    } catch (limitErr) {
      if (typeof limitErr === "string" && limitErr.startsWith("LIMIT_EXCEEDED")) {
        res.status(429).json({ error: limitErr });
        return;
      }
      res.status(500).json({ error: "Usage check failed" });
      return;
    }

    const { messages, model, maxTokens } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const apiKey = openaiApiKey.value();
    if (!apiKey || apiKey === "PLACEHOLDER") {
      res.status(500).json({ error: "OpenAI API key not configured" });
      return;
    }

    const usedModel = model || "gpt-5-mini";

    // Call OpenAI with streaming
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: usedModel,
        messages,
        max_completion_tokens: maxTokens || 4000,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      logger.error(`[StreamOpenAI] OpenAI error ${openaiRes.status}: ${errBody}`);
      res.status(502).json({ error: `OpenAI API error: ${openaiRes.status}` });
      return;
    }

    // Set SSE headers and flush immediately to establish connection
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Read OpenAI stream using Web Streams API (Node 22 fetch returns ReadableStream, not Node Readable)
    let buffer = "";
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    const decoder = new TextDecoder();

    try {
      const body = openaiRes.body;
      if (!body) {
        res.status(502).json({ error: "No response body from OpenAI" });
        return;
      }

      for await (const chunk of body) {
        buffer += decoder.decode(chunk as BufferSource, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            continue; // Will handle after loop
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.usage) {
              totalPromptTokens = parsed.usage.prompt_tokens || 0;
              totalCompletionTokens = parsed.usage.completion_tokens || 0;
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      logger.error("[StreamOpenAI] Stream error:", err);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      }
    }

    // Record usage after stream completes
    if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
      recordUsage(userId, totalPromptTokens, totalCompletionTokens, usedModel).catch(
        (err) => logger.error("[StreamOpenAI] Failed to record usage:", err),
      );
    }

    if (!res.writableEnded) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
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

async function syncUserActivities(userId: string, accessToken: string, fullSync = false): Promise<SyncResult> {
  const userDoc = await db.doc(`users/${userId}`).get();
  const userData = userDoc.data();
  const lastSync = userData?.stravaLastSync;

  const now = Math.floor(Date.now() / 1000);

  let after: number;
  if (fullSync || !lastSync) {
    // Full sync or first connect: 365 days lookback
    after = now - 365 * 24 * 60 * 60;
  } else {
    // Incremental: from lastSync with min 7-day lookback
    const afterFromLastSync = Math.floor(new Date(lastSync).getTime() / 1000);
    const minLookback = now - 7 * 24 * 60 * 60;
    after = Math.min(afterFromLastSync, minLookback);
  }

  logger.info(`[Strava] syncUserActivities: lastSync=${lastSync || "null"}, fullSync=${fullSync}, after=${new Date(after * 1000).toISOString()}`);

  // Paginated fetch — Strava returns max 100 per page
  const allActivities: any[] = [];
  let page = 1;
  while (true) {
    const apiUrl = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`;
    logger.info(`[Strava] API call page ${page}: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Strava] API failed (${response.status}):`, errorText);
      throw new HttpsError("internal", `Strava API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const pageActivities = await response.json();
    if (!Array.isArray(pageActivities) || pageActivities.length === 0) break;

    allActivities.push(...pageActivities);
    page++;
    if (page > 20) break; // safety cap: max 2000 activities
  }

  const activities = allActivities;
  const lookbackDays = Math.round((Date.now() / 1000 - after) / (24 * 60 * 60));
  logger.info(`[Strava] Fetched ${activities.length} activities in ${page - 1} pages (lookback: ${lookbackDays} days)`);

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

    const dateStr = activity.start_date_local
      ? activity.start_date_local.split("T")[0]
      : new Date(activity.start_date).toISOString().split("T")[0];

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

  // Auto-update estimatedMaxHR (unless manually overridden)
  const userDocFresh = await db.doc(`users/${userId}`).get();
  const userDataFresh = userDocFresh.data();
  if (!userDataFresh?.maxHRManualOverride) {
    const allActivities = await db
      .collection("strava_activities")
      .where("userId", "==", userId)
      .get();
    let maxHR = 0;
    allActivities.docs.forEach((d) => {
      const mhr = d.data().maxHeartrate;
      if (mhr && mhr > maxHR) maxHR = mhr;
    });
    if (maxHR > 0) {
      await db.doc(`users/${userId}`).update({ estimatedMaxHR: maxHR });
      logger.info(`[Strava] Updated estimatedMaxHR=${maxHR} for ${userId}`);
    }
  }

  logger.info(`[Strava] Result: ${synced} new, ${alreadyExisted} already existed, ${activities.length} total for ${userId}`);
  return { synced, totalFetched: activities.length, alreadyExisted, lookbackDays };
}

/**
 * Scheduled daily Strava sync at 10:00 Warsaw time
 */
export const stravaScheduledSync = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "Europe/Warsaw",
    timeoutSeconds: 300,
    secrets: [stravaClientId, stravaClientSecret],
  },
  async () => {
    logger.info("[Strava] Scheduled sync starting...");

    const usersSnapshot = await db
      .collection("users")
      .where("stravaConnected", "==", true)
      .get();

    logger.info(`[Strava] Found ${usersSnapshot.size} connected users`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      try {
        if (!userData.stravaTokens) {
          logger.warn(`[Strava] Skipping ${userId}: no tokens`);
          continue;
        }

        let accessToken = userData.stravaTokens.accessToken;
        const now = Math.floor(Date.now() / 1000);

        if (userData.stravaTokens.expiresAt <= now) {
          logger.info(`[Strava] Refreshing token for ${userId}`);
          accessToken = await refreshStravaToken(userId, userData.stravaTokens.refreshToken);
        }

        const result = await syncUserActivities(userId, accessToken);
        logger.info(`[Strava] Scheduled sync OK for ${userId}: synced=${result.synced}`);
      } catch (error) {
        logger.error(`[Strava] Scheduled sync FAILED for ${userId}:`, error);
        // Continue with other users
      }
    }

    logger.info("[Strava] Scheduled sync completed");
  },
);
