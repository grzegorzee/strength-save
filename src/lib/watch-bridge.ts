// Most do aplikacji Apple Watch (plugin natywny WatchBridge, tylko iOS).
// Protokół JSON musi być zgodny z ios/App/WatchApp/WorkoutModels.swift.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { SetData } from '@/types';

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
}

export interface WatchWorkoutPayload {
  type: 'todayWorkout' | 'noWorkout';
  date: string;
  dayId?: string;
  dayName?: string;
  focus?: string;
  sentAt: number;
  /** true = sesja wystartowana na telefonie; false/brak = podgląd planu (zegarek pokaże "Rozpocznij trening"). */
  active?: boolean;
  /** Domyślny odpoczynek między seriami (sekundy) — zegarek odpala timer po zaliczeniu serii. */
  restSeconds?: number;
  /** Jednostka wyświetlania ciężaru na zegarku (model i eventy zawsze w kg). */
  unit?: 'kg' | 'lbs';
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
  try {
    const v = parseInt(localStorage.getItem('rest-timer-default') || '90', 10);
    return Number.isFinite(v) && v > 0 ? v : 90;
  } catch {
    return 90;
  }
}

export interface WatchSetLoggedEvent {
  id?: string;
  type: 'setLogged';
  date: string;
  dayId: string;
  exerciseId: string;
  setIndex: number;
  reps: number;
  weight: number;
  completed: boolean;
  at: number;
}

export interface WatchWorkoutFinishedEvent {
  id?: string;
  type: 'workoutFinished';
  date: string;
  dayId: string;
  at: number;
}

export interface WatchStartWorkoutEvent {
  id?: string;
  type: 'startWorkout';
  date: string;
  dayId: string;
  at: number;
}

export type WatchEvent = WatchSetLoggedEvent | WatchWorkoutFinishedEvent | WatchStartWorkoutEvent;

export function parseWatchEvent(json: string): WatchEvent | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.type === 'setLogged' || parsed?.type === 'workoutFinished' || parsed?.type === 'startWorkout') {
      return parsed as WatchEvent;
    }
  } catch {
    // ignorujemy uszkodzone eventy
  }
  return null;
}

export async function sendWorkoutToWatch(payload: WatchWorkoutPayload): Promise<void> {
  if (!isWatchBridgeSupported()) return;
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

export const watchEventId = (event: WatchEvent): string => event.id ?? `legacy-${event.type}-${event.at}`;

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
