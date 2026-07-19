import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  mapCardioToHealth,
  mapWorkoutToHealth,
  noopHealthBridge,
  shouldSyncWorkout,
  type HealthBridge,
  type HealthSyncState,
  type HealthWeightSample,
  type HealthWorkoutPayload,
} from '@/lib/health-sync';
import type { WorkoutSession } from '@/types';
import type { ManualActivity } from '@/lib/manual-activity';
import { reportClientError } from '@/lib/error-telemetry';

// Most natywny (Z116): iOS HealthKit przez lokalny plugin HealthSync
// (ios/App/App/HealthSync/HealthSyncPlugin.swift). Web/Android bez Health = no-op.
// Dane zdrowotne nie opuszczają urządzenia; stan syncu i ustawienia per urządzenie.

interface HealthSyncPluginApi {
  isAvailable(): Promise<{ available: boolean }>;
  requestPermissions(): Promise<{ granted: boolean }>;
  writeWorkout(payload: HealthWorkoutPayload): Promise<{ ok: boolean }>;
  readLatestWeight(): Promise<{ sample: HealthWeightSample | null }>;
}

const SETTINGS_KEY = 'fittracker_health_settings_v1';
const SYNC_STATE_KEY = 'fittracker_health_sync_state_v1';
const MAX_RETRIES = 3;

export interface HealthSettings {
  syncWorkouts: boolean;
  suggestWeight: boolean;
  lastSyncAt?: number;
}

const DEFAULT_SETTINGS: HealthSettings = { syncWorkouts: false, suggestWeight: false };

export const loadHealthSettings = (): HealthSettings => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as HealthSettings) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveHealthSettings = (settings: HealthSettings): void => {
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
};

const loadSyncState = (): HealthSyncState => {
  try {
    const raw = window.localStorage.getItem(SYNC_STATE_KEY);
    return raw ? (JSON.parse(raw) as HealthSyncState) : {};
  } catch {
    return {};
  }
};

const saveSyncState = (state: HealthSyncState): void => {
  try {
    // Przycinamy do 500 najnowszych wpisów (stan idempotencji, nie archiwum).
    const entries = Object.entries(state).sort((a, b) => b[1].syncedAt - a[1].syncedAt).slice(0, 500);
    window.localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* ignore */ }
};

const buildIosBridge = (): HealthBridge => {
  const plugin = registerPlugin<HealthSyncPluginApi>('HealthSync');
  return {
    isAvailable: async () => {
      try { return (await plugin.isAvailable()).available; } catch { return false; }
    },
    requestPermissions: async () => {
      try { return (await plugin.requestPermissions()).granted; } catch { return false; }
    },
    writeWorkout: async (payload) => {
      try {
        await plugin.writeWorkout(payload);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
    readLatestWeight: async () => {
      try { return (await plugin.readLatestWeight()).sample ?? null; } catch { return null; }
    },
  };
};

let cachedBridge: HealthBridge | null = null;

export const getHealthBridge = (): HealthBridge => {
  if (cachedBridge) return cachedBridge;
  cachedBridge = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
    ? buildIosBridge()
    : noopHealthBridge;
  return cachedBridge;
};

const writeWithRetry = async (payload: HealthWorkoutPayload): Promise<{ ok: boolean; error?: string }> => {
  const bridge = getHealthBridge();
  let lastError: string | undefined;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await bridge.writeWorkout(payload);
    if (result.ok) return result;
    lastError = result.error;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return { ok: false, error: lastError };
};

const syncPayload = async (uid: string, docId: string, payload: HealthWorkoutPayload): Promise<void> => {
  const settings = loadHealthSettings();
  if (!settings.syncWorkouts) return;

  const state = loadSyncState();
  if (!shouldSyncWorkout(docId, payload.endMs, state)) return;

  const result = await writeWithRetry(payload);
  if (result.ok) {
    state[docId] = { syncedAt: Date.now(), endMs: payload.endMs };
    saveSyncState(state);
    saveHealthSettings({ ...settings, lastSyncAt: Date.now() });
  } else {
    void reportClientError(uid, {
      code: 'health-sync-failed',
      phase: 'other',
      detail: result.error,
    });
  }
};

/** Fire-and-forget po finalnym zapisie treningu siłowego (retry x3, log przy porażce). */
export const syncWorkoutToHealth = (uid: string, workout: WorkoutSession): void => {
  const payload = mapWorkoutToHealth(workout);
  if (!payload) return;
  void syncPayload(uid, workout.id, payload);
};

/** Fire-and-forget po zapisie wpisu cardio (X15A). */
export const syncCardioToHealth = (uid: string, activity: ManualActivity): void => {
  const payload = mapCardioToHealth(activity);
  if (!payload) return;
  void syncPayload(uid, activity.id, payload);
};
