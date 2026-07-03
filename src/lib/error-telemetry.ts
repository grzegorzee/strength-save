import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Capacitor } from '@capacitor/core';
import type { WorkoutSyncErrorCode } from '@/lib/workout-sync-conflict';

// Rejestr błędów produkcyjnych klienta (kolekcja client_errors) — kończy erę
// debugowania screenshotami. Best-effort: nigdy nie rzuca, nie blokuje UI.
const CLIENT_ERRORS_COLLECTION = 'client_errors';
const MAX_REPORTS_PER_APP_SESSION = 20;
const MAX_DETAIL_LENGTH = 500;

let reportsThisSession = 0;

export interface ClientErrorEntry {
  code: WorkoutSyncErrorCode | string;
  phase: 'checkpoint' | 'final' | 'edit' | 'conflict-resolve' | 'other';
  detail?: string;
  sessionId?: string;
}

const hashSessionId = async (sessionId: string): Promise<string> => {
  const bytes = new TextEncoder().encode(sessionId);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 8);
};

export const reportClientError = async (uid: string, entry: ClientErrorEntry): Promise<void> => {
  try {
    if (!uid || reportsThisSession >= MAX_REPORTS_PER_APP_SESSION) return;
    reportsThisSession += 1;

    const sessionHash = entry.sessionId ? await hashSessionId(entry.sessionId) : undefined;
    await addDoc(collection(db, CLIENT_ERRORS_COLLECTION), {
      userId: uid,
      code: String(entry.code).slice(0, 100),
      phase: entry.phase,
      detail: String(entry.detail ?? '').slice(0, MAX_DETAIL_LENGTH),
      ...(sessionHash && { sessionHash }),
      appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown',
      platform: Capacitor.getPlatform(),
      createdAt: Date.now(),
    });
  } catch {
    // best-effort: telemetria błędów nie może generować własnych błędów w UI
  }
};

export const __resetErrorTelemetryForTests = (): void => {
  reportsThisSession = 0;
};
