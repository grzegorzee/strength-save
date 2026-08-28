import { createHash } from "crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { applyWorkoutHealthConsentBoundary } from "./workout-health-boundary";
import { LEGAL_VERSIONS } from "./legal-versions";
import { hasCallableAppAccess } from "./security";

export const WORKOUT_SYNC_V2_PROTOCOL = 2 as const;
const HEALTH_FIELDS = ["rpe", "pain", "quality"] as const;
const MAX_EXERCISES = 50;
const MAX_SETS = 100;

type HealthStatus = "none" | "stripped" | "written" | "pending";

export interface WorkoutSyncV2Input {
  v: typeof WORKOUT_SYNC_V2_PROTOCOL;
  sessionId: string;
  expectedRevision: number;
  writeId: string;
  healthEpoch?: number;
  healthGrantId?: string;
  healthMode?: "replace";
  exercises: Record<string, unknown>[];
  options: Record<string, unknown>;
}

export interface WorkoutSyncV2HealthCandidate extends Record<string, unknown> {
  userId: string;
  workoutId: string;
  healthEpoch: number;
  healthGrantId: string;
  sourceWriteId: string;
  baseRevision: number;
  metrics: Record<string, unknown>[];
  date?: string;
  updatedAt: number;
}

export type WorkoutHealthCommitDecision = "write" | "delete" | "noop";

export interface WorkoutSyncV2BasePlan {
  baseUpdate: Record<string, unknown> | null;
  healthCandidate: WorkoutSyncV2HealthCandidate | null;
  healthFieldsPresent: boolean;
  revision: number;
  updatedAt: number;
  alreadyApplied?: true;
}

export interface WorkoutSyncV2Result {
  updatedAt: number;
  revision: number;
  alreadyApplied?: true;
  health: HealthStatus;
}

export interface WorkoutSyncV2Deps {
  commitBase(
    uid: string,
    input: WorkoutSyncV2Input,
    build: (
      workout: Record<string, unknown> | null,
      profile: Record<string, unknown> | null,
      uid: string,
      now: number,
    ) => WorkoutSyncV2BasePlan,
  ): Promise<WorkoutSyncV2BasePlan>;
  commitHealth(
    uid: string,
    candidate: WorkoutSyncV2HealthCandidate,
    validateGrant: (profile: Record<string, unknown> | null) => boolean,
  ): Promise<boolean>;
}

export class WorkoutSyncV2Error extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "WorkoutSyncV2Error";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const isId = (value: unknown, max = 180): value is string => (
  typeof value === "string"
  && value.length >= 1
  && value.length <= max
  && !value.includes("/")
);

const finiteInRange = (value: unknown, min: number, max: number): value is number => (
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
);

const hasRecordedWork = (set: Record<string, unknown>): boolean => (
  set.completed !== true
  || [set.reps, set.durationSec, set.distanceM]
    .some((value) => typeof value === "number" && value > 0)
);

const cleanSet = (raw: unknown): Record<string, unknown> | null => {
  if (!isRecord(raw)) return null;
  if (!finiteInRange(raw.reps, 0, 999) || !Number.isInteger(raw.reps)) return null;
  if (!finiteInRange(raw.weight, 0, 2_000) || typeof raw.completed !== "boolean") return null;
  const set: Record<string, unknown> = {
    reps: raw.reps,
    weight: raw.weight,
    completed: raw.completed,
  };
  if (raw.isWarmup === true) set.isWarmup = true;
  if (finiteInRange(raw.updatedAt, 0, Number.MAX_SAFE_INTEGER)) set.updatedAt = raw.updatedAt;
  if (isId(raw.updatedEventId, 180)) set.updatedEventId = raw.updatedEventId;
  if (finiteInRange(raw.durationSec, 0, 86_400)) set.durationSec = raw.durationSec;
  if (finiteInRange(raw.distanceM, 0, 1_000_000)) set.distanceM = raw.distanceM;
  if (finiteInRange(raw.assistWeight, 0, 2_000)) set.assistWeight = raw.assistWeight;
  if (!hasRecordedWork(set)) return null;
  return set;
};

const cleanExercise = (raw: Record<string, unknown>): Record<string, unknown> => {
  if (!isId(raw.exerciseId, 180) || !Array.isArray(raw.sets) || raw.sets.length > MAX_SETS) {
    throw new WorkoutSyncV2Error("INVALID_WORKOUT_PAYLOAD");
  }
  const sets = raw.sets.map(cleanSet);
  if (sets.some((set) => set === null)) throw new WorkoutSyncV2Error("INVALID_WORKOUT_PAYLOAD");
  return {
    exerciseId: raw.exerciseId,
    sets,
    ...(typeof raw.notes === "string" && raw.notes.length > 0
      ? { notes: raw.notes.slice(0, 2_000) }
      : {}),
    ...(typeof raw.name === "string" && raw.name.length > 0
      ? { name: raw.name.slice(0, 200) }
      : {}),
  };
};

const cleanOptions = (raw: Record<string, unknown>): Record<string, unknown> => {
  const value: Record<string, unknown> = {};
  if (isId(raw.cycleId, 180)) value.cycleId = raw.cycleId;
  if (typeof raw.notes === "string") value.notes = raw.notes.slice(0, 5_000);
  if (Array.isArray(raw.skippedExercises)) {
    const ids = raw.skippedExercises.filter((id): id is string => isId(id, 180)).slice(0, MAX_EXERCISES);
    value.skippedExercises = ids;
  }
  if (raw.completed === true) {
    value.completed = true;
    value.completedAt = finiteInRange(raw.completedAt, 1, Number.MAX_SAFE_INTEGER)
      ? raw.completedAt
      : undefined;
  }
  if (typeof raw.dayName === "string" && raw.dayName.length > 0) value.dayName = raw.dayName.slice(0, 200);
  if (typeof raw.dayFocus === "string" && raw.dayFocus.length > 0) value.dayFocus = raw.dayFocus.slice(0, 200);
  if (finiteInRange(raw.durationSec, 0, 7 * 24 * 60 * 60)) value.durationSec = Math.floor(raw.durationSec);
  if (finiteInRange(raw.startedAt, 1, Number.MAX_SAFE_INTEGER)) value.startedAt = raw.startedAt;
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
};

const healthConsentState = (profile: Record<string, unknown> | null): Record<string, unknown> | null => {
  const consents = profile?.consents;
  return isRecord(consents) ? consents : null;
};

const requestedGrantMatches = (
  profile: Record<string, unknown> | null,
  input: WorkoutSyncV2Input,
): boolean => {
  const consent = healthConsentState(profile);
  return consent?.healthGranted === true
    && consent.healthVersion === LEGAL_VERSIONS.health
    && Number.isSafeInteger(consent.healthEpoch)
    && consent.healthEpoch === input.healthEpoch
    && typeof consent.healthGrantId === "string"
    && consent.healthGrantId.length > 0
    && consent.healthGrantId === input.healthGrantId;
};

const preserveLegacyEmbeddedHealth = (
  incoming: Record<string, unknown>[],
  current: unknown,
): Record<string, unknown>[] => {
  if (!Array.isArray(current)) return incoming;
  const legacyByExercise = new Map<string, Record<string, unknown>>();
  current.forEach((item) => {
    if (isRecord(item) && typeof item.exerciseId === "string" && !legacyByExercise.has(item.exerciseId)) {
      legacyByExercise.set(item.exerciseId, item);
    }
  });
  return incoming.map((exercise) => {
    const legacy = legacyByExercise.get(exercise.exerciseId as string);
    if (!legacy) return exercise;
    const preserved: Record<string, unknown> = { ...exercise };
    HEALTH_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(legacy, field)) preserved[field] = legacy[field];
    });
    return preserved;
  });
};

const digest = (value: unknown): string => createHash("sha256")
  .update(JSON.stringify(value))
  .digest("hex");

export const parseWorkoutSyncV2Input = (raw: unknown): WorkoutSyncV2Input => {
  if (!isRecord(raw)
    || raw.v !== WORKOUT_SYNC_V2_PROTOCOL
    || !isId(raw.sessionId)
    || !Number.isSafeInteger(raw.expectedRevision)
    || (raw.expectedRevision as number) < 0
    || !isId(raw.writeId)
    || !Array.isArray(raw.exercises)
    || raw.exercises.length > MAX_EXERCISES
    || !raw.exercises.every(isRecord)
    || !isRecord(raw.options)
    || (raw.healthMode !== undefined && raw.healthMode !== "replace")) {
    throw new WorkoutSyncV2Error("INVALID_WORKOUT_PAYLOAD");
  }
  return raw as unknown as WorkoutSyncV2Input;
};

/**
 * A health side-write is committed after the base workout. Re-checking the
 * current base prevents a delayed retry from recreating deleted data or
 * overwriting metrics from a newer revision.
 */
export function decideWorkoutHealthCommit(input: {
  baseWorkout: Record<string, unknown> | null;
  currentHealth: Record<string, unknown> | null;
  candidate: WorkoutSyncV2HealthCandidate;
}): WorkoutHealthCommitDecision {
  const { baseWorkout, currentHealth, candidate } = input;
  if (!baseWorkout || baseWorkout.userId !== candidate.userId) return "noop";
  if (baseWorkout.revision !== candidate.baseRevision
    || baseWorkout.lastWriteId !== candidate.sourceWriteId) return "noop";

  if (currentHealth) {
    if (currentHealth.userId !== candidate.userId
      || currentHealth.workoutId !== candidate.workoutId) return "noop";
    if (!Number.isSafeInteger(currentHealth.baseRevision)) return "noop";
    if ((currentHealth.baseRevision as number) >= candidate.baseRevision) return "noop";
  }

  return candidate.metrics.length === 0 ? "delete" : "write";
}

export function buildWorkoutSyncV2BasePlan(
  workout: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
  uid: string,
  rawInput: WorkoutSyncV2Input,
  now: number,
): WorkoutSyncV2BasePlan {
  const input = parseWorkoutSyncV2Input(rawInput);
  if (!workout) throw new WorkoutSyncV2Error("WORKOUT_NOT_FOUND");
  if (workout.userId !== uid) throw new WorkoutSyncV2Error("WORKOUT_FORBIDDEN");

  const rawHealthFieldsPresent = input.exercises.some((exercise) => (
    HEALTH_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(exercise, field))
  ));
  const healthFieldsPresent = input.healthMode === "replace" || rawHealthFieldsPresent;
  const consent = requestedGrantMatches(profile, input) ? healthConsentState(profile) : null;
  const boundary = applyWorkoutHealthConsentBoundary(input.exercises, consent);
  const baseExercises = boundary.exercises.map(cleanExercise);
  const metrics = boundary.healthGrant ? boundary.exercises.flatMap((exercise) => {
    const metric: Record<string, unknown> = { exerciseId: exercise.exerciseId };
    HEALTH_FIELDS.forEach((field) => {
      if (typeof exercise[field] === "number") metric[field] = exercise[field];
    });
    return Object.keys(metric).length > 1 ? [metric] : [];
  }) : [];
  const options = cleanOptions(input.options);
  const writeDigest = digest({
    exercises: baseExercises,
    options,
    healthEpoch: input.healthEpoch ?? null,
    healthGrantId: input.healthGrantId ?? null,
    healthMode: input.healthMode ?? null,
    metrics,
  });
  const currentRevision = Number.isSafeInteger(workout.revision) && (workout.revision as number) >= 0
    ? workout.revision as number
    : 0;

  const explicitClear = input.healthMode === "replace" && !rawHealthFieldsPresent;
  const healthCandidate = boundary.healthGrant && (metrics.length > 0 || explicitClear) ? {
    userId: uid,
    workoutId: input.sessionId,
    healthEpoch: boundary.healthGrant.healthEpoch,
    healthGrantId: boundary.healthGrant.healthGrantId,
    sourceWriteId: input.writeId,
    baseRevision: workout.lastWriteId === input.writeId ? currentRevision : currentRevision + 1,
    metrics,
    ...(typeof workout.date === "string" && { date: workout.date }),
    updatedAt: now,
  } : null;

  if (workout.lastWriteId === input.writeId) {
    if (typeof workout.lastWriteDigest === "string" && workout.lastWriteDigest !== writeDigest) {
      throw new WorkoutSyncV2Error("WORKOUT_WRITE_ID_REUSED");
    }
    return {
      baseUpdate: null,
      healthCandidate,
      healthFieldsPresent,
      revision: currentRevision,
      updatedAt: typeof workout.updatedAt === "number" ? workout.updatedAt : now,
      alreadyApplied: true,
    };
  }
  if (currentRevision !== input.expectedRevision) {
    throw new WorkoutSyncV2Error("WORKOUT_CONFLICT");
  }

  const revision = currentRevision + 1;
  return {
    baseUpdate: {
      exercises: preserveLegacyEmbeddedHealth(baseExercises, workout.exercises),
      ...options,
      updatedAt: now,
      revision,
      lastWriteId: input.writeId,
      lastWriteDigest: writeDigest,
    },
    healthCandidate: healthCandidate ? { ...healthCandidate, baseRevision: revision } : null,
    healthFieldsPresent,
    revision,
    updatedAt: now,
  };
}

export async function executeWorkoutSyncV2(
  uid: string,
  rawInput: WorkoutSyncV2Input,
  deps: WorkoutSyncV2Deps,
): Promise<WorkoutSyncV2Result> {
  const input = parseWorkoutSyncV2Input(rawInput);
  const base = await deps.commitBase(uid, input, (workout, profile, owner, now) => (
    buildWorkoutSyncV2BasePlan(workout, profile, owner, input, now)
  ));
  let health: HealthStatus = base.healthFieldsPresent ? "stripped" : "none";
  if (base.healthCandidate) {
    try {
      const written = await deps.commitHealth(
        uid,
        base.healthCandidate,
        (profile) => requestedGrantMatches(profile, input),
      );
      health = written ? "written" : "stripped";
    } catch {
      health = "pending";
    }
  }
  return {
    updatedAt: base.updatedAt,
    revision: base.revision,
    ...(base.alreadyApplied ? { alreadyApplied: true as const } : {}),
    health,
  };
}

const firestoreDeps: WorkoutSyncV2Deps = {
  async commitBase(uid, input, build) {
    const db = admin.firestore();
    return db.runTransaction(async (transaction) => {
      const workoutRef = db.collection("workouts").doc(input.sessionId);
      const profileRef = db.collection("users").doc(uid);
      const [workoutSnap, profileSnap] = await Promise.all([
        transaction.get(workoutRef),
        transaction.get(profileRef),
      ]);
      const profile = profileSnap.exists ? profileSnap.data() as Record<string, unknown> : null;
      if (!hasCallableAppAccess(profile ?? undefined)) throw new WorkoutSyncV2Error("ACCESS_DENIED");
      const plan = build(
        workoutSnap.exists ? workoutSnap.data() as Record<string, unknown> : null,
        profile,
        uid,
        Date.now(),
      );
      if (plan.baseUpdate) transaction.update(workoutRef, plan.baseUpdate);
      return plan;
    });
  },
  async commitHealth(uid, candidate, validateGrant) {
    const db = admin.firestore();
    return db.runTransaction(async (transaction) => {
      const profileRef = db.collection("users").doc(uid);
      const workoutRef = db.collection("workouts").doc(candidate.workoutId);
      const healthRef = db.collection("workout_health_v2").doc(candidate.workoutId);
      const [profileSnap, workoutSnap, healthSnap] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(workoutRef),
        transaction.get(healthRef),
      ]);
      const profile = profileSnap.exists ? profileSnap.data() as Record<string, unknown> : null;
      if (!validateGrant(profile)) return false;
      const decision = decideWorkoutHealthCommit({
        baseWorkout: workoutSnap.exists ? workoutSnap.data() as Record<string, unknown> : null,
        currentHealth: healthSnap.exists ? healthSnap.data() as Record<string, unknown> : null,
        candidate,
      });
      if (decision === "noop") return true;
      if (decision === "delete") {
        transaction.delete(healthRef);
        transaction.update(workoutRef, {
          healthSidecarPresent: false,
          healthSidecarRevision: candidate.baseRevision,
        });
      } else {
        transaction.set(healthRef, candidate);
        transaction.update(workoutRef, {
          healthSidecarPresent: true,
          healthSidecarRevision: candidate.baseRevision,
        });
      }
      return true;
    });
  },
};

const mapHttpsError = (error: unknown): never => {
  const code = error instanceof WorkoutSyncV2Error ? error.code : "INTERNAL";
  if (code === "WORKOUT_NOT_FOUND") throw new HttpsError("not-found", code);
  if (code === "WORKOUT_FORBIDDEN" || code === "ACCESS_DENIED") throw new HttpsError("permission-denied", code);
  if (code === "WORKOUT_CONFLICT" || code === "WORKOUT_WRITE_ID_REUSED") {
    throw new HttpsError("aborted", code);
  }
  if (code === "INVALID_WORKOUT_PAYLOAD") throw new HttpsError("invalid-argument", code);
  throw new HttpsError("internal", "WORKOUT_SYNC_V2_FAILED");
};

export const syncWorkoutV2 = onCall(
  { region: "us-central1", enforceAppCheck: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    try {
      return await executeWorkoutSyncV2(uid, parseWorkoutSyncV2Input(request.data), firestoreDeps);
    } catch (error) {
      return mapHttpsError(error);
    }
  },
);
