import { createHash } from "crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { LEGAL_VERSIONS } from "./legal-versions";
import { hasCallableAppAccess } from "./security";

export const WORKOUT_RESTORE_V3_PROTOCOL = 3 as const;
const MAX_EXERCISES = 50;
const MAX_SETS = 100;
const HEALTH_FIELDS = ["rpe", "pain", "quality"] as const;

export interface WorkoutRestoreV3Input {
  v: typeof WORKOUT_RESTORE_V3_PROTOCOL;
  restoreId: string;
  workout: Record<string, unknown>;
  health?: {
    workoutId: string;
    metrics: Record<string, unknown>[];
  };
  healthEpoch?: number;
  healthGrantId?: string;
}

export interface ParsedWorkoutRestoreV3Input extends WorkoutRestoreV3Input {
  workout: Record<string, unknown> & { id: string; exercises: Record<string, unknown>[] };
  health?: { workoutId: string; metrics: Record<string, unknown>[] };
}

export interface WorkoutRestoreV3Result {
  status: "restored" | "already-present";
  workoutId: string;
}

export interface WorkoutRestoreV3Plan extends WorkoutRestoreV3Result {
  baseDoc: Record<string, unknown> | null;
  healthDoc: Record<string, unknown> | null;
}

export interface WorkoutRestoreV3Deps {
  commit(
    uid: string,
    input: ParsedWorkoutRestoreV3Input,
    build: (
      workout: Record<string, unknown> | null,
      health: Record<string, unknown> | null,
      profile: Record<string, unknown> | null,
      uid: string,
      now: number,
    ) => WorkoutRestoreV3Plan,
  ): Promise<WorkoutRestoreV3Plan>;
}

export class WorkoutRestoreV3Error extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "WorkoutRestoreV3Error";
  }
}

const fail = (code = "INVALID_RESTORE_PAYLOAD"): never => {
  throw new WorkoutRestoreV3Error(code);
};

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

const optionalText = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
  max: number,
): void => {
  if (value === undefined) return;
  if (typeof value !== "string") fail();
  target[key] = (value as string).slice(0, max);
};

const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const cleanSet = (raw: unknown): Record<string, unknown> => {
  if (!isRecord(raw)
    || !Number.isInteger(raw.reps)
    || !finiteInRange(raw.reps, 0, 999)
    || !finiteInRange(raw.weight, 0, 2_000)
    || typeof raw.completed !== "boolean") fail();
  const value = raw as Record<string, unknown>;

  const set: Record<string, unknown> = {
    reps: value.reps,
    weight: value.weight,
    completed: value.completed,
  };
  if (value.isWarmup === true) set.isWarmup = true;
  if (value.updatedAt !== undefined) {
    if (!Number.isSafeInteger(value.updatedAt) || (value.updatedAt as number) < 0) fail();
    set.updatedAt = value.updatedAt;
  }
  if (value.updatedEventId !== undefined) {
    if (!isId(value.updatedEventId)) fail();
    set.updatedEventId = value.updatedEventId;
  }
  if (value.durationSec !== undefined) {
    if (!finiteInRange(value.durationSec, 0, 86_400)) fail();
    set.durationSec = value.durationSec;
  }
  if (value.distanceM !== undefined) {
    if (!finiteInRange(value.distanceM, 0, 1_000_000)) fail();
    set.distanceM = value.distanceM;
  }
  if (value.assistWeight !== undefined) {
    if (!finiteInRange(value.assistWeight, 0, 2_000)) fail();
    set.assistWeight = value.assistWeight;
  }
  if (!hasRecordedWork(set)) fail();
  return set;
};

const cleanExercise = (raw: unknown): Record<string, unknown> => {
  if (!isRecord(raw) || !isId(raw.exerciseId) || !Array.isArray(raw.sets)) fail();
  const value = raw as Record<string, unknown>;
  if (HEALTH_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(value, field))) fail();
  const exercise: Record<string, unknown> = {
    exerciseId: value.exerciseId,
    sets: (value.sets as unknown[]).map(cleanSet),
  };
  optionalText(exercise, "notes", value.notes, 2_000);
  optionalText(exercise, "name", value.name, 200);
  return exercise;
};

const cleanWorkout = (raw: unknown): ParsedWorkoutRestoreV3Input["workout"] => {
  if (!isRecord(raw)
    || !isId(raw.id)
    || !isId(raw.dayId)
    || !isCalendarDate(raw.date)
    || typeof raw.completed !== "boolean"
    || !Array.isArray(raw.exercises)
    || raw.exercises.length > MAX_EXERCISES) fail();
  const value = raw as Record<string, unknown>;

  const exercises = (value.exercises as unknown[]).map(cleanExercise);
  const totalSets = exercises.reduce((sum, exercise) => (
    sum + (exercise.sets as Record<string, unknown>[]).length
  ), 0);
  if (totalSets > MAX_SETS) fail();

  const workout: Record<string, unknown> & { id: string; exercises: Record<string, unknown>[] } = {
    id: value.id as string,
    dayId: value.dayId,
    date: value.date,
    exercises,
    completed: value.completed,
  };
  optionalText(workout, "notes", value.notes, 5_000);
  optionalText(workout, "dayName", value.dayName, 200);
  optionalText(workout, "dayFocus", value.dayFocus, 200);

  if (value.cycleId !== undefined) {
    if (!isId(value.cycleId)) fail();
    workout.cycleId = value.cycleId;
  }
  if (value.skippedExercises !== undefined) {
    if (!Array.isArray(value.skippedExercises)
      || value.skippedExercises.length > MAX_EXERCISES
      || !value.skippedExercises.every((id: unknown) => isId(id))) fail();
    workout.skippedExercises = [...(value.skippedExercises as unknown[])];
  }
  if (value.durationSec !== undefined) {
    if (!finiteInRange(value.durationSec, 0, 7 * 24 * 60 * 60)) fail();
    workout.durationSec = Math.floor(value.durationSec as number);
  }
  for (const key of ["startedAt", "completedAt", "updatedAt"] as const) {
    if (value[key] === undefined) continue;
    if (!Number.isSafeInteger(value[key]) || (value[key] as number) < 0) fail();
    workout[key] = value[key];
  }
  if (value.revision !== undefined) {
    if (!Number.isSafeInteger(value.revision) || (value.revision as number) < 0) fail();
    workout.revision = value.revision;
  }
  if (value.importBatchId !== undefined) {
    if (!isId(value.importBatchId)) fail();
    workout.importBatchId = value.importBatchId;
  }
  if (value.sessionRating !== undefined) {
    if (value.sessionRating !== "up" && value.sessionRating !== "down") fail();
    workout.sessionRating = value.sessionRating;
  }
  if (value.sessionRatingReasons !== undefined) {
    if (!Array.isArray(value.sessionRatingReasons)
      || value.sessionRatingReasons.length > 3
      || !value.sessionRatingReasons.every((reason: unknown) => (
        reason === "too_heavy" || reason === "too_long" || reason === "weak_day"
      ))) fail();
    workout.sessionRatingReasons = [...(value.sessionRatingReasons as unknown[])];
  }
  return workout;
};

const isAligned = (value: unknown, min: number, max: number, step: number): value is number => {
  if (!finiteInRange(value, min, max)) return false;
  const units = (value - min) / step;
  return Math.abs(units - Math.round(units)) < Number.EPSILON * 8;
};

const cleanHealth = (
  raw: unknown,
  workout: ParsedWorkoutRestoreV3Input["workout"],
): ParsedWorkoutRestoreV3Input["health"] => {
  if (!isRecord(raw)
    || raw.workoutId !== workout.id
    || !Array.isArray(raw.metrics)
    || raw.metrics.length < 1
    || raw.metrics.length > MAX_EXERCISES) fail();
  const value = raw as Record<string, unknown>;
  const exerciseIds = new Set(workout.exercises.map((exercise) => exercise.exerciseId as string));
  const seen = new Set<string>();
  const metrics = (value.metrics as unknown[]).map((metric) => {
    if (!isRecord(metric)
      || !isId(metric.exerciseId)
      || !exerciseIds.has(metric.exerciseId)
      || seen.has(metric.exerciseId)) fail();
    const item = metric as Record<string, unknown>;
    seen.add(item.exerciseId as string);
    const clean: Record<string, unknown> = { exerciseId: item.exerciseId };
    if (item.rpe !== undefined) {
      if (!isAligned(item.rpe, 0, 10, 0.5)) fail();
      clean.rpe = item.rpe;
    }
    if (item.pain !== undefined) {
      if (!isAligned(item.pain, 0, 10, 1)) fail();
      clean.pain = item.pain;
    }
    if (item.quality !== undefined) {
      if (!isAligned(item.quality, 0, 5, 1)) fail();
      clean.quality = item.quality;
    }
    if (Object.keys(clean).length === 1) fail();
    return clean;
  });
  return { workoutId: value.workoutId as string, metrics };
};

export function parseWorkoutRestoreV3Input(raw: unknown): ParsedWorkoutRestoreV3Input {
  if (!isRecord(raw)
    || raw.v !== WORKOUT_RESTORE_V3_PROTOCOL
    || !isId(raw.restoreId)
    || !isRecord(raw.workout)) fail();
  const value = raw as Record<string, unknown>;
  const workout = cleanWorkout(value.workout);
  const hasHealth = value.health !== undefined;
  if (hasHealth !== (value.healthEpoch !== undefined && value.healthGrantId !== undefined)) fail();
  if (!hasHealth && (value.healthEpoch !== undefined || value.healthGrantId !== undefined)) fail();
  if (hasHealth
    && (!Number.isSafeInteger(value.healthEpoch)
      || (value.healthEpoch as number) <= 0
      || !isId(value.healthGrantId))) fail();
  return {
    v: WORKOUT_RESTORE_V3_PROTOCOL,
    restoreId: value.restoreId as string,
    workout,
    ...(hasHealth && {
      health: cleanHealth(value.health, workout),
      healthEpoch: value.healthEpoch as number,
      healthGrantId: value.healthGrantId as string,
    }),
  };
}

const canonicalWorkoutForDigest = (
  workout: ParsedWorkoutRestoreV3Input["workout"],
): Record<string, unknown> => {
  const { updatedAt: _updatedAt, ...content } = workout;
  return { ...content, revision: typeof content.revision === "number" ? content.revision : 0 };
};

const digest = (input: ParsedWorkoutRestoreV3Input): string => createHash("sha256")
  .update(JSON.stringify({
    workout: canonicalWorkoutForDigest(input.workout),
    health: input.health ?? null,
    healthEpoch: input.healthEpoch ?? null,
    healthGrantId: input.healthGrantId ?? null,
  }))
  .digest("hex");

const existingContentMatches = (
  existingWorkout: Record<string, unknown>,
  existingHealth: Record<string, unknown> | null,
  input: ParsedWorkoutRestoreV3Input,
  expectedDigest: string,
): boolean => {
  try {
    const workout = cleanWorkout(existingWorkout);
    const health = input.health ? cleanHealth(existingHealth, workout) : undefined;
    if (Boolean(health) !== Boolean(input.health)) return false;
    return digest({
      v: WORKOUT_RESTORE_V3_PROTOCOL,
      restoreId: input.restoreId,
      workout,
      ...(health && {
        health,
        healthEpoch: existingHealth?.healthEpoch as number,
        healthGrantId: existingHealth?.healthGrantId as string,
      }),
    }) === expectedDigest;
  } catch {
    return false;
  }
};

const grantMatches = (
  profile: Record<string, unknown> | null,
  input: ParsedWorkoutRestoreV3Input,
): boolean => {
  const consents = profile?.consents;
  if (!isRecord(consents)) return false;
  return consents.healthGranted === true
    && consents.healthVersion === LEGAL_VERSIONS.health
    && consents.healthEpoch === input.healthEpoch
    && consents.healthGrantId === input.healthGrantId;
};

export function buildWorkoutRestoreV3Plan(
  existingWorkout: Record<string, unknown> | null,
  existingHealth: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
  uid: string,
  input: ParsedWorkoutRestoreV3Input,
  now: number,
): WorkoutRestoreV3Plan {
  if (!hasCallableAppAccess(profile ?? undefined)) fail("ACCESS_DENIED");
  if (input.health && !grantMatches(profile, input)) fail("HEALTH_GRANT_REQUIRED");

  const restoreDigest = digest(input);
  if (existingWorkout) {
    const sameBase = existingWorkout.userId === uid
      && existingWorkout.restoreV3Digest === restoreDigest
      && existingContentMatches(existingWorkout, existingHealth, input, restoreDigest);
    const sameHealth = input.health
      ? existingHealth?.userId === uid
        && existingHealth.workoutId === input.workout.id
        && existingHealth.restoreV3Digest === restoreDigest
      : existingHealth === null;
    if (!sameBase || !sameHealth) fail("WORKOUT_RESTORE_CONFLICT");
    return {
      status: "already-present",
      workoutId: input.workout.id,
      baseDoc: null,
      healthDoc: null,
    };
  }
  if (existingHealth) fail("WORKOUT_RESTORE_CONFLICT");

  const revision = typeof input.workout.revision === "number" ? input.workout.revision : 0;
  const baseDoc: Record<string, unknown> = {
    ...input.workout,
    userId: uid,
    revision,
    updatedAt: typeof input.workout.updatedAt === "number" ? input.workout.updatedAt : now,
    healthSidecarPresent: Boolean(input.health),
    healthSidecarRevision: revision,
    restoreV3Id: input.restoreId,
    restoreV3Digest: restoreDigest,
  };
  const healthDoc = input.health ? {
    userId: uid,
    workoutId: input.workout.id,
    healthEpoch: input.healthEpoch as number,
    healthGrantId: input.healthGrantId as string,
    metrics: input.health.metrics,
    baseRevision: revision,
    // Jeden kanoniczny klucz wymagany przez klientowy sanitizer odczytu.
    // RestoreId pełni tu tę samą rolę idempotencyjną co writeId w sync v2.
    sourceWriteId: input.restoreId,
    sourceRestoreId: input.restoreId,
    date: input.workout.date,
    updatedAt: now,
    restoreV3Digest: restoreDigest,
  } : null;
  return {
    status: "restored",
    workoutId: input.workout.id,
    baseDoc,
    healthDoc,
  };
}

export async function executeWorkoutRestoreV3(
  uid: string,
  rawInput: WorkoutRestoreV3Input,
  deps: WorkoutRestoreV3Deps,
): Promise<WorkoutRestoreV3Result> {
  const input = parseWorkoutRestoreV3Input(rawInput);
  const plan = await deps.commit(uid, input, (workout, health, profile, owner, now) => (
    buildWorkoutRestoreV3Plan(workout, health, profile, owner, input, now)
  ));
  return { status: plan.status, workoutId: plan.workoutId };
}

const firestoreDeps: WorkoutRestoreV3Deps = {
  async commit(uid, input, build) {
    const db = admin.firestore();
    return db.runTransaction(async (transaction) => {
      const workoutRef = db.collection("workouts").doc(input.workout.id);
      const healthRef = db.collection("workout_health_v2").doc(input.workout.id);
      const profileRef = db.collection("users").doc(uid);
      const [workoutSnap, healthSnap, profileSnap] = await Promise.all([
        transaction.get(workoutRef),
        transaction.get(healthRef),
        transaction.get(profileRef),
      ]);
      const plan = build(
        workoutSnap.exists ? workoutSnap.data() as Record<string, unknown> : null,
        healthSnap.exists ? healthSnap.data() as Record<string, unknown> : null,
        profileSnap.exists ? profileSnap.data() as Record<string, unknown> : null,
        uid,
        Date.now(),
      );
      if (plan.baseDoc) {
        transaction.create(workoutRef, plan.baseDoc);
        if (plan.healthDoc) transaction.create(healthRef, plan.healthDoc);
      }
      return plan;
    });
  },
};

const mapHttpsError = (error: unknown): never => {
  const code = error instanceof WorkoutRestoreV3Error ? error.code : "INTERNAL";
  if (code === "ACCESS_DENIED") throw new HttpsError("permission-denied", code);
  if (code === "HEALTH_GRANT_REQUIRED") throw new HttpsError("failed-precondition", code);
  if (code === "WORKOUT_RESTORE_CONFLICT") throw new HttpsError("already-exists", code);
  if (code === "INVALID_RESTORE_PAYLOAD") throw new HttpsError("invalid-argument", code);
  throw new HttpsError("internal", "WORKOUT_RESTORE_V3_FAILED");
};

export const restoreWorkoutBackupV3 = onCall(
  { region: "us-central1", enforceAppCheck: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    try {
      return await executeWorkoutRestoreV3(uid, request.data as WorkoutRestoreV3Input, firestoreDeps);
    } catch (error) {
      return mapHttpsError(error);
    }
  },
);
