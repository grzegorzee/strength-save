// Z125: klient callable do parowania zegarka Garmin.
// W E2E mock zwraca deterministyczne dane (Firestore/Functions zablokowane).
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const isE2EMode = import.meta.env.VITE_E2E_MODE === 'true' && import.meta.env.VITE_USE_EMULATORS !== 'true';

export interface GarminPairCode {
  code: string;
  expiresAt: number;
}

export interface GarminDevice {
  deviceId: string;
  label: string;
  createdAt: number;
  lastUsedAt: number;
  expiresAt?: number | null;
}

export interface LinkedDevice {
  deviceId: string;
  platform: 'apple_watch' | 'garmin';
  label: string;
  pairedAt: number;
  lastSeenAt: number | null;
  lastSyncAt: number | null;
  pendingEvents: number | null;
  integration: 'healthkit' | 'fit';
  integrationStatus: 'unknown' | 'ready' | 'active' | 'saved' | 'discarded' | 'unavailable';
  syncStatus: 'synced' | 'pending' | 'error' | 'offline';
}

export interface AppleWatchStatusReport {
  deviceId: string;
  label: string;
  paired: boolean;
  watchAppInstalled: boolean;
  reachable: boolean;
  pendingEvents: number;
  healthStatus: 'unknown' | 'ready' | 'active' | 'unavailable';
  lastSyncAt: number | null;
}

export async function startGarminPairing(label: string): Promise<GarminPairCode> {
  if (isE2EMode) {
    return { code: '123456', expiresAt: Date.now() + 10 * 60 * 1000 };
  }
  const call = httpsCallable<{ label: string }, GarminPairCode>(functions, 'garminPairStart');
  const result = await call({ label });
  return result.data;
}

export async function listGarminDevices(): Promise<GarminDevice[]> {
  if (isE2EMode) {
    try {
      const raw = window.localStorage.getItem('fittracker_e2e_garmin_devices');
      return raw ? JSON.parse(raw) as GarminDevice[] : [];
    } catch {
      return [];
    }
  }
  const call = httpsCallable<Record<string, never>, { devices: GarminDevice[] }>(functions, 'garminDevices');
  const result = await call({});
  return result.data.devices;
}

export async function revokeGarminDevice(deviceId: string): Promise<void> {
  if (isE2EMode) {
    try {
      const raw = window.localStorage.getItem('fittracker_e2e_garmin_devices');
      const devices = raw ? JSON.parse(raw) as GarminDevice[] : [];
      window.localStorage.setItem(
        'fittracker_e2e_garmin_devices',
        JSON.stringify(devices.filter((d) => d.deviceId !== deviceId)),
      );
    } catch { /* noop */ }
    return;
  }
  const call = httpsCallable<{ deviceId: string }, { revoked: boolean }>(functions, 'garminRevokeDevice');
  await call({ deviceId });
}

export async function revokeAllGarminDevices(): Promise<void> {
  if (isE2EMode) {
    try { window.localStorage.removeItem('fittracker_e2e_garmin_devices'); } catch { /* noop */ }
    return;
  }
  const call = httpsCallable<Record<string, never>, { revoked: number }>(functions, 'garminRevokeAllDevices');
  await call({});
}

export async function listLinkedDevices(): Promise<LinkedDevice[]> {
  if (isE2EMode) {
    try {
      const linked = window.localStorage.getItem('fittracker_e2e_linked_devices');
      if (linked) return JSON.parse(linked) as LinkedDevice[];
      return (await listGarminDevices()).map((device) => ({
        deviceId: device.deviceId,
        platform: 'garmin' as const,
        label: device.label,
        pairedAt: device.createdAt,
        lastSeenAt: device.lastUsedAt,
        lastSyncAt: device.lastUsedAt,
        pendingEvents: 0,
        integration: 'fit' as const,
        integrationStatus: 'saved' as const,
        syncStatus: 'synced' as const,
      }));
    } catch {
      return [];
    }
  }
  const call = httpsCallable<Record<string, never>, { devices: LinkedDevice[] }>(functions, 'linkedDevices');
  const result = await call({});
  // X35b: panel urządzeń żyje w Profilu (każdy user) — zła odpowiedź nie może
  // położyć route'a (zasada 11), pusta lista zamiast undefined.
  return result.data?.devices ?? [];
}

export async function reportAppleWatchStatus(
  status: AppleWatchStatusReport,
  relink = false,
): Promise<{ linked: boolean }> {
  if (isE2EMode) return { linked: true };
  const call = httpsCallable<AppleWatchStatusReport & { relink?: boolean }, { linked: boolean }>(
    functions,
    'reportAppleWatchStatus',
  );
  const result = await call({ ...status, ...(relink ? { relink: true } : {}) });
  return { linked: result.data.linked };
}

export async function unlinkLinkedDevice(
  platform: LinkedDevice['platform'],
  deviceId: string,
): Promise<void> {
  if (isE2EMode) {
    try {
      const raw = window.localStorage.getItem('fittracker_e2e_linked_devices');
      const devices = raw ? JSON.parse(raw) as LinkedDevice[] : [];
      window.localStorage.setItem(
        'fittracker_e2e_linked_devices',
        JSON.stringify(devices.filter((device) => device.deviceId !== deviceId)),
      );
    } catch { /* noop */ }
    return;
  }
  const call = httpsCallable<{ platform: LinkedDevice['platform']; deviceId: string }, { revoked: boolean }>(
    functions,
    'unlinkLinkedDevice',
  );
  await call({ platform, deviceId });
}
