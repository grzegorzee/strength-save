import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { randomBytes } from "crypto";
import {
  API_RATE_LIMIT_PER_MINUTE,
  checkAndConsumeRateLimit,
  createApiKeyForUser,
  decodeCursor,
  DEFAULT_API_SCOPES,
  encodeCursor,
  type ExportResource,
  getApiKeyRecordForUser,
  hasScope,
  listApiKeysForUser,
  markApiKeyUsed,
  normalizeApiKeyName,
  parseDateParam,
  parseFormat,
  parseLimit,
  parseResource,
  revokeApiKeyForUser,
  verifyApiKey,
  writeApiAuditLog,
} from "./admin-api";
import {
  canUseApiExport,
  canUseStravaIntegration,
  isValidStravaOAuthState,
  STRAVA_OAUTH_STATE_BYTES,
  STRAVA_OAUTH_STATE_TTL_MS,
} from "./security";
import { deleteQueryInBatches } from "./firestore-batch";
import {
  diffRefreshableFields,
  loadExistingActivities,
  manualSyncRetryAfterSeconds,
  mapStravaActivityToDoc,
  REFRESHABLE_ACTIVITY_FIELDS,
  type ExistingActivitiesSource,
  type StravaActivityDoc,
} from "./strava-activity";
import { disconnectStravaForUser } from "./strava-disconnect";
export {
  createInvite,
  createWaitlistEntry,
  listAuthAuditLogs,
  listInvites,
  listWaitlistEntries,
  redeemInvite,
  requestEmailVerificationCode,
  revokeInvite,
  syncUserProfile,
  updateUserAccess,
  verifyEmailCode,
  adminGetUserLogs,
  adminSendUserEmail,
  adminResendVerification,
  adminBroadcastEmail,
  adminSendPush,
  adminDeleteUser,
  adminGrantSubscription,
  adminRevokeSubscription,
  deleteOwnAccount,
  registerPushToken,
  unregisterPushToken,
  resumeDeletionOperations,
} from "./registration";

admin.initializeApp();

// Re-export weekly digest
export { weeklyDigest } from "./weekly-digest";
// Z125: Garmin Connect IQ — parowanie urządzenia i wymiana danych z zegarkiem.
export {
  garminPairStart,
  garminDevices,
  garminRevokeDevice,
  garminRevokeAllDevices,
  garminPair,
  garminDay,
  garminIngest,
  linkedDevices,
  reportAppleWatchStatus,
  unlinkLinkedDevice,
} from "./garmin-endpoints";
// Codzienne poranne przypomnienie o treningu (tylko w dni treningowe).
export { dailyTrainingReminder } from "./daily-reminder";
export { reducedModeEndingPush, vacationEndingPush } from "./reduced-mode-push";
export { activityRollup } from "./activity-rollup";
export { adminUserRepair } from "./repairs/admin-user-repair";
// Webhook RevenueCat → users/{uid}.subscription (entitlement PRO).
export { revenuecatWebhook } from "./revenuecat";
// Z217: agregat all-time treningów (kafle Dashboardu) + backfill na żądanie.
export { onWorkoutWrittenAggregate, rebuildWorkoutAggregate } from "./workout-aggregate";
// Z222: dzienny raport kosztów chmury (Monitoring API -> admin_cost_daily).
export { dailyCostDigest } from "./cost-digest";
// Pakiet prawny v2: log zgód z IP i timestampem serwerowym (rozliczalność RODO).
export { recordConsent } from "./consents";

const db = admin.firestore();
const USERS_COLLECTION = "users";
const WORKOUTS_COLLECTION = "workouts";
const STRAVA_ACTIVITIES_COLLECTION = "strava_activities";
const STRAVA_CONNECTIONS_COLLECTION = "strava_connections";
const MEASUREMENTS_COLLECTION = "measurements";
const TRAINING_PLANS_COLLECTION = "training_plans";
const PLAN_CYCLES_COLLECTION = "plan_cycles";

// --- Secrets from Google Cloud Secret Manager ---
const stravaClientId = defineSecret("strava-client-id");
const stravaClientSecret = defineSecret("strava-client-secret");
const stravaRedirectUri = defineSecret("strava-redirect-uri");
const apiKeyPepper = defineSecret("API_KEY_PEPPER");
// F-T3: transport SES (u właściciela); wartość "unset" = fallback na Resend.
const sesRegion = defineSecret("SES_REGION");
const sesAccessKeyId = defineSecret("SES_ACCESS_KEY_ID");
const sesSecretAccessKey = defineSecret("SES_SECRET_ACCESS_KEY");
const sesFrom = defineSecret("SES_FROM");

interface StravaTokenPayload {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id?: number;
    firstname?: string;
    lastname?: string;
  };
}

interface StravaConnectionDoc {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athleteId: number | null;
  athleteName: string | null;
  updatedAt: string;
  oauthState?: string;
  oauthStateCreatedAt?: number;
  oauthStateExpiresAt?: number;
}

interface StravaApiActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  start_date_local?: string;
  distance?: number | null;
  moving_time?: number | null;
  elapsed_time?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  total_elevation_gain?: number | null;
  average_speed?: number | null;
  calories?: number | null;
  description?: string | null;
  sport_type?: string | null;
  average_cadence?: number | null;
  trainer?: boolean | null;
  kudos_count?: number | null;
}

const getUserRef = (userId: string) => db.doc(`${USERS_COLLECTION}/${userId}`);
const getStravaConnectionRef = (userId: string) => db.doc(`${STRAVA_CONNECTIONS_COLLECTION}/${userId}`);
const getStravaActivityRef = (userId: string, activityId: number) => (
  db.collection(STRAVA_ACTIVITIES_COLLECTION).doc(`strava-${userId}-${activityId}`)
);
const getTrainingPlanRef = (userId: string) => db.doc(`${TRAINING_PLANS_COLLECTION}/${userId}`);

/**
 * Remove all strava_activities for a user using paginated batches. A single
 * batch caps at 500 ops, so a clean reconnect/disconnect of an account with
 * hundreds of activities would otherwise fail.
 */
const deleteUserStravaActivities = (userId: string): Promise<number> => (
  deleteQueryInBatches(
    db.collection(STRAVA_ACTIVITIES_COLLECTION).where("userId", "==", userId),
    () => db.batch(),
  )
);

function cleanExportProfile(profile: Record<string, unknown> | undefined) {
  if (!profile) return null;
  const {
    stravaTokens: _stravaTokens,
    ...safeProfile
  } = profile;
  return safeProfile;
}

async function assertAdmin(userId: string): Promise<void> {
  const userDoc = await getUserRef(userId).get();
  const role = userDoc.data()?.role;
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

async function assertStravaAccess(userId: string): Promise<void> {
  const userDoc = await getUserRef(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User profile missing");
  }

  const data = userDoc.data();
  if (!canUseStravaIntegration(data)) {
    throw new HttpsError("permission-denied", "Strava access disabled");
  }
}

async function getWorkoutExport(
  userId: string,
  from: string | null,
  to: string | null,
  limit?: number,
  cursor?: number,
) {
  let query = db
    .collection(WORKOUTS_COLLECTION)
    .where("userId", "==", userId)
    .orderBy("date", "desc");

  if (from) {
    query = query.where("date", ">=", from);
  }
  if (to) {
    query = query.where("date", "<=", to);
  }
  if (cursor && cursor > 0) {
    query = query.offset(cursor);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getMeasurementExport(
  userId: string,
  from: string | null,
  to: string | null,
  limit?: number,
  cursor?: number,
) {
  let query = db
    .collection(MEASUREMENTS_COLLECTION)
    .where("userId", "==", userId)
    .orderBy("date", "desc");

  if (from) {
    query = query.where("date", ">=", from);
  }
  if (to) {
    query = query.where("date", "<=", to);
  }
  if (cursor && cursor > 0) {
    query = query.offset(cursor);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getPlanCyclesExport(
  userId: string,
  from: string | null,
  to: string | null,
  limit?: number,
  cursor?: number,
) {
  let query = db
    .collection(PLAN_CYCLES_COLLECTION)
    .where("userId", "==", userId)
    .orderBy("startDate", "desc");

  if (from) {
    query = query.where("startDate", ">=", from);
  }
  if (to) {
    query = query.where("startDate", "<=", to);
  }
  if (cursor && cursor > 0) {
    query = query.offset(cursor);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getTrainingPlanExport(userId: string) {
  const snap = await getTrainingPlanRef(userId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function getProfileExport(userId: string) {
  const snap = await getUserRef(userId).get();
  if (!snap.exists) return null;
  return cleanExportProfile({ id: snap.id, ...snap.data() });
}

const buildStravaConnection = (tokenData: StravaTokenPayload, athleteName: string): StravaConnectionDoc => ({
  accessToken: tokenData.access_token,
  refreshToken: tokenData.refresh_token,
  expiresAt: tokenData.expires_at,
  athleteId: tokenData.athlete?.id || null,
  athleteName: athleteName !== "unknown" ? athleteName : null,
  updatedAt: new Date().toISOString(),
});

const saveStravaConnection = async (userId: string, tokenData: StravaTokenPayload, athleteName: string) => {
  await getStravaConnectionRef(userId).set(buildStravaConnection(tokenData, athleteName));
  await getUserRef(userId).set({
    stravaConnected: true,
    stravaAthleteId: tokenData.athlete?.id || null,
    stravaAthleteName: athleteName !== "unknown" ? athleteName : null,
    stravaLastSync: null,
    stravaTokens: admin.firestore.FieldValue.delete(),
  }, { merge: true });
};

const getStravaConnection = async (userId: string): Promise<StravaConnectionDoc | null> => {
  const connectionDoc = await getStravaConnectionRef(userId).get();
  if (connectionDoc.exists) {
    return connectionDoc.data() as StravaConnectionDoc;
  }

  const userDoc = await getUserRef(userId).get();
  const userData = userDoc.data();
  const legacyTokens = userData?.stravaTokens as
    | { accessToken?: string; refreshToken?: string; expiresAt?: number }
    | undefined;

  if (!legacyTokens?.accessToken || !legacyTokens?.refreshToken || !legacyTokens?.expiresAt) {
    return null;
  }

  const migratedConnection: StravaConnectionDoc = {
    accessToken: legacyTokens.accessToken,
    refreshToken: legacyTokens.refreshToken,
    expiresAt: legacyTokens.expiresAt,
    athleteId: userData?.stravaAthleteId || null,
    athleteName: userData?.stravaAthleteName || null,
    updatedAt: new Date().toISOString(),
  };

  await getStravaConnectionRef(userId).set(migratedConnection);
  await getUserRef(userId).set({
    stravaTokens: admin.firestore.FieldValue.delete(),
  }, { merge: true });
  logger.info(`[Strava] Migrated legacy tokens for ${userId}`);

  return migratedConnection;
};

const createStravaOAuthState = () => (
  randomBytes(STRAVA_OAUTH_STATE_BYTES)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "")
);

const savePendingStravaOAuthState = async (userId: string, state: string) => {
  const now = Date.now();
  await getStravaConnectionRef(userId).set({
    oauthState: state,
    oauthStateCreatedAt: now,
    oauthStateExpiresAt: now + STRAVA_OAUTH_STATE_TTL_MS,
  }, { merge: true });
};

const assertPendingStravaOAuthState = async (userId: string, state: unknown) => {
  if (!isValidStravaOAuthState(state)) {
    throw new HttpsError("invalid-argument", "state is required");
  }

  const connectionDoc = await getStravaConnectionRef(userId).get();
  const connection = connectionDoc.data() as Partial<StravaConnectionDoc> | undefined;
  if (!connection?.oauthState || connection.oauthState !== state) {
    throw new HttpsError("permission-denied", "Invalid Strava OAuth state");
  }

  if (!connection.oauthStateExpiresAt || connection.oauthStateExpiresAt < Date.now()) {
    throw new HttpsError("deadline-exceeded", "Expired Strava OAuth state");
  }
};

/**
 * Generate Strava OAuth authorization URL
 */
export const stravaAuthUrl = onCall(
  { secrets: [stravaClientId, stravaRedirectUri] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }
    const userId = request.auth.uid;
    await assertStravaAccess(userId);

    const clientId = stravaClientId.value();
    const redirectUri = stravaRedirectUri.value();

    if (!clientId) {
      logger.error("[Strava] client_id not configured");
      throw new HttpsError("failed-precondition", "Strava client_id not configured");
    }

    const state = createStravaOAuthState();
    await savePendingStravaOAuthState(userId, state);

    const scope = "read,activity:read_all";
    const url =
      `https://www.strava.com/oauth/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&approval_prompt=force` +
      `&state=${encodeURIComponent(state)}`;

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
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }
    const userId = request.auth.uid;
    await assertStravaAccess(userId);
    const { code, state } = request.data;
    if (typeof code !== "string" || code.length === 0) {
      throw new HttpsError("invalid-argument", "code is required");
    }
    await assertPendingStravaOAuthState(userId, state);

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

    const tokenData = await response.json() as StravaTokenPayload;
    const athleteName = tokenData.athlete
      ? `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`.trim()
      : "unknown";
    logger.info(`[Strava] Token OK for athlete: ${athleteName} (id: ${tokenData.athlete?.id})`);

    // Kasujemy stare aktywności TYLKO przy zmianie konta Strava (inny athleteId) —
    // reconnect tego samego konta nie może tracić historii starszej niż 365 dni
    // (sync odtwarza tylko rok wstecz; upsert po deterministycznym id i tak nadpisze duplikaty).
    const previousConnection = await getStravaConnection(userId).catch(() => null);
    const newAthleteId = tokenData.athlete?.id || null;
    const athleteChanged = previousConnection?.athleteId != null
      && newAthleteId != null
      && previousConnection.athleteId !== newAthleteId;

    await saveStravaConnection(userId, tokenData, athleteName);
    logger.info(`[Strava] User doc updated, stravaLastSync reset to null`);

    if (athleteChanged) {
      const deletedCount = await deleteUserStravaActivities(userId);
      logger.info(`[Strava] Athlete changed (${previousConnection?.athleteId} -> ${newAthleteId}), deleted ${deletedCount} old activities`);
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
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }
    const userId = request.auth.uid;
    await assertStravaAccess(userId);
    const { fullSync } = request.data;

    logger.info(`[Strava] Manual sync requested for ${userId}, fullSync=${!!fullSync}`);
    const userDoc = await getUserRef(userId).get();
    const userData = userDoc.data();
    const connection = await getStravaConnection(userId);

    if (!userData?.stravaConnected || !connection) {
      logger.error(`[Strava] Not connected: stravaConnected=${userData?.stravaConnected}, hasConnection=${!!connection}`);
      throw new HttpsError("failed-precondition", "Strava not connected");
    }

    // T7: serwerowy rate-limit ręcznego syncu (spam przycisku palił limit API
    // Stravy). Dotyczy też fullSync. Scheduled sync i callback wołają
    // syncUserActivities bezpośrednio, więc guard ich nie dotyka.
    const retryAfterSec = manualSyncRetryAfterSeconds(userData?.stravaLastSync, Date.now());
    if (retryAfterSec !== null) {
      logger.info(`[Strava] Manual sync rate-limited for ${userId}, retry in ${retryAfterSec}s`);
      throw new HttpsError("resource-exhausted", `Retry in ${retryAfterSec}s`);
    }

    let accessToken = connection.accessToken;
    const now = Math.floor(Date.now() / 1000);

    if (connection.expiresAt <= now) {
      logger.info(`[Strava] Token expired (${connection.expiresAt} <= ${now}), refreshing...`);
      accessToken = await refreshStravaToken(userId, connection.refreshToken);
    }

    const result = await syncUserActivities(userId, accessToken, !!fullSync);
    logger.info(`[Strava] Manual sync complete: synced=${result.synced}, total=${result.totalFetched}, lookback=${result.lookbackDays}d`);
    return { ...result, success: true };
  },
);

function getExportApiUrl(): string {
  const projectId = process.env.GCLOUD_PROJECT || process.env.PROJECT_ID || "fittracker-workouts";
  return `https://us-central1-${projectId}.cloudfunctions.net/exportUserDataApi`;
}

function parseIncludeList(value: unknown): ExportResource[] {
  if (typeof value !== "string" || !value.trim()) {
    return ["profile", "workouts", "measurements", "training-plan", "plan-cycles"];
  }

  const resources = value
    .split(",")
    .map((item) => parseResource(item.trim()))
    .filter((item): item is Exclude<ExportResource, "full"> => item !== "full");

  return resources.length > 0
    ? Array.from(new Set(resources))
    : ["profile", "workouts", "measurements", "training-plan", "plan-cycles"];
}

export const listApiKeys = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  await assertAdmin(request.auth.uid);
  const keys = await listApiKeysForUser(request.auth.uid);
  return {
    keys,
    exportUrl: getExportApiUrl(),
    defaultScopes: [...DEFAULT_API_SCOPES],
  };
});

export const createApiKey = onCall(
  { secrets: [apiKeyPepper] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

    await assertAdmin(request.auth.uid);

    const pepper = apiKeyPepper.value();
    if (!pepper) {
      throw new HttpsError("failed-precondition", "API key pepper not configured");
    }

    const name = normalizeApiKeyName(request.data?.name);
    const result = await createApiKeyForUser(request.auth.uid, name, pepper);

    return {
      key: result.record,
      rawKey: result.rawKey,
      exportUrl: getExportApiUrl(),
    };
  },
);

export const revokeApiKey = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  await assertAdmin(request.auth.uid);

  const keyId = typeof request.data?.keyId === "string" ? request.data.keyId : "";
  if (!keyId) {
    throw new HttpsError("invalid-argument", "keyId is required");
  }

  await revokeApiKeyForUser(request.auth.uid, keyId);
  return { success: true };
});

export const rotateApiKey = onCall(
  { secrets: [apiKeyPepper] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in");
    }

    await assertAdmin(request.auth.uid);

    const pepper = apiKeyPepper.value();
    if (!pepper) {
      throw new HttpsError("failed-precondition", "API key pepper not configured");
    }

    const keyId = typeof request.data?.keyId === "string" ? request.data.keyId : "";
    if (!keyId) {
      throw new HttpsError("invalid-argument", "keyId is required");
    }

    const existing = await getApiKeyRecordForUser(request.auth.uid, keyId);
    const rotated = await createApiKeyForUser(
      request.auth.uid,
      existing.name,
      pepper,
      {
        scopes: existing.scopes,
        expiresAt: existing.expiresAt,
        rotatedFrom: existing.id,
      },
    );
    await revokeApiKeyForUser(request.auth.uid, keyId);

    return {
      key: rotated.record,
      rawKey: rotated.rawKey,
      exportUrl: getExportApiUrl(),
    };
  },
);

export const exportUserDataApi = onRequest(
  {
    secrets: [apiKeyPepper],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (req, res) => {
    const pepper = apiKeyPepper.value();
    if (!pepper) {
      res.status(500).json({ error: "API key pepper not configured" });
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Authorization header" });
      return;
    }

    const rawKey = authHeader.split("Bearer ")[1];
    const verifiedKey = await verifyApiKey(rawKey, pepper);
    if (!verifiedKey) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    const resource = parseResource(req.query.resource);
    const format = parseFormat(req.query.format);
    const ownerDoc = await getUserRef(verifiedKey.userId).get();
    if (!ownerDoc.exists || !canUseApiExport(ownerDoc.data())) {
      await writeApiAuditLog({
        keyId: verifiedKey.id,
        userId: verifiedKey.userId,
        resource,
        statusCode: 403,
        request: req,
        pepper,
        format,
        responseBytes: 0,
        query: { ...req.query },
      }).catch((error) => logger.error("[ExportAPI] Failed to write denied owner audit log:", error));
      res.status(403).json({ error: "API key owner no longer has export access" });
      return;
    }

    try {
      await checkAndConsumeRateLimit(verifiedKey.id, API_RATE_LIMIT_PER_MINUTE);
    } catch (error) {
      const message = error instanceof Error ? error.message : "RATE_LIMIT_EXCEEDED";
      if (message === "RATE_LIMIT_EXCEEDED") {
        await writeApiAuditLog({
          keyId: verifiedKey.id,
          userId: verifiedKey.userId,
          resource: parseResource(req.query.resource),
          statusCode: 429,
          request: req,
          pepper,
          format: parseFormat(req.query.format),
          responseBytes: 0,
          query: { ...req.query },
        });
        res.status(429).json({ error: "Rate limit exceeded" });
        return;
      }
      throw error;
    }

    await markApiKeyUsed(verifiedKey.id);

    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);
    const limit = parseLimit(req.query.limit, 250);
    const cursor = decodeCursor(req.query.cursor);

    if (!hasScope(verifiedKey.scopes, resource)) {
      res.status(403).json({ error: "API key does not have required scope" });
      return;
    }

    if (resource === "full" && format === "ndjson") {
      res.status(400).json({ error: "NDJSON is not supported for full export" });
      return;
    }

    let statusCode = 200;
    let responseBytes = 0;

    try {
      if (resource === "workouts") {
        const workouts = await getWorkoutExport(verifiedKey.userId, from, to, limit, cursor);
        const nextCursor = workouts.length === limit ? encodeCursor(cursor + workouts.length) : null;

        if (format === "ndjson") {
          const payload = [
            JSON.stringify({
              type: "meta",
              apiVersion: "v1",
              resource,
              ownerUserId: verifiedKey.userId,
              generatedAt: new Date().toISOString(),
              nextCursor,
            }),
            ...workouts.map((item) => JSON.stringify(item)),
          ].join("\n");
          responseBytes = Buffer.byteLength(payload);
          res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
          res.status(200).send(payload);
        } else {
          const body = {
            meta: {
              apiVersion: "v1",
              schemaVersion: 1,
              resource,
              ownerUserId: verifiedKey.userId,
              generatedAt: new Date().toISOString(),
              nextCursor,
            },
            data: workouts,
          };
          const payload = JSON.stringify(body);
          responseBytes = Buffer.byteLength(payload);
          res.status(200).json(body);
        }
      } else if (resource === "measurements") {
        const measurements = await getMeasurementExport(verifiedKey.userId, from, to, limit, cursor);
        const nextCursor = measurements.length === limit ? encodeCursor(cursor + measurements.length) : null;

        if (format === "ndjson") {
          const payload = [
            JSON.stringify({
              type: "meta",
              apiVersion: "v1",
              resource,
              ownerUserId: verifiedKey.userId,
              generatedAt: new Date().toISOString(),
              nextCursor,
            }),
            ...measurements.map((item) => JSON.stringify(item)),
          ].join("\n");
          responseBytes = Buffer.byteLength(payload);
          res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
          res.status(200).send(payload);
        } else {
          const body = {
            meta: {
              apiVersion: "v1",
              schemaVersion: 1,
              resource,
              ownerUserId: verifiedKey.userId,
              generatedAt: new Date().toISOString(),
              nextCursor,
            },
            data: measurements,
          };
          const payload = JSON.stringify(body);
          responseBytes = Buffer.byteLength(payload);
          res.status(200).json(body);
        }
      } else if (resource === "plan-cycles") {
        const planCycles = await getPlanCyclesExport(verifiedKey.userId, from, to, limit, cursor);
        const nextCursor = planCycles.length === limit ? encodeCursor(cursor + planCycles.length) : null;

        if (format === "ndjson") {
          const payload = [
            JSON.stringify({
              type: "meta",
              apiVersion: "v1",
              resource,
              ownerUserId: verifiedKey.userId,
              generatedAt: new Date().toISOString(),
              nextCursor,
            }),
            ...planCycles.map((item) => JSON.stringify(item)),
          ].join("\n");
          responseBytes = Buffer.byteLength(payload);
          res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
          res.status(200).send(payload);
        } else {
          const body = {
            meta: {
              apiVersion: "v1",
              schemaVersion: 1,
              resource,
              ownerUserId: verifiedKey.userId,
              generatedAt: new Date().toISOString(),
              nextCursor,
            },
            data: planCycles,
          };
          const payload = JSON.stringify(body);
          responseBytes = Buffer.byteLength(payload);
          res.status(200).json(body);
        }
      } else if (resource === "training-plan") {
        const trainingPlan = await getTrainingPlanExport(verifiedKey.userId);
        const body = {
          meta: {
            apiVersion: "v1",
            schemaVersion: 1,
            resource,
            ownerUserId: verifiedKey.userId,
            generatedAt: new Date().toISOString(),
            nextCursor: null,
          },
          data: trainingPlan,
        };
        const payload = JSON.stringify(body);
        responseBytes = Buffer.byteLength(payload);
        res.status(200).json(body);
      } else if (resource === "profile") {
        const profile = await getProfileExport(verifiedKey.userId);
        const body = {
          meta: {
            apiVersion: "v1",
            schemaVersion: 1,
            resource,
            ownerUserId: verifiedKey.userId,
            generatedAt: new Date().toISOString(),
            nextCursor: null,
          },
          data: profile,
        };
        const payload = JSON.stringify(body);
        responseBytes = Buffer.byteLength(payload);
        res.status(200).json(body);
      } else {
        const include = parseIncludeList(req.query.include);
        const profile = include.includes("profile") ? await getProfileExport(verifiedKey.userId) : undefined;
        const workouts = include.includes("workouts") ? await getWorkoutExport(verifiedKey.userId, from, to) : undefined;
        const measurements = include.includes("measurements") ? await getMeasurementExport(verifiedKey.userId, from, to) : undefined;
        const trainingPlan = include.includes("training-plan") ? await getTrainingPlanExport(verifiedKey.userId) : undefined;
        const planCycles = include.includes("plan-cycles") ? await getPlanCyclesExport(verifiedKey.userId, from, to) : undefined;

        const body = {
          meta: {
            apiVersion: "v1",
            schemaVersion: 1,
            resource,
            ownerUserId: verifiedKey.userId,
            generatedAt: new Date().toISOString(),
            nextCursor: null,
            include,
          },
          data: {
            ...(profile !== undefined && { profile }),
            ...(workouts !== undefined && { workouts }),
            ...(measurements !== undefined && { measurements }),
            ...(trainingPlan !== undefined && { trainingPlan }),
            ...(planCycles !== undefined && { planCycles }),
          },
        };
        const payload = JSON.stringify(body);
        responseBytes = Buffer.byteLength(payload);
        res.status(200).json(body);
      }
    } catch (error) {
      statusCode = 500;
      logger.error("[ExportAPI] Export failed:", error);
      res.status(500).json({ error: "Failed to export data" });
    } finally {
      await writeApiAuditLog({
        keyId: verifiedKey.id,
        userId: verifiedKey.userId,
        resource,
        statusCode,
        request: req,
        pepper,
        format,
        responseBytes,
        query: {
          from,
          to,
          limit,
          cursor,
          include: req.query.include ?? null,
        },
      }).catch((error) => logger.error("[ExportAPI] Failed to write audit log:", error));
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

  const tokenData = await response.json() as StravaTokenPayload;
  logger.info(`[Strava] Token refreshed, new expiresAt: ${tokenData.expires_at}`);

  await getStravaConnectionRef(userId).set({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_at,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return tokenData.access_token;
}

interface SyncResult {
  synced: number;
  refreshed: number;
  totalFetched: number;
  alreadyExisted: number;
  lookbackDays: number;
}

async function syncUserActivities(userId: string, accessToken: string, fullSync = false): Promise<SyncResult> {
  const userDoc = await getUserRef(userId).get();
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
  const allActivities: StravaApiActivity[] = [];
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

    const pageActivities = await response.json() as unknown;
    if (!Array.isArray(pageActivities) || pageActivities.length === 0) break;

    allActivities.push(...pageActivities as StravaApiActivity[]);
    page++;
    if (page > 20) break; // safety cap: max 2000 activities
  }

  const activities = allActivities;
  const lookbackDays = Math.round((Date.now() / 1000 - after) / (24 * 60 * 60));
  logger.info(`[Strava] Fetched ${activities.length} activities in ${page - 1} pages (lookback: ${lookbackDays} days)`);

  let synced = 0;
  let refreshed = 0;
  let alreadyExisted = 0;
  // R2-08: sync inkrementalny czyta TYLKO dokumenty pobranych w tym runie aktywności
  // (deterministyczne ID strava-{uid}-{activityId}, db.getAll) — O(pobranych), nie
  // O(całej historii). Pełny skan zostaje wyłącznie dla jednorazowego initial syncu.
  const useFullScan = fullSync || !lastSync;
  const existingSource: ExistingActivitiesSource = {
    queryAllForUser: async () => {
      const snapshot = await db
        .collection(STRAVA_ACTIVITIES_COLLECTION)
        .where("userId", "==", userId)
        .select("stravaId", ...REFRESHABLE_ACTIVITY_FIELDS)
        .get();
      return snapshot.docs.map((doc) => doc.data() as Partial<StravaActivityDoc>);
    },
    getByIds: async (activityIds) => {
      const results: Array<Partial<StravaActivityDoc> | null> = [];
      // getAll przyjmuje setki refów; chunk 300 trzyma bezpieczny margines.
      for (let i = 0; i < activityIds.length; i += 300) {
        const chunk = activityIds.slice(i, i + 300);
        const snapshots = await db.getAll(...chunk.map((id) => getStravaActivityRef(userId, id)));
        snapshots.forEach((snapshot) => {
          results.push(snapshot.exists ? (snapshot.data() as Partial<StravaActivityDoc>) : null);
        });
      }
      return results;
    },
  };
  const existingActivities = await loadExistingActivities(
    existingSource,
    activities.map((activity) => activity.id),
    useFullScan,
  );

  let batch = db.batch();
  let pendingWrites = 0;
  const commitBatch = async () => {
    if (pendingWrites === 0) return;
    await batch.commit();
    batch = db.batch();
    pendingWrites = 0;
  };

  for (const activity of activities) {
    const docRef = getStravaActivityRef(userId, activity.id);
    const fullDoc = mapStravaActivityToDoc(userId, activity, new Date().toISOString());
    const existing = existingActivities.get(activity.id);

    if (existing) {
      // Known activity — refresh only the fields Strava may have backfilled.
      const changes = diffRefreshableFields(existing, fullDoc);
      if (!changes) {
        alreadyExisted++;
        continue;
      }
      batch.set(docRef, changes, { merge: true });
      existingActivities.set(activity.id, { ...existing, ...changes });
      refreshed++;
    } else {
      batch.set(docRef, fullDoc);
      synced++;
      existingActivities.set(activity.id, fullDoc);
    }

    pendingWrites++;
    if (pendingWrites === 450) {
      await commitBatch();
    }
  }

  await commitBatch();

  await getUserRef(userId).set({
    stravaLastSync: new Date().toISOString(),
  }, { merge: true });

  // Auto-update estimatedMaxHR (unless manually overridden)
  if (!userData?.maxHRManualOverride) {
    const fetchedMaxHR = activities.reduce((max, activity) => (
      activity.max_heartrate && activity.max_heartrate > max ? activity.max_heartrate : max
    ), Number(userData?.estimatedMaxHR || 0));
    if (fetchedMaxHR > Number(userData?.estimatedMaxHR || 0)) {
      await getUserRef(userId).set({ estimatedMaxHR: fetchedMaxHR }, { merge: true });
      logger.info(`[Strava] Updated estimatedMaxHR=${fetchedMaxHR} for ${userId}`);
    }
  }

  logger.info(`[Strava] Result: ${synced} new, ${refreshed} refreshed, ${alreadyExisted} already existed, ${activities.length} total for ${userId}`);
  return { synced, refreshed, totalFetched: activities.length, alreadyExisted, lookbackDays };
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
      .collection(USERS_COLLECTION)
      .where("stravaConnected", "==", true)
      .get();

    logger.info(`[Strava] Found ${usersSnapshot.size} connected users`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      try {
        if (!canUseStravaIntegration(userDoc.data())) {
          logger.info(`[Strava] Skipping ${userId}: access disabled`);
          continue;
        }

        const connection = await getStravaConnection(userId);
        if (!connection) {
          logger.warn(`[Strava] Skipping ${userId}: no tokens`);
          continue;
        }

        let accessToken = connection.accessToken;
        const now = Math.floor(Date.now() / 1000);

        if (connection.expiresAt <= now) {
          logger.info(`[Strava] Refreshing token for ${userId}`);
          accessToken = await refreshStravaToken(userId, connection.refreshToken);
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

export const stravaDisconnect = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const userId = request.auth.uid;
  await assertStravaAccess(userId);

  const { deletedActivities } = await disconnectStravaForUser(userId, {
    deleteActivities: deleteUserStravaActivities,
    deleteConnection: (uid) => getStravaConnectionRef(uid).delete(),
    clearProfile: (uid) => getUserRef(uid).set({
      stravaConnected: false,
      stravaAthleteId: null,
      stravaAthleteName: null,
      stravaLastSync: null,
      estimatedMaxHR: null,
      maxHRManualOverride: null,
      stravaTokens: admin.firestore.FieldValue.delete(),
    }, { merge: true }),
  });
  logger.info(`[Strava] Disconnected ${userId}, removed ${deletedActivities} activities`);
});

// saveMaxHR usunięte (Z59): zapis idzie bezpośrednio przez Firestore rules
// (whitelist users: estimatedMaxHR 100-230 int, maxHRManualOverride bool).

// --- F-T3: mail podsumowania treningu (SES z fallbackiem Resend) ---
import { Resend } from "resend";
import { resendApiKey } from "./weekly-digest";
import {
  runEmailHistory,
  runEmailWorkout,
  EMAIL_DAILY_LIMIT,
  type EmailWorkout,
  type EmailWorkoutDeps,
  type HistoryEmailRange,
  type SendEmailResult,
} from "./email-workout";

const EMAIL_SECRETS = [sesRegion, sesAccessKeyId, sesSecretAccessKey, sesFrom, resendApiKey];

const isSecretSet = (value: string): boolean => value.trim() !== "" && value.trim() !== "unset";

const sendViaResend = async (to: string, subject: string, html: string): Promise<SendEmailResult> => {
  const apiKey = resendApiKey.value();
  if (!isSecretSet(apiKey)) return { error: { message: "no-transport-configured" } };
  const resend = new Resend(apiKey);
  const response = await resend.emails.send({
    from: "Strength Save <noreply@strengthsave.app>",
    to,
    subject,
    html,
  });
  return response.error ? { error: { message: response.error.message } } : { transport: "resend" };
};

const sendWorkoutEmail = async (to: string, subject: string, html: string): Promise<SendEmailResult> => {
  const region = sesRegion.value();
  const key = sesAccessKeyId.value();
  const secret = sesSecretAccessKey.value();
  const from = sesFrom.value();
  if (isSecretSet(region) && isSecretSet(key) && isSecretSet(secret) && isSecretSet(from)) {
    try {
      const { SESv2Client, SendEmailCommand } = await import("@aws-sdk/client-sesv2");
      const client = new SESv2Client({ region: region.trim(), credentials: { accessKeyId: key.trim(), secretAccessKey: secret.trim() } });
      const response = await client.send(new SendEmailCommand({
        FromEmailAddress: from.trim(),
        Destination: { ToAddresses: [to] },
        Content: { Simple: { Subject: { Data: subject }, Body: { Html: { Data: html } } } },
      }));
      // MessageId to klucz korelacji ze zdarzeniami SES (email_events).
      return { transport: "ses", ...(response.MessageId ? { sesMessageId: response.MessageId } : {}) };
    } catch (error) {
      // Np. DKIM jeszcze się propaguje albo chwilowy błąd SES — mail ma dojść,
      // więc próbujemy Resendem zanim oddamy błąd userowi.
      logger.error("[EmailWorkout] SES send failed, trying Resend fallback", error);
      return sendViaResend(to, subject, html);
    }
  }
  return sendViaResend(to, subject, html);
};

const buildEmailWorkoutDeps = (): EmailWorkoutDeps => ({
  getWorkout: async (workoutId) => {
    try {
      const snap = await db.collection(WORKOUTS_COLLECTION).doc(workoutId).get();
      if (!snap.exists) return null;
      return { id: snap.id, ...(snap.data() as Omit<EmailWorkout, "id">) };
    } catch (error) {
      // J-T1: bez logu błąd odczytu ginął jako generyczny 'internal' u klienta
      // ("Sending failed"). Log z detalami = diagnoza w minutę. Rethrow bez zmian.
      logger.error("[EmailWorkout] getWorkout failed", { workoutId, error });
      throw error;
    }
  },
  listWorkoutsInRange: async (uid, opts) => {
    try {
      let query = db.collection(WORKOUTS_COLLECTION)
        .where("userId", "==", uid)
        .where("completed", "==", true);
      // H-T2: filtr od dołu po dacie (range 'week'); range na polu orderBy = ten sam indeks.
      if (opts.sinceDate) query = query.where("date", ">=", opts.sinceDate);
      // J-T1: beforeDate (baseline PR) był w kontrakcie deps i testach czystej logiki,
      // ale adapter go ignorował — baseline zawierał sesje z zakresu i późniejsze.
      if (opts.beforeDate) query = query.where("date", "<", opts.beforeDate);
      const snap = await query
        .orderBy("date", "desc")
        .limit(opts.limit)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EmailWorkout, "id">) }));
    } catch (error) {
      // J-T1: brak composite indeksu workouts(userId, completed, date DESC) rzucał
      // failed-precondition, a klient widział tylko "Sending failed". Rethrow bez zmian.
      logger.error("[EmailWorkout] listWorkoutsInRange failed", { uid, opts, error });
      throw error;
    }
  },
  // H-T3: język maila (i displayName do tytułu) z users doc — to samo pole
  // language co weekly-digest; parametr klienta zostaje tylko fallbackiem.
  getUserContext: async (uid) => {
    const snap = await getUserRef(uid).get();
    const data = snap.data() ?? {};
    return {
      ...(typeof data.language === "string" ? { language: data.language } : {}),
      ...(typeof data.displayName === "string" ? { displayName: data.displayName } : {}),
    };
  },
  consumeQuota: async (uid, today) => {
    const ref = db.collection("email_quota").doc(uid);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data();
      const count = data?.date === today ? Number(data.count ?? 0) : 0;
      if (count >= EMAIL_DAILY_LIMIT) return false;
      tx.set(ref, { date: today, count: count + 1 });
      return true;
    });
  },
  sendEmail: sendWorkoutEmail,
  // G-T1: rejestr wysyłek dla panelu admina (rules: read tylko admin, write false).
  logEmail: async (entry) => {
    await db.collection("email_log").add(entry);
  },
});

const emailErrorToHttps = (code: string): never => {
  switch (code) {
    case "invalid-recipient": throw new HttpsError("invalid-argument", "invalid-recipient");
    case "invalid-range": throw new HttpsError("invalid-argument", "invalid-range");
    case "not-found": throw new HttpsError("not-found", "workout-not-found");
    case "forbidden": throw new HttpsError("permission-denied", "not-your-workout");
    case "quota-exceeded": throw new HttpsError("resource-exhausted", "daily-email-limit");
    case "empty-history": throw new HttpsError("failed-precondition", "empty-history");
    default: throw new HttpsError("internal", "send-failed");
  }
};

export const emailWorkoutSummary = onCall({ secrets: EMAIL_SECRETS }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "login-required");
  const { workoutId, to, lang } = (request.data ?? {}) as { workoutId?: string; to?: string; lang?: string };
  if (typeof workoutId !== "string" || !workoutId) throw new HttpsError("invalid-argument", "workoutId-required");
  const today = new Date().toISOString().slice(0, 10);
  const result = await runEmailWorkout(buildEmailWorkoutDeps(), {
    uid, workoutId, to, lang: lang === "en" ? "en" : "pl", today,
  });
  if (!result.ok) emailErrorToHttps(result.code);
  return { ok: true };
});

export const emailWorkoutHistory = onCall({ secrets: EMAIL_SECRETS }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "login-required");
  const { to, lang, range } = (request.data ?? {}) as { to?: string; lang?: string; range?: string };
  const today = new Date().toISOString().slice(0, 10);
  const result = await runEmailHistory(buildEmailWorkoutDeps(), {
    uid, to, lang: lang === "en" ? "en" : "pl", today,
    // H-T2: brak parametru = 'week'; nieznana wartość odpada w czystej logice.
    range: (range ?? "week") as HistoryEmailRange,
  });
  if (!result.ok) emailErrorToHttps(result.code);
  return { ok: true };
});

// --- G-T2: webhook zdarzeń SES (SNS -> email_events + aktualizacja email_log) ---
import MessageValidator from "sns-validator";
import { applyLogUpdate, mapSesEvent, parseSnsEnvelope, type EmailLogState } from "./ses-events";

// Pełny ARN topicu trzymany jako sekret (repo publiczne — nie commitujemy
// numeru konta AWS). Wszystko spoza tego topicu jest odrzucane.
const sesSnsTopicArn = defineSecret("SES_SNS_TOPIC_ARN");
const snsValidator = new MessageValidator();

// sns-validator: sprawdza SigningCertURL (tylko sns.<region>.amazonaws.com)
// i podpis SHA1withRSA całej koperty.
const validateSnsSignature = (message: Record<string, unknown>): Promise<void> =>
  new Promise((resolve, reject) => {
    snsValidator.validate(message, (err) => (err ? reject(err) : resolve()));
  });

export const sesEventsWebhook = onRequest({ secrets: [sesSnsTopicArn] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("method-not-allowed");
    return;
  }
  const bodyText = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body ?? {});
  const envelope = parseSnsEnvelope(bodyText);
  if (!envelope) {
    res.status(400).send("bad-envelope");
    return;
  }
  const expectedArn = sesSnsTopicArn.value().trim();
  if (!expectedArn || envelope.topicArn !== expectedArn) {
    logger.warn("[SesEvents] Odrzucono obcy TopicArn", { topicArn: envelope.topicArn });
    res.status(403).send("forbidden-topic");
    return;
  }
  try {
    await validateSnsSignature(envelope.raw);
  } catch (error) {
    logger.warn("[SesEvents] Nieprawidłowy podpis SNS", error);
    res.status(403).send("bad-signature");
    return;
  }

  if (envelope.type === "SubscriptionConfirmation") {
    if (!envelope.subscribeUrl) {
      res.status(400).send("missing-subscribe-url");
      return;
    }
    const confirm = await fetch(envelope.subscribeUrl);
    logger.info(`[SesEvents] SubscriptionConfirmation potwierdzone (HTTP ${confirm.status})`);
    res.status(200).send("subscription-confirmed");
    return;
  }
  if (envelope.type !== "Notification") {
    res.status(200).send("ignored");
    return;
  }

  let sesEvent: unknown;
  try {
    sesEvent = JSON.parse(envelope.message);
  } catch {
    res.status(400).send("bad-message");
    return;
  }
  const mapped = mapSesEvent(sesEvent);
  if (!mapped) {
    // 200: nierozpoznany kształt nie zniknie po retry SNS.
    logger.warn("[SesEvents] Nierozpoznane zdarzenie SES, pomijam");
    res.status(200).send("ignored");
    return;
  }

  // Idempotencja: deterministyczne id dokumentu, set z merge.
  await db.collection("email_events").doc(mapped.id).set(mapped.record, { merge: true });

  if (mapped.logUpdate) {
    const logSnap = await db.collection("email_log")
      .where("sesMessageId", "==", mapped.record.messageId)
      .limit(5)
      .get();
    for (const logDoc of logSnap.docs) {
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(logDoc.ref);
        if (!fresh.exists) return;
        const fields = applyLogUpdate((fresh.data() ?? {}) as EmailLogState, mapped.logUpdate);
        if (fields) tx.set(logDoc.ref, fields, { merge: true });
      });
    }
  }
  logger.info(`[SesEvents] ${mapped.record.eventType} zapisane`, { id: mapped.id });
  res.status(200).send("ok");
});
