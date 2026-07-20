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
