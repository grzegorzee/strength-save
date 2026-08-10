// Most do aplikacji Apple Watch (plugin natywny WatchBridge, tylko iOS).
// Protokół JSON musi być zgodny z ios/App/WatchApp/WorkoutModels.swift.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { SetData } from '@/types';
import { loadRestSettings } from '@/lib/rest-timer';
import {
  WORKOUT_PROTOCOL_VERSION,
  isProtocolPayloadWithinLimit,
} from '@/lib/workout-protocol';

export interface WatchAvailability {
  supported: boolean;
  paired: boolean;
  watchAppInstalled: boolean;
  reachable: boolean;
}

interface WatchBridgePluginApi {
  isAvailable(): Promise<WatchAvailability>;
  sendWorkout(options: { payload: string }): Promise<void>;
  peekEvents(): Promise<{ events: string[] }>;
  ackEvents(options: { ids: string[] }): Promise<void>;
  addListener(
    eventName: 'watchEvent',
    listener: (data: { payload: string }) => void
  ): Promise<PluginListenerHandle>;
}

const WatchBridge = registerPlugin<WatchBridgePluginApi>('WatchBridge');

export const isWatchBridgeSupported = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export interface WatchExercisePayload {
  id: string;
  name: string;
  setsLabel?: string;
  sets: SetData[];
  /** Z122: cel tygodnia z silnika progresji — gotowy string w języku usera. */
  targetLabel?: string;
  /** Z122: przypięta notatka (X14A), przycięta do ekranu zegarka. */
  pinnedNote?: string;
}

const WATCH_NOTE_MAX = 140;

/** Zwarty payload ćwiczeń dla zegarka (limit application context ~256KB). */
export function buildWatchExercises(
  exercises: Array<{ id: string; name: string; sets: string }>,
  exerciseSets: Record<string, SetData[]>,
  extras?: {
    targetLabelByExerciseId?: Record<string, string>;
    pinnedNoteByExerciseId?: Record<string, string>;
  },
): WatchExercisePayload[] {
  return exercises.map((exercise) => {
    const targetLabel = extras?.targetLabelByExerciseId?.[exercise.id];
    const note = extras?.pinnedNoteByExerciseId?.[exercise.id];
    return {
      id: exercise.id,
      name: exercise.name,
      setsLabel: exercise.sets,
      sets: exerciseSets[exercise.id] ?? [],
      ...(targetLabel ? { targetLabel } : {}),
      ...(note ? { pinnedNote: note.slice(0, WATCH_NOTE_MAX) } : {}),
    };
  });
}

export interface WatchWorkoutPayload {
  /** X25: additive version fields; legacy Watch Codable safely ignores them. */
  v?: typeof WORKOUT_PROTOCOL_VERSION;
  protocolVersion?: typeof WORKOUT_PROTOCOL_VERSION;
  type: 'todayWorkout' | 'noWorkout';
  date: string;
  uid?: string;
  deviceId?: string;
  sessionId?: string;
  dayId?: string;
  dayName?: string;
  focus?: string;
  sentAt: number;
  /** true = sesja wystartowana na telefonie; false/brak = podgląd planu (zegarek pokaże "Rozpocznij trening"). */
  active?: boolean;
  /** Domyślny odpoczynek między seriami (sekundy) — zegarek odpala timer po zaliczeniu serii. */
  restSeconds?: number;
  /** X25: jawne ustawienia 90/150; restSeconds zostaje aliasem dla starego Watch. */
  restBetweenSetsSeconds?: number;
  restBetweenExercisesSeconds?: number;
  /** Globalna flaga timerów treningowych. Brak lub false wyłącza timer na zegarku. */
  timersEnabled?: boolean;
  /** Jednostka wyświetlania ciężaru na zegarku (model i eventy zawsze w kg). */
  unit?: 'kg' | 'lbs';
  /** Język UI zegarka (Z122): 'pl' | 'en' — spójny z telefonem. */
  lang?: string;
  exercises?: WatchExercisePayload[];
}

/** Jednostka usera — ten sam klucz co UnitContext na telefonie. */
export function getUnitSystemForWatch(): 'kg' | 'lbs' {
  try {
    return localStorage.getItem('unit-system') === 'lbs' ? 'lbs' : 'kg';
  } catch {
    return 'kg';
  }
}

/** Ten sam klucz ustawień co RestTimer/ExerciseCard na telefonie. */
export function getRestDefaultSeconds(): number {
  return getRestSettingsForWatch().betweenSetsSeconds;
}

export function getRestSettingsForWatch(): {
  betweenSetsSeconds: number;
  betweenExercisesSeconds: number;
} {
  const settings = loadRestSettings();
  return {
    betweenSetsSeconds: settings.workingSeconds,
    betweenExercisesSeconds: settings.betweenExercisesSeconds,
  };
}

const WATCH_PHONE_DEVICE_ID_KEY = 'strength-save-watch-phone-device-id-v1';

/** Opaque installation id for conflict diagnostics; never use uid as deviceId. */
export function getOrCreateWatchPhoneDeviceId(): string {
  try {
    const stored = localStorage.getItem(WATCH_PHONE_DEVICE_ID_KEY);
    if (stored) return stored;
    const suffix = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const created = `phone-${suffix}`;
    localStorage.setItem(WATCH_PHONE_DEVICE_ID_KEY, created);
    return created;
  } catch {
    return 'phone-unavailable';
  }
}

interface WatchEventMetadata {
  id?: string;
  eventId?: string;
  protocolVersion?: typeof WORKOUT_PROTOCOL_VERSION;
  canonicalType?: 'set_logged' | 'set_updated' | 'session_started' | 'session_finished';
  sessionId?: string;
  deviceId?: string;
  uid?: string;
}

export interface WatchSetLoggedEvent extends WatchEventMetadata {
  type: 'setLogged';
  date: string;
  dayId: string;
  exerciseId: string;
  setIndex: number;
  reps: number;
  weight: number;
  completed: boolean;
  at: number;
  /** Z122: zegarek prowadzi sesję HKWorkout — telefon NIE zapisuje drugiego treningu do Health. */
  hkSession?: boolean;
}

export interface WatchWorkoutFinishedEvent extends WatchEventMetadata {
  type: 'workoutFinished';
  date: string;
  dayId: string;
  at: number;
  /** Z122: jak wyżej — deduplikacja zapisu Health. */
  hkSession?: boolean;
}

export interface WatchStartWorkoutEvent extends WatchEventMetadata {
  type: 'startWorkout';
  date: string;
  dayId: string;
  at: number;
}

export type WatchEvent = WatchSetLoggedEvent | WatchWorkoutFinishedEvent | WatchStartWorkoutEvent;

export function parseWatchEvent(json: string): WatchEvent | null {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.protocolVersion !== undefined && parsed.protocolVersion !== WORKOUT_PROTOCOL_VERSION) return null;
    if (typeof parsed.date !== 'string' || typeof parsed.dayId !== 'string'
      || typeof parsed.at !== 'number' || !Number.isFinite(parsed.at)) return null;

    if (parsed.type === 'setLogged') {
      if (typeof parsed.exerciseId !== 'string'
        || !Number.isInteger(parsed.setIndex) || (parsed.setIndex as number) < 0
        || typeof parsed.reps !== 'number' || !Number.isFinite(parsed.reps)
        || typeof parsed.weight !== 'number' || !Number.isFinite(parsed.weight)
        || typeof parsed.completed !== 'boolean') return null;
      return parsed as unknown as WatchSetLoggedEvent;
    }
    if (parsed.type === 'workoutFinished' || parsed.type === 'startWorkout') {
      return parsed as unknown as WatchWorkoutFinishedEvent | WatchStartWorkoutEvent;
    }
  } catch {
    // ignorujemy uszkodzone eventy
  }
  return null;
}

export async function sendWorkoutToWatch(payload: WatchWorkoutPayload): Promise<void> {
  if (!isWatchBridgeSupported()) return;
  if (!isProtocolPayloadWithinLimit(payload, 'watchContextBytes')) {
    console.warn('[watch-bridge] workout context exceeds 256KB');
    return;
  }
  try {
    await WatchBridge.sendWorkout({ payload: JSON.stringify(payload) });
  } catch (err) {
    console.warn('[watch-bridge] sendWorkout failed', err);
  }
}

export async function getWatchAvailability(): Promise<WatchAvailability | null> {
  if (!isWatchBridgeSupported()) return null;
  try {
    return await WatchBridge.isAvailable();
  } catch {
    return null;
  }
}

export const watchEventId = (event: WatchEvent): string => (
  event.eventId ?? event.id ?? `legacy-${event.type}-${event.at}`
);

export async function ackWatchEvents(ids: string[]): Promise<void> {
  if (!isWatchBridgeSupported() || ids.length === 0) return;
  await WatchBridge.ackEvents({ ids });
}

/** Podgląd kolejki BEZ kasowania — dla globalnego routera (startWorkout). */
export async function peekWatchEvents(): Promise<WatchEvent[]> {
  if (!isWatchBridgeSupported()) return [];
  try {
    const { events } = await WatchBridge.peekEvents();
    return events.map(parseWatchEvent).filter((e): e is WatchEvent => e !== null);
  } catch {
    return [];
  }
}

export async function addWatchEventListener(
  onEvent: (event: WatchEvent) => void
): Promise<PluginListenerHandle | null> {
  if (!isWatchBridgeSupported()) return null;
  try {
    return await WatchBridge.addListener('watchEvent', ({ payload }) => {
      const event = parseWatchEvent(payload);
      if (event) onEvent(event);
    });
  } catch {
    return null;
  }
}
