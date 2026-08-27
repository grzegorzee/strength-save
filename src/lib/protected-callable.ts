import { httpsCallable } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';
import { appCheckReady, functions } from '@/lib/firebase';
import { withTimeout } from '@/lib/promise-timeout';

// Chroniona ścieżka callable dla flow pierwszego uruchomienia (rejestracja,
// zgody). Na iOS/Android żądanie idzie przez callNativeAttestedFunction
// (App Attest/Play Integrity best-effort + twardy timeout 10 s), na webie
// przez httpsCallable z timeoutem 10 s zamiast domyślnych 70 s SDK — spinner
// bez komunikatu przez ponad minutę na zdegradowanej sieci to pułapka (bug 34).
// Wydzielone z registration-api do osobnego modułu, żeby consents-api nie
// ciągnął całego modułu rejestracji (testy jsdom, komentarz w
// consent-selection.ts).
export const PROTECTED_CALLABLE_WEB_TIMEOUT_MS = 10000;

export type ProtectedCallableRejectionReason =
  | 'app-verification-required'
  | 'registration-closed';

/**
 * Backend celowo używa permission-denied dla obu blokad rejestracji. UI może
 * je rozróżnić wyłącznie po stabilnym details.reason; sam tekst błędu nie jest
 * kontraktem i może być zlokalizowany albo zmieniony przez transport Firebase.
 */
export function getProtectedCallableRejectionReason(
  error: unknown,
): ProtectedCallableRejectionReason | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { code?: unknown; details?: unknown };
  const code = typeof candidate.code === 'string'
    ? candidate.code.replace(/^functions\//, '')
    : '';
  if (code !== 'permission-denied') return null;
  if (!candidate.details || typeof candidate.details !== 'object') return null;
  const reason = (candidate.details as { reason?: unknown }).reason;
  return reason === 'app-verification-required' || reason === 'registration-closed'
    ? reason
    : null;
}

export async function callProtectedFunction<RequestData, ResponseData>(
  functionName: string,
  data: RequestData,
): Promise<ResponseData> {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') {
    const { callNativeAttestedFunction } = await import('@/lib/native-callable');
    return callNativeAttestedFunction<RequestData, ResponseData>(functionName, data);
  }
  // Bug 35: nie wysyłaj żądania, zanim webowy App Check się zarejestruje —
  // SDK dołącza wtedy brak tokenu i tworzenie profilu pada permission-denied.
  // appCheckReady ma własny limit czasu w firebase.ts, więc nie wisi.
  await appCheckReady;
  const fn = httpsCallable<RequestData, ResponseData>(functions, functionName);
  return (await withTimeout(
    fn(data),
    PROTECTED_CALLABLE_WEB_TIMEOUT_MS,
    `Protected function ${functionName}`,
  )).data;
}
