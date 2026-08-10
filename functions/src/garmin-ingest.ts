// Z125: garminIngest — przyjmuje paczkę zdarzeń odhaczeń z zegarka Garmin,
// waliduje, deduplikuje po eventId (kolejka offline może dostarczyć podwójnie),
// składa WorkoutSession ze snapshotami nazw (architektura snapshot+resolver)
// i zapisuje przez Admin SDK pod idempotentnym docId garmin-<deviceId>-<workoutId>.
// Guard jednoczesności (TWARDA ZASADA 4): completed sesja tego dnia planu już
// istnieje => zapis jako osobna sesja ad-hoc, żadnego mergowania.

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
  hasCompletedSessionForDay(uid: string, date: string, dayId: string): Promise<boolean>;
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
    }>;
  }>;
}

export function buildSessionFromEvents(
  payload: GarminIngestPayload,
  uid: string,
  deviceId: string,
  options: { adhoc: boolean },
): GarminSessionDoc {
  // Dedup po eventId, potem local-wins po timestamp per (exerciseId, setIndex).
  const byEventId = new Map<string, GarminIngestEvent>();
  for (const event of payload.events) {
    // Retry tego samego eventId nie może zmienić wcześniej przyjętej treści.
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

  const exercisesOrder: string[] = [];
  const exercisesMap = new Map<string, { name: string; sets: Map<number, GarminIngestEvent> }>();
  for (const event of [...bySet.values()].sort((a, b) => a.at - b.at)) {
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
        sets: indexes.map((index) => {
          const event = entry.sets.get(index)!;
          return {
            reps: event.reps,
            weight: event.weight,
            completed: true,
            ...(event.isWarmup ? { isWarmup: true } : {}),
            ...(event.durationSec !== undefined ? { durationSec: event.durationSec } : {}),
            ...(event.distanceM !== undefined ? { distanceM: event.distanceM } : {}),
            ...(event.assistWeight !== undefined ? { assistWeight: event.assistWeight } : {}),
          };
        }),
      };
    }),
  };
}

export type IngestResult =
  | { ok: true; docId: string; adhoc: boolean }
  | { ok: false; reason: "invalid" };

export async function runGarminIngest(
  deps: GarminIngestDeps,
  uid: string,
  deviceId: string,
  raw: unknown,
): Promise<IngestResult> {
  const payload = validateIngestPayload(raw);
  if (!payload) return { ok: false, reason: "invalid" };

  const adhoc = await deps.hasCompletedSessionForDay(uid, payload.date, payload.dayId);
  const session = buildSessionFromEvents(payload, uid, deviceId, { adhoc });
  const { id, ...doc } = session;
  await deps.saveWorkout(id, { ...doc, updatedAt: deps.now() });
  return { ok: true, docId: id, adhoc };
}
