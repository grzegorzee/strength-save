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
  drainEvents(): Promise<{ events: string[] }>;
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
  exercises?: WatchExercisePayload[];
}

export interface WatchSetLoggedEvent {
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
  type: 'workoutFinished';
  date: string;
  dayId: string;
  at: number;
}

export type WatchEvent = WatchSetLoggedEvent | WatchWorkoutFinishedEvent;

export function parseWatchEvent(json: string): WatchEvent | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.type === 'setLogged' || parsed?.type === 'workoutFinished') {
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

export async function drainWatchEvents(): Promise<WatchEvent[]> {
  if (!isWatchBridgeSupported()) return [];
  try {
    const { events } = await WatchBridge.drainEvents();
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
