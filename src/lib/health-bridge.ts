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
import type { ActiveHealthGrant } from '@/lib/legal-versions';

// Most natywny (Z116/Z230): iOS HealthKit i Android Health Connect przez
// lokalne pluginy HealthSync. Web pozostaje jawnym no-op.
// Dane zdrowotne nie opuszczają urządzenia; stan syncu i ustawienia per urządzenie.

interface HealthSyncPluginApi {
  isAvailable(): Promise<{ available: boolean }>;
  requestHealthPermissions(options: { purpose: 'workout' | 'weight' }): Promise<{ granted: boolean }>;
  writeWorkout(payload: HealthWorkoutPayload): Promise<{ ok: boolean }>;
  readLatestWeight(): Promise<{ sample: HealthWeightSample | null }>;
}

const SETTINGS_KEY = 'fittracker_health_settings_v1';
const SYNC_STATE_KEY = 'fittracker_health_sync_state_v1';
const MAX_RETRIES = 3;
let ioGeneration = 0;
let accountOwner: string | null = null;
let consentScope: string | null = null;

export const setHealthAccountOwner = (uid: string | null): void => {
  if (accountOwner === uid) return;
  accountOwner = uid;
  consentScope = null;
  ioGeneration++;
};

export const setHealthConsentScope = (uid: string, grantId: string | null): void => {
  if (accountOwner !== uid) return;
  if (consentScope !== grantId) {
    consentScope = grantId;
    ioGeneration++;
  }
  if (!grantId) disableHealthFeatures();
};

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
  if (!settings.syncWorkouts) ioGeneration++;
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
};

/** Wycofanie zatrzymuje IO; potwierdzenia eksportu pozostają ochroną przed duplikatami. */
export const disableHealthFeatures = (): void => {
  saveHealthSettings(DEFAULT_SETTINGS);
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

const buildNativeBridge = (): HealthBridge => {
  const plugin = registerPlugin<HealthSyncPluginApi>('HealthSync');
  return {
    isAvailable: async () => {
      try { return (await plugin.isAvailable()).available; } catch { return false; }
    },
    requestPermissions: async (purpose = 'workout') => {
      const generation = ioGeneration;
      try {
        const result = await plugin.requestHealthPermissions({ purpose });
        return generation === ioGeneration && result.granted;
      } catch { return false; }
    },
    writeWorkout: async (payload) => {
      try {
        const result = await plugin.writeWorkout(payload);
        return { ok: result.ok === true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
    readLatestWeight: async () => {
      const generation = ioGeneration;
      try {
        const result = await plugin.readLatestWeight();
        return generation === ioGeneration ? result.sample ?? null : null;
      } catch { return null; }
    },
  };
};

let cachedBridge: HealthBridge | null = null;

export const getHealthBridge = (): HealthBridge => {
  if (cachedBridge) return cachedBridge;
  const platform = Capacitor.getPlatform();
  cachedBridge = Capacitor.isNativePlatform() && (platform === 'ios' || platform === 'android')
    ? buildNativeBridge()
    : noopHealthBridge;
  return cachedBridge;
};

const writeWithRetry = async (payload: HealthWorkoutPayload, isCurrent: () => boolean): Promise<{ ok: boolean; error?: string }> => {
  const bridge = getHealthBridge();
  let lastError: string | undefined;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (!isCurrent()) return { ok: false };
    const result = await bridge.writeWorkout(payload);
    if (result.ok) return result;
    lastError = result.error;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return { ok: false, error: lastError };
};

const syncPayload = async (uid: string, kind: 'workout' | 'cardio', docId: string, payload: HealthWorkoutPayload, grant: ActiveHealthGrant): Promise<void> => {
  const settings = loadHealthSettings();
  const ownsGrant = () => accountOwner === uid && consentScope === grant.healthGrantId;
  if (!settings.syncWorkouts || !ownsGrant()) return;

  const recordId = `strengthsave:${encodeURIComponent(uid)}:${kind}:${encodeURIComponent(docId)}`;
  const state = loadSyncState();
  if (!shouldSyncWorkout(recordId, payload.endMs, state)) return;
  const generation = ioGeneration;
  const isCurrent = () => generation === ioGeneration && ownsGrant() && loadHealthSettings().syncWorkouts;

  const result = await writeWithRetry({ ...payload, recordId, recordVersion: Date.now() }, isCurrent);
  if (!isCurrent()) return;
  if (result.ok) {
    const currentState = loadSyncState();
    currentState[recordId] = { syncedAt: Date.now(), endMs: payload.endMs };
    saveSyncState(currentState);
    saveHealthSettings({ ...loadHealthSettings(), lastSyncAt: Date.now() });
  } else {
    void reportClientError(uid, {
      code: 'health-sync-failed',
      phase: 'other',
      detail: result.error,
    });
  }
};

/** Fire-and-forget po finalnym zapisie treningu siłowego (retry x3, log przy porażce). */
export const syncWorkoutToHealth = (uid: string, workout: WorkoutSession, healthGrant: ActiveHealthGrant | null): void => {
  if (!healthGrant) return;
  const payload = mapWorkoutToHealth(workout);
  if (!payload) return;
  void syncPayload(uid, 'workout', workout.id, payload, healthGrant);
};

/** Fire-and-forget po zapisie wpisu cardio (X15A). */
export const syncCardioToHealth = (uid: string, activity: ManualActivity, healthGrant: ActiveHealthGrant | null): void => {
  if (!healthGrant) return;
  const payload = mapCardioToHealth(activity);
  if (!payload) return;
  void syncPayload(uid, 'cardio', activity.id, payload, healthGrant);
};
