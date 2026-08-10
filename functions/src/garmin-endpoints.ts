// Z125: endpointy Garmin Connect IQ.
// Callable (user zalogowany w apce): garminPairStart, garminDevices, garminRevokeDevice.
// HTTP (zegarek, token urządzenia w Authorization: Bearer): garminPair, garminDay, garminIngest.
// Bezpieczeństwo: w Firestore tylko hashe (pepper = sekret API_KEY_PEPPER), kody TTL 10 min
// jednorazowe, rate limit per token, CORS domyślnie zamknięty (zegarek nie wysyła Origin).
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import {
  authenticateDevice,
  DEVICE_TOKEN_TTL_MS,
  deviceIdFromTokenHash,
  exchangeCode,
  hashSecret,
  randomDeviceToken,
  randomPairCode,
  startPairing,
  type GarminPairDeps,
  type PairCodeDoc,
  type DeviceTokenDoc,
} from "./garmin-pair";
import {
  resolveGarminEntitlement,
  type GarminCapabilitySnapshot,
  type GarminEntitlementProfile,
} from "./garmin-entitlement";
import {
  buildGarminDayContext,
  buildRecentExercises,
  isGarminResponseWithinLimit,
  type GarminPlanDay,
  type GarminWorkout,
} from "./garmin-day";
import {
  mergeCanonicalWorkoutDocuments,
  runGarminIngest,
  type GarminTrackingType,
} from "./garmin-ingest";

const garminPepper = defineSecret("API_KEY_PEPPER");

const PAIR_CODES_COLLECTION = "device_pair_codes";
const DEVICE_TOKENS_COLLECTION = "device_tokens";
/** Minimalny odstęp między żądaniami z jednego tokenu (podstawowy rate limit). */
const MIN_REQUEST_INTERVAL_MS = 2000;

const getDb = () => admin.firestore();

const makePairDeps = (pepper: string): GarminPairDeps => ({
  getPairCode: async (codeHash) => {
    const snap = await getDb().collection(PAIR_CODES_COLLECTION).doc(codeHash).get();
    return snap.exists ? (snap.data() as PairCodeDoc) : null;
  },
  savePairCode: async (codeHash, doc) => {
    await getDb().collection(PAIR_CODES_COLLECTION).doc(codeHash).set({
      ...doc,
      // TTL Firestore: kody znikają same godzinę po wygaśnięciu.
      expiresAtTtl: Timestamp.fromMillis(doc.expiresAt + 60 * 60 * 1000),
    });
  },
  markCodeUsed: async (codeHash) => {
    await getDb().collection(PAIR_CODES_COLLECTION).doc(codeHash).update({ usedAt: Date.now() });
  },
  saveDeviceToken: async (tokenHash, doc) => {
    await getDb().collection(DEVICE_TOKENS_COLLECTION).doc(tokenHash).set(doc);
  },
  getDeviceToken: async (tokenHash) => {
    const snap = await getDb().collection(DEVICE_TOKENS_COLLECTION).doc(tokenHash).get();
    return snap.exists ? (snap.data() as DeviceTokenDoc) : null;
  },
  touchDeviceToken: async (tokenHash, lastUsedAt) => {
    await getDb().collection(DEVICE_TOKENS_COLLECTION).doc(tokenHash).update({ lastUsedAt });
  },
  now: () => Date.now(),
  randomCode: randomPairCode,
  randomToken: randomDeviceToken,
  pepper,
});

/** Callable: user w Ustawieniach generuje kod parowania. */
export const garminPairStart = onCall({ secrets: [garminPepper] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const profileSnap = await getDb().collection("users").doc(request.auth.uid).get();
  const entitlement = resolveGarminEntitlement(
    profileSnap.exists ? profileSnap.data() as GarminEntitlementProfile : undefined,
  );
  if (!entitlement.active) throw new HttpsError("permission-denied", "PRO required");
  const label = typeof request.data?.label === "string" && request.data.label.trim()
    ? request.data.label.trim()
    : "Garmin";
  const deps = makePairDeps(garminPepper.value());
  return startPairing(deps, request.auth.uid, label);
});

/** Callable: lista sparowanych urządzeń usera (bez hashy tokenów). */
export const garminDevices = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const snap = await getDb().collection(DEVICE_TOKENS_COLLECTION)
    .where("uid", "==", request.auth.uid).get();
  const devices = snap.docs
    .filter((doc) => (doc.data() as DeviceTokenDoc).revokedAt === null)
    .filter((doc) => {
      const data = doc.data() as DeviceTokenDoc;
      return Date.now() <= (data.expiresAt ?? data.createdAt + DEVICE_TOKEN_TTL_MS);
    })
    .map((doc) => {
      const data = doc.data() as DeviceTokenDoc;
      return {
        deviceId: deviceIdFromTokenHash(doc.id),
        label: data.label,
        createdAt: data.createdAt,
        lastUsedAt: data.lastUsedAt,
        expiresAt: data.expiresAt ?? null,
      };
    });
  return { devices };
});

/** Callable used by account logout/delete flows: all Garmin bearer tokens stop. */
export const garminRevokeAllDevices = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const snap = await getDb().collection(DEVICE_TOKENS_COLLECTION)
    .where("uid", "==", request.auth.uid).get();
  const active = snap.docs.filter((doc) => (doc.data() as DeviceTokenDoc).revokedAt === null);
  const batch = getDb().batch();
  const revokedAt = Date.now();
  for (const doc of active) batch.update(doc.ref, { revokedAt });
  if (active.length > 0) await batch.commit();
  return { revoked: active.length };
});

/** Callable: odłączenie urządzenia (revoke tokenu). */
export const garminRevokeDevice = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in");
  const deviceId = typeof request.data?.deviceId === "string" ? request.data.deviceId : "";
  if (!/^[a-f0-9]{12}$/.test(deviceId)) throw new HttpsError("invalid-argument", "Bad deviceId");
  const snap = await getDb().collection(DEVICE_TOKENS_COLLECTION)
    .where("uid", "==", request.auth.uid).get();
  const target = snap.docs.find((doc) => deviceIdFromTokenHash(doc.id) === deviceId);
  if (!target) throw new HttpsError("not-found", "Device not found");
  await target.ref.update({ revokedAt: Date.now() });
  return { revoked: true };
});

/** HTTP: zegarek wymienia 6-cyfrowy kod na token urządzenia. */
export const garminPair = onRequest({ secrets: [garminPepper] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method-not-allowed" });
    return;
  }
  const deps = makePairDeps(garminPepper.value());
  const result = await exchangeCode(deps, req.body?.code);
  if (!result.ok) {
    logger.info("garminPair rejected", { reason: result.reason });
    res.status(401).json({ error: result.reason });
    return;
  }
  const profileSnap = await getDb().collection("users").doc(result.uid).get();
  const entitlement = resolveGarminEntitlement(
    profileSnap.exists ? profileSnap.data() as GarminEntitlementProfile : undefined,
  );
  if (!entitlement.active) {
    const tokenHash = hashSecret(result.token, garminPepper.value());
    await getDb().collection(DEVICE_TOKENS_COLLECTION).doc(tokenHash).update({ revokedAt: Date.now() });
    res.status(403).json({ error: "pro-required", z: entitlement.snapshot });
    return;
  }
  res.json({ token: result.token, deviceId: result.deviceId });
});

const bearerToken = (header: unknown): string | null => {
  if (typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
};

interface GarminJsonResponse {
  status(code: number): GarminJsonResponse;
  json(payload: unknown): unknown;
}

const sendGarminDayPayload = (
  res: GarminJsonResponse,
  payload: Record<string, unknown>,
): void => {
  if (!isGarminResponseWithinLimit(payload)) {
    logger.error("garminDay payload exceeds transport budget", {
      bytes: Buffer.byteLength(JSON.stringify(payload), "utf8"),
    });
    res.status(413).json({ v: 1, error: "payload-too-large" });
    return;
  }
  res.json(payload);
};

async function authorizedDevice(
  pepper: string,
  authorizationHeader: unknown,
): Promise<{
  uid: string;
  deviceId: string;
  entitlement: GarminCapabilitySnapshot;
} | { status: number; error: string; entitlement?: GarminCapabilitySnapshot }> {
  const token = bearerToken(authorizationHeader);
  if (!token) return { status: 401, error: "missing-token" };
  const deps = makePairDeps(pepper);
  const auth = await authenticateDevice(deps, token);
  if (!auth) return { status: 401, error: "invalid-token" };
  if (Date.now() - auth.lastUsedAt < MIN_REQUEST_INTERVAL_MS) return { status: 429, error: "rate-limited" };
  const profileSnap = await getDb().collection("users").doc(auth.uid).get();
  const entitlement = resolveGarminEntitlement(
    profileSnap.exists ? profileSnap.data() as GarminEntitlementProfile : undefined,
  );
  if (!entitlement.active) return {
    status: 403,
    error: "pro-required",
    entitlement: entitlement.snapshot,
  };
  return { uid: auth.uid, deviceId: auth.deviceId, entitlement: entitlement.snapshot };
}

/** HTTP: kontekst dnia dla zegarka (kompaktowy JSON < 8KB). */
export const garminDay = onRequest({ secrets: [garminPepper] }, async (req, res) => {
  const auth = await authorizedDevice(garminPepper.value(), req.headers.authorization);
  if ("status" in auth) {
    res.status(auth.status).json({
      error: auth.error,
      ...("entitlement" in auth ? { z: auth.entitlement } : {}),
    });
    return;
  }
  const date = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : new Date().toISOString().slice(0, 10);

  const db = getDb();
  const planSnap = await db.collection("training_plans").doc(auth.uid).get();
  const planDays = (planSnap.exists ? planSnap.data()?.days : null) as GarminPlanDay[] | null;

  // Historia do pre-fill/celów: ostatnie 60 dni (1 kwerenda na start treningu, bez pollingu).
  // Pobierana też w dni wolne — z niej budujemy listę ostatnich ćwiczeń (r) dla
  // szybkiego treningu na zegarku.
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const workoutsSnap = await db.collection("workouts")
    .where("userId", "==", auth.uid)
    .where("date", ">=", since)
    .get();
  const workouts = workoutsSnap.docs.map((doc) => doc.data() as GarminWorkout);
  const recents = buildRecentExercises(workouts);
  const recentsField = recents.length > 0 ? { r: recents } : {};

  if (!Array.isArray(planDays) || planDays.length === 0) {
    sendGarminDayPayload(res, { v: 1, d: date, rest: true, z: auth.entitlement, ...recentsField });
    return;
  }

  const notesSnap = await db.collection("exercise_notes")
    .where("userId", "==", auth.uid).get();
  const notes: Record<string, string> = {};
  for (const doc of notesSnap.docs) {
    const data = doc.data() as { exerciseName?: string; note?: string; machineSettings?: string };
    if (!data.exerciseName) continue;
    const text = [data.note, data.machineSettings].filter(Boolean).join(" · ");
    if (text) notes[data.exerciseName] = text;
  }

  const customExercisesSnap = await db.collection("custom_exercises")
    .where("userId", "==", auth.uid).limit(100).get();
  const trackingByName: Record<string, GarminTrackingType> = {};
  const supportedTracking = new Set<GarminTrackingType>([
    "weight_reps", "duration", "weight_distance_duration", "assisted_bodyweight",
  ]);
  for (const doc of customExercisesSnap.docs) {
    const data = doc.data() as { name?: unknown; tracking?: unknown };
    if (typeof data.name === "string" && supportedTracking.has(data.tracking as GarminTrackingType)) {
      trackingByName[data.name.toLocaleLowerCase("pl")] = data.tracking as GarminTrackingType;
    }
  }

  const context = buildGarminDayContext(planDays, workouts, date, notes, trackingByName);
  if (!context) {
    sendGarminDayPayload(res, { v: 1, d: date, rest: true, z: auth.entitlement, ...recentsField });
    return;
  }
  sendGarminDayPayload(res, { ...context, z: auth.entitlement, ...recentsField });
});

/** HTTP: paczka zdarzeń odhaczeń + zakończenie treningu z zegarka. */
export const garminIngest = onRequest({ secrets: [garminPepper] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method-not-allowed" });
    return;
  }
  const auth = await authorizedDevice(garminPepper.value(), req.headers.authorization);
  if ("status" in auth) {
    res.status(auth.status).json({
      error: auth.error,
      ...("entitlement" in auth ? { z: auth.entitlement } : {}),
    });
    return;
  }

  const result = await runGarminIngest({
    findCanonicalSession: async (uid, date, dayId) => {
      const snap = await getDb().collection("workouts")
        .where("userId", "==", uid)
        .where("date", "==", date)
        .get();
      const candidates = snap.docs
        .filter((doc) => doc.data()?.dayId === dayId)
        .sort((a, b) => Number(b.data()?.updatedAt ?? b.data()?.completedAt ?? 0)
          - Number(a.data()?.updatedAt ?? a.data()?.completedAt ?? 0));
      const canonical = candidates[0];
      return canonical ? { docId: canonical.id, doc: canonical.data() } : null;
    },
    saveWorkout: async (docId, doc) => {
      const ref = getDb().collection("workouts").doc(docId);
      await getDb().runTransaction(async (transaction) => {
        const current = await transaction.get(ref);
        const next = current.exists
          ? mergeCanonicalWorkoutDocuments(current.data()!, doc, Date.now())
          : doc;
        transaction.set(ref, next);
      });
    },
    now: () => Date.now(),
  }, auth.uid, auth.deviceId, req.body);

  if (!result.ok) {
    res.status(400).json({ error: result.reason });
    return;
  }
  logger.info("garminIngest saved", {
    uid: auth.uid, docId: result.docId, adhoc: result.adhoc, merged: result.merged,
  });
  res.json({ saved: true, docId: result.docId, adhoc: result.adhoc, merged: result.merged });
});
