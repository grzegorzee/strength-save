// Z125: garminIngest — przyjmuje paczkę zdarzeń odhaczeń z zegarka Garmin,
// waliduje, deduplikuje po eventId (kolejka offline może dostarczyć podwójnie),
// składa WorkoutSession ze snapshotami nazw (architektura snapshot+resolver)
// i zapisuje przez Admin SDK pod idempotentnym docId garmin-<deviceId>-<workoutId>.
// Guard jednoczesności (TWARDA ZASADA 4): completed sesja tego dnia planu już
// istnieje => zapis jako osobna sesja ad-hoc, żadnego mergowania.

export interface GarminIngestEvent {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  reps: number;
  weight: number;
  at: number;
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
const MAX_REPS = 999;
const MAX_WEIGHT_KG = 1000;

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isDateString = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 80;

export function validateIngestPayload(raw: unknown): GarminIngestPayload | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  if (!isId(data.workoutId) || !isDateString(data.date) || !isId(data.dayId)) return null;
  if (!isFiniteNumber(data.finishedAt)) return null;
  if (!Array.isArray(data.events) || data.events.length === 0 || data.events.length > MAX_EVENTS) return null;

  const events: GarminIngestEvent[] = [];
  for (const rawEvent of data.events) {
    if (typeof rawEvent !== "object" || rawEvent === null) return null;
    const e = rawEvent as Record<string, unknown>;
    if (!isId(e.id) || !isId(e.exerciseId)) return null;
    if (typeof e.exerciseName !== "string" || e.exerciseName.length === 0 || e.exerciseName.length > 120) return null;
    if (!isFiniteNumber(e.setIndex) || e.setIndex < 0 || e.setIndex > 99) return null;
    if (!isFiniteNumber(e.reps) || e.reps < 0 || e.reps > MAX_REPS) return null;
    if (!isFiniteNumber(e.weight) || e.weight < 0 || e.weight > MAX_WEIGHT_KG) return null;
    if (!isFiniteNumber(e.at)) return null;
    events.push({
      id: e.id,
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      setIndex: Math.floor(e.setIndex),
      reps: Math.floor(e.reps),
      weight: e.weight,
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
    sets: Array<{ reps: number; weight: number; completed: boolean }>;
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
  for (const event of payload.events) byEventId.set(event.id, event);
  const bySet = new Map<string, GarminIngestEvent>();
  for (const event of byEventId.values()) {
    const key = `${event.exerciseId}#${event.setIndex}`;
    const existing = bySet.get(key);
    if (!existing || event.at >= existing.at) bySet.set(key, event);
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
          return { reps: event.reps, weight: event.weight, completed: true };
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
