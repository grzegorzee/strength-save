// Z125: garminIngest — przyjmuje paczkę zdarzeń odhaczeń z zegarka Garmin,
// waliduje, deduplikuje po eventId (kolejka offline może dostarczyć podwójnie),
// składa WorkoutSession ze snapshotami nazw (architektura snapshot+resolver)
// i zapisuje przez Admin SDK pod idempotentnym docId garmin-<deviceId>-<workoutId>.
// X25: planowa sesja telefonu i Garmina ma jeden kanoniczny dokument. Konflikty
// serii rozstrzyga updatedAt per set (fallback: updatedAt sesji), nowsza wygrywa.

export const GARMIN_PROTOCOL_VERSION = 1 as const;

export type GarminTrackingType =
  | "weight_reps"
  | "duration"
  | "weight_distance_duration"
  | "assisted_bodyweight";

export interface GarminIngestEvent {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  reps: number;
  weight: number;
  at: number;
  tracking: GarminTrackingType;
  isWarmup?: boolean;
  durationSec?: number;
  distanceM?: number;
  assistWeight?: number;
}

export interface GarminIngestPayload {
  workoutId: string;
  date: string;
  dayId: string;
  dayName?: string;
  startedAt?: number;
  finishedAt: number;
  events: GarminIngestEvent[];
}

export interface GarminIngestDeps {
  findCanonicalSession(uid: string, date: string, dayId: string): Promise<{
    docId: string;
    doc: Record<string, unknown>;
  } | null>;
  saveWorkout(docId: string, doc: Record<string, unknown>): Promise<void>;
  now(): number;
}

const MAX_EVENTS = 500;
const MAX_INGEST_BYTES = 256 * 1024;
const MAX_REPS = 999;
const MAX_WEIGHT_KG = 1000;
const MAX_DURATION_SEC = 24 * 60 * 60;
const MAX_DISTANCE_M = 1_000_000;

const TRACKING_TYPES = new Set<GarminTrackingType>([
  "weight_reps",
  "duration",
  "weight_distance_duration",
  "assisted_bodyweight",
]);

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isDateString = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 80;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export interface CompatibleGarminSetEvent {
  protocolVersion: number;
  uid?: string;
  deviceId?: string;
  dayId: string;
  sessionId: string;
  exerciseId: string | null;
  exerciseName: string;
  setIndex: number | null;
  eventId: string;
  at: number;
  type: string;
  set?: {
    tracking: GarminTrackingType;
    completed: boolean;
    isWarmup?: boolean;
    reps?: number;
    weightKg?: number;
    durationSec?: number;
    distanceM?: number;
    assistWeightKg?: number;
  };
}

export interface CompatibleGarminIngestInput {
  sessionId: string;
  date: string;
  dayId: string;
  dayName?: string;
  startedAt?: number;
  finishedAt: number;
  events: CompatibleGarminSetEvent[];
}

/**
 * Additive envelope for a new Connect IQ client. The legacy aliases are kept so
 * an old deployed server still accepts the same batch during a rolling release.
 */
export function buildCompatibleGarminIngestPayload(input: CompatibleGarminIngestInput) {
  return {
    v: GARMIN_PROTOCOL_VERSION,
    protocolVersion: GARMIN_PROTOCOL_VERSION,
    workoutId: input.sessionId,
    sessionId: input.sessionId,
    date: input.date,
    dayId: input.dayId,
    ...(input.dayName ? { dayName: input.dayName } : {}),
    ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
    finishedAt: input.finishedAt,
    events: input.events.flatMap((event) => {
      if ((event.type !== "set_logged" && event.type !== "set_updated")
        || !event.set || event.exerciseId === null || event.setIndex === null) return [];
      return [{
        // Required by the pre-X25 server:
        id: event.eventId,
        exerciseId: event.exerciseId,
        exerciseName: event.exerciseName,
        setIndex: event.setIndex,
        reps: event.set.reps ?? 0,
        weight: event.set.weightKg ?? 0,
        at: event.at,
        // Additive X25 fields ignored by the old server:
        protocolVersion: GARMIN_PROTOCOL_VERSION,
        eventId: event.eventId,
        canonicalType: event.type,
        dayId: event.dayId,
        sessionId: event.sessionId,
        ...(event.uid ? { uid: event.uid } : {}),
        ...(event.deviceId ? { deviceId: event.deviceId } : {}),
        set: event.set,
      }];
    }),
  };
}

const parseSetFields = (event: Record<string, unknown>): {
  tracking: GarminTrackingType;
  reps: number;
  weight: number;
  isWarmup?: boolean;
  durationSec?: number;
  distanceM?: number;
  assistWeight?: number;
} | null => {
  if (!isRecord(event.set)) {
    if (!isFiniteNumber(event.reps) || event.reps < 0 || event.reps > MAX_REPS) return null;
    if (!isFiniteNumber(event.weight) || event.weight < 0 || event.weight > MAX_WEIGHT_KG) return null;
    return { tracking: "weight_reps", reps: Math.floor(event.reps), weight: event.weight };
  }

  const set = event.set;
  const tracking = set.tracking as GarminTrackingType;
  if (!TRACKING_TYPES.has(tracking) || set.completed !== true) return null;
  const reps = set.reps === undefined ? 0 : set.reps;
  const weight = set.weightKg === undefined ? 0 : set.weightKg;
  if (!isFiniteNumber(reps) || reps < 0 || reps > MAX_REPS) return null;
  if (!isFiniteNumber(weight) || weight < 0 || weight > MAX_WEIGHT_KG) return null;
  if (set.durationSec !== undefined
    && (!isFiniteNumber(set.durationSec) || set.durationSec < 0 || set.durationSec > MAX_DURATION_SEC)) return null;
  if (set.distanceM !== undefined
    && (!isFiniteNumber(set.distanceM) || set.distanceM < 0 || set.distanceM > MAX_DISTANCE_M)) return null;
  if (set.assistWeightKg !== undefined
    && (!isFiniteNumber(set.assistWeightKg) || set.assistWeightKg < 0 || set.assistWeightKg > MAX_WEIGHT_KG)) return null;
  if (tracking === "weight_reps" && (set.reps === undefined || set.weightKg === undefined)) return null;
  if (tracking === "duration" && set.durationSec === undefined) return null;
  if (tracking === "weight_distance_duration" && (set.weightKg === undefined || set.distanceM === undefined)) return null;
  if (tracking === "assisted_bodyweight" && (set.reps === undefined || set.assistWeightKg === undefined)) return null;

  return {
    tracking,
    reps: Math.floor(reps),
    weight,
    ...(set.isWarmup === true ? { isWarmup: true } : {}),
    ...(isFiniteNumber(set.durationSec) ? { durationSec: set.durationSec } : {}),
    ...(isFiniteNumber(set.distanceM) ? { distanceM: set.distanceM } : {}),
    ...(isFiniteNumber(set.assistWeightKg) ? { assistWeight: set.assistWeightKg } : {}),
  };
};

export function validateIngestPayload(raw: unknown): GarminIngestPayload | null {
  if (!isRecord(raw)) return null;
  try {
    if (Buffer.byteLength(JSON.stringify(raw), "utf8") > MAX_INGEST_BYTES) return null;
  } catch {
    return null;
  }
  const data = raw as Record<string, unknown>;
  if (data.protocolVersion !== undefined && data.protocolVersion !== GARMIN_PROTOCOL_VERSION) return null;
  if (data.v !== undefined && data.v !== GARMIN_PROTOCOL_VERSION) return null;
  if (!isId(data.workoutId) || !isDateString(data.date) || !isId(data.dayId)) return null;
  if (data.sessionId !== undefined && (!isId(data.sessionId) || data.sessionId !== data.workoutId)) return null;
  if (!isFiniteNumber(data.finishedAt)) return null;
  if (!Array.isArray(data.events) || data.events.length === 0 || data.events.length > MAX_EVENTS) return null;

  const events: GarminIngestEvent[] = [];
  for (const rawEvent of data.events) {
    if (!isRecord(rawEvent)) return null;
    const e = rawEvent as Record<string, unknown>;
    if (e.protocolVersion !== undefined && e.protocolVersion !== GARMIN_PROTOCOL_VERSION) return null;
    const eventId = e.eventId ?? e.id;
    if (!isId(eventId) || (e.id !== undefined && e.id !== eventId) || !isId(e.exerciseId)) return null;
    if (e.sessionId !== undefined && e.sessionId !== data.workoutId) return null;
    if (e.dayId !== undefined && e.dayId !== data.dayId) return null;
    if (e.canonicalType !== undefined && e.canonicalType !== "set_logged" && e.canonicalType !== "set_updated") return null;
    if (typeof e.exerciseName !== "string" || e.exerciseName.length === 0 || e.exerciseName.length > 120) return null;
    if (!isFiniteNumber(e.setIndex) || e.setIndex < 0 || e.setIndex > 99) return null;
    if (!isFiniteNumber(e.at)) return null;
    const setFields = parseSetFields(e);
    if (!setFields) return null;
    events.push({
      id: eventId,
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      setIndex: Math.floor(e.setIndex),
      ...setFields,
      at: e.at,
    });
  }

  return {
    workoutId: data.workoutId,
    date: data.date,
    dayId: data.dayId,
    ...(typeof data.dayName === "string" && data.dayName ? { dayName: data.dayName.slice(0, 80) } : {}),
    ...(isFiniteNumber(data.startedAt) ? { startedAt: data.startedAt } : {}),
    finishedAt: data.finishedAt,
    events,
  };
}

export interface GarminSessionDoc {
  id: string;
  userId: string;
  dayId: string;
  date: string;
  completed: boolean;
  dayName?: string;
  durationSec?: number;
  startedAt?: number;
  completedAt: number;
  exercises: Array<{
    exerciseId: string;
    name: string;
    sets: Array<{
      reps: number;
      weight: number;
      completed: boolean;
      isWarmup?: boolean;
      durationSec?: number;
      distanceM?: number;
      assistWeight?: number;
      /** Server-side LWW timestamp for cross-device conflict resolution. */
      updatedAt?: number;
    }>;
  }>;
}

const selectedSetEvents = (events: GarminIngestEvent[]): GarminIngestEvent[] => {
  const byEventId = new Map<string, GarminIngestEvent>();
  for (const event of events) {
    if (!byEventId.has(event.id)) byEventId.set(event.id, event);
  }
  const bySet = new Map<string, GarminIngestEvent>();
  for (const event of byEventId.values()) {
    const key = `${event.exerciseId}#${event.setIndex}`;
    const existing = bySet.get(key);
    if (!existing || event.at > existing.at || (event.at === existing.at && event.id > existing.id)) {
      bySet.set(key, event);
    }
  }
  return [...bySet.values()].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
};

const setFromEvent = (event: GarminIngestEvent) => ({
  reps: event.reps,
  weight: event.weight,
  completed: true,
  ...(event.isWarmup ? { isWarmup: true } : {}),
  ...(event.durationSec !== undefined ? { durationSec: event.durationSec } : {}),
  ...(event.distanceM !== undefined ? { distanceM: event.distanceM } : {}),
  ...(event.assistWeight !== undefined ? { assistWeight: event.assistWeight } : {}),
  updatedAt: event.at,
});

export function buildSessionFromEvents(
  payload: GarminIngestPayload,
  uid: string,
  deviceId: string,
  options: { adhoc: boolean },
): GarminSessionDoc {
  // Dedup po eventId, potem local-wins po timestamp per (exerciseId, setIndex).
  const exercisesOrder: string[] = [];
  const exercisesMap = new Map<string, { name: string; sets: Map<number, GarminIngestEvent> }>();
  for (const event of selectedSetEvents(payload.events)) {
    if (!exercisesMap.has(event.exerciseId)) {
      exercisesMap.set(event.exerciseId, { name: event.exerciseName, sets: new Map() });
      exercisesOrder.push(event.exerciseId);
    }
    exercisesMap.get(event.exerciseId)!.sets.set(event.setIndex, event);
  }

  const docId = `garmin-${deviceId}-${payload.workoutId}`;
  const dayId = options.adhoc ? `adhoc-${payload.date}-${docId.slice(-8)}` : payload.dayId;
  const baseDayName = payload.dayName ?? "Trening";
  const dayName = options.adhoc ? `${baseDayName} (Garmin)` : baseDayName;
  const durationSec = payload.startedAt
    ? Math.max(0, Math.round((payload.finishedAt - payload.startedAt) / 1000))
    : undefined;

  return {
    id: docId,
    userId: uid,
    dayId,
    date: payload.date,
    completed: true,
    dayName,
    ...(durationSec !== undefined ? { durationSec } : {}),
    ...(payload.startedAt !== undefined ? { startedAt: payload.startedAt } : {}),
    completedAt: payload.finishedAt,
    exercises: exercisesOrder.map((exerciseId) => {
      const entry = exercisesMap.get(exerciseId)!;
      const indexes = [...entry.sets.keys()].sort((a, b) => a - b);
      return {
        exerciseId,
        name: entry.name,
        sets: Array.from({ length: indexes.at(-1)! + 1 }, (_, index) => {
          const event = entry.sets.get(index);
          return event
            ? setFromEvent(event)
            : { reps: 0, weight: 0, completed: false };
        }),
      };
    }),
  };
}

type ExistingExercise = {
  exerciseId?: unknown;
  name?: unknown;
  sets?: unknown;
  [key: string]: unknown;
};

/** Merge only Garmin-touched sets; unrelated phone data and exercise metadata survive. */
export function mergeGarminIntoCanonical(
  canonical: Record<string, unknown>,
  payload: GarminIngestPayload,
  now: number,
): Record<string, unknown> {
  const sessionUpdatedAt = typeof canonical.updatedAt === "number"
    ? canonical.updatedAt
    : typeof canonical.completedAt === "number" ? canonical.completedAt : 0;
  const exercises = Array.isArray(canonical.exercises)
    ? canonical.exercises.map((exercise) => {
      const copy = { ...(exercise as ExistingExercise) };
      if (Array.isArray(copy.sets)) {
        copy.sets = copy.sets.map((set) => {
          const setCopy = { ...(set as Record<string, unknown>) };
          return typeof setCopy.updatedAt === "number"
            ? setCopy
            : { ...setCopy, updatedAt: sessionUpdatedAt };
        });
      }
      return copy;
    })
    : [];
  let changed = canonical.dayId !== payload.dayId
    || canonical.date !== payload.date
    || canonical.completed !== true;

  for (const event of selectedSetEvents(payload.events)) {
    let exercise = exercises.find((candidate) => candidate.exerciseId === event.exerciseId);
    if (!exercise) {
      exercise = { exerciseId: event.exerciseId, name: event.exerciseName, sets: [] };
      exercises.push(exercise);
    }
    const sets = Array.isArray(exercise.sets)
      ? exercise.sets.map((set) => ({ ...(set as Record<string, unknown>) }))
      : [];
    const current = sets[event.setIndex];
    const currentUpdatedAt = typeof current?.updatedAt === "number" ? current.updatedAt : sessionUpdatedAt;
    if (!current || event.at > currentUpdatedAt) {
      while (sets.length < event.setIndex) sets.push({ reps: 0, weight: 0, completed: false });
      sets[event.setIndex] = setFromEvent(event);
      changed = true;
    }
    exercise.sets = sets;
  }

  const existingCompletedAt = typeof canonical.completedAt === "number" ? canonical.completedAt : 0;
  const existingStartedAt = typeof canonical.startedAt === "number" ? canonical.startedAt : undefined;
  const startedAt = payload.startedAt === undefined
    ? existingStartedAt
    : existingStartedAt === undefined ? payload.startedAt : Math.min(existingStartedAt, payload.startedAt);
  const completedAt = Math.max(existingCompletedAt, payload.finishedAt);
  const durationSec = startedAt !== undefined
    ? Math.max(0, Math.round((completedAt - startedAt) / 1000))
    : undefined;
  if (startedAt !== existingStartedAt
    || completedAt !== existingCompletedAt
    || (durationSec !== undefined && durationSec !== canonical.durationSec)) changed = true;
  if (!changed) return canonical;
  return {
    ...canonical,
    dayId: payload.dayId,
    date: payload.date,
    completed: true,
    exercises,
    ...(startedAt !== undefined ? { startedAt } : {}),
    completedAt,
    ...(startedAt !== undefined
      ? { durationSec }
      : {}),
    updatedAt: now,
    revision: (typeof canonical.revision === "number" ? canonical.revision : 0) + 1,
  };
}

/**
 * Final transaction guard for a phone write racing after the initial Garmin query.
 * Per-set timestamps win; a missing set is additive, never a reason to drop data.
 */
export function mergeCanonicalWorkoutDocuments(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
  now: number,
): Record<string, unknown> {
  const currentAt = typeof current.updatedAt === "number" ? current.updatedAt : 0;
  const incomingAt = typeof incoming.updatedAt === "number" ? incoming.updatedAt : 0;
  const exercises = Array.isArray(current.exercises)
    ? current.exercises.map((exercise) => {
      const copy = { ...(exercise as ExistingExercise) };
      copy.sets = Array.isArray(copy.sets)
        ? copy.sets.map((set) => ({ ...(set as Record<string, unknown>) }))
        : [];
      return copy;
    })
    : [];

  if (Array.isArray(incoming.exercises)) {
    for (const rawIncomingExercise of incoming.exercises) {
      const incomingExercise = rawIncomingExercise as ExistingExercise;
      const exerciseId = typeof incomingExercise.exerciseId === "string" ? incomingExercise.exerciseId : "";
      if (!exerciseId) continue;
      const target = exercises.find((exercise) => exercise.exerciseId === exerciseId);
      if (!target) {
        exercises.push({ ...incomingExercise });
        continue;
      }
      const targetSets = Array.isArray(target.sets) ? target.sets : [];
      const incomingSets = Array.isArray(incomingExercise.sets) ? incomingExercise.sets : [];
      for (let index = 0; index < incomingSets.length; index += 1) {
        const incomingSet = incomingSets[index] as Record<string, unknown> | undefined;
        if (!incomingSet) continue;
        const currentSet = targetSets[index] as Record<string, unknown> | undefined;
        const incomingSetAt = typeof incomingSet.updatedAt === "number" ? incomingSet.updatedAt : incomingAt;
        const currentSetAt = typeof currentSet?.updatedAt === "number" ? currentSet.updatedAt : currentAt;
        if (!currentSet || incomingSetAt > currentSetAt) {
          while (targetSets.length < index) targetSets.push({ reps: 0, weight: 0, completed: false });
          targetSets[index] = { ...incomingSet };
        }
      }
      target.sets = targetSets;
    }
  }

  const currentCompletedAt = typeof current.completedAt === "number" ? current.completedAt : 0;
  const incomingCompletedAt = typeof incoming.completedAt === "number" ? incoming.completedAt : 0;
  const currentStartedAt = typeof current.startedAt === "number" ? current.startedAt : undefined;
  const incomingStartedAt = typeof incoming.startedAt === "number" ? incoming.startedAt : undefined;
  const startedAt = currentStartedAt === undefined
    ? incomingStartedAt
    : incomingStartedAt === undefined ? currentStartedAt : Math.min(currentStartedAt, incomingStartedAt);
  const completedAt = Math.max(currentCompletedAt, incomingCompletedAt);
  const currentRevision = typeof current.revision === "number" ? current.revision : 0;
  const incomingRevision = typeof incoming.revision === "number" ? incoming.revision : 0;

  return {
    ...incoming,
    ...current,
    exercises,
    completed: current.completed === true || incoming.completed === true,
    ...(startedAt !== undefined ? { startedAt } : {}),
    ...(completedAt > 0 ? { completedAt } : {}),
    ...(startedAt !== undefined && completedAt > 0
      ? { durationSec: Math.max(0, Math.round((completedAt - startedAt) / 1000)) }
      : {}),
    updatedAt: now,
    revision: Math.max(currentRevision, incomingRevision) + 1,
  };
}

export type IngestResult =
  | { ok: true; docId: string; adhoc: boolean; merged: boolean }
  | { ok: false; reason: "invalid" };

export async function runGarminIngest(
  deps: GarminIngestDeps,
  uid: string,
  deviceId: string,
  raw: unknown,
): Promise<IngestResult> {
  const payload = validateIngestPayload(raw);
  if (!payload) return { ok: false, reason: "invalid" };

  const adhoc = payload.dayId.startsWith("adhoc-");
  const canonical = adhoc
    ? null
    : await deps.findCanonicalSession(uid, payload.date, payload.dayId);
  if (canonical) {
    const merged = mergeGarminIntoCanonical(canonical.doc, payload, deps.now());
    if (merged !== canonical.doc) await deps.saveWorkout(canonical.docId, merged);
    return { ok: true, docId: canonical.docId, adhoc: false, merged: true };
  }
  const session = buildSessionFromEvents(payload, uid, deviceId, { adhoc: false });
  const { id, ...doc } = session;
  await deps.saveWorkout(id, { ...doc, updatedAt: deps.now() });
  return { ok: true, docId: id, adhoc, merged: false };
}
