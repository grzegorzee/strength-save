// F5b (2026-09-29): stan synchronizacji Stravy widoczny dla usera.
//
// Root cause z produkcji: od 2026-08-23 Strava odpowiada 403
// `Application Status Inactive` na /athlete/activities (odświeżenie tokenu
// działa), a codzienny job został wstrzymany 2026-08-31. Profil pokazywał
// „Połączono" bez słowa o tym, że nic nie spływa. Serwer zapisuje teraz
// `users/{uid}.stravaSyncError`; klient dodatkowo sam wykrywa zastój po dacie
// ostatniej synchronizacji (działa nawet wtedy, gdy żaden sync się nie odpala).

export const STRAVA_SYNC_ERROR_KINDS = ['app_inactive', 'reauth_required', 'rate_limited', 'provider_error'] as const;
export type StravaSyncErrorKind = (typeof STRAVA_SYNC_ERROR_KINDS)[number];

export interface StravaSyncError {
  kind: StravaSyncErrorKind;
  at: string;
}

/** Codzienny sync + zapas na jeden opuszczony dzień. */
export const STRAVA_SYNC_STALE_MS = 48 * 60 * 60 * 1000;

export const sanitizeStravaSyncError = (raw: unknown): StravaSyncError | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const { kind, at } = raw as { kind?: unknown; at?: unknown };
  if (typeof kind !== 'string' || !(STRAVA_SYNC_ERROR_KINDS as readonly string[]).includes(kind)) return undefined;
  if (typeof at !== 'string' || !Number.isFinite(new Date(at).getTime())) return undefined;
  return { kind: kind as StravaSyncErrorKind, at };
};

const CALLABLE_ERROR_KEYS = {
  STRAVA_APP_INACTIVE: 'strava.err.appInactive',
  STRAVA_REAUTH_REQUIRED: 'strava.err.reauth',
  STRAVA_UNAVAILABLE: 'strava.err.unavailable',
} as const;

/** Stabilne kody callable (functions `httpsErrorForStravaFailure`) na klucze i18n. */
export const stravaCallableErrorKey = (
  err: unknown,
): (typeof CALLABLE_ERROR_KEYS)[keyof typeof CALLABLE_ERROR_KEYS] | null => {
  const message = err && typeof err === 'object' ? (err as { message?: unknown }).message : undefined;
  if (typeof message !== 'string') return null;
  const code = Object.keys(CALLABLE_ERROR_KEYS).find((key) => message.includes(key)) as keyof typeof CALLABLE_ERROR_KEYS | undefined;
  return code ? CALLABLE_ERROR_KEYS[code] : null;
};

export type StravaSyncHealth =
  | { state: 'ok' }
  | { state: 'error'; kind: StravaSyncErrorKind; at: string }
  | { state: 'stale'; days: number };

export const stravaSyncHealth = (
  lastSync: string | null | undefined,
  syncError: StravaSyncError | undefined,
  nowMs: number,
): StravaSyncHealth => {
  const lastMs = lastSync ? new Date(lastSync).getTime() : NaN;
  // Serwer czyści błąd po udanym syncu; starszy błąd niż ostatni sukces to relikt.
  if (syncError && !(Number.isFinite(lastMs) && lastMs > new Date(syncError.at).getTime())) {
    return { state: 'error', kind: syncError.kind, at: syncError.at };
  }
  // Brak lastSync = świeże połączenie przed pierwszym importem, nie zastój.
  if (Number.isFinite(lastMs) && nowMs - lastMs > STRAVA_SYNC_STALE_MS) {
    return { state: 'stale', days: Math.floor((nowMs - lastMs) / (24 * 60 * 60 * 1000)) };
  }
  return { state: 'ok' };
};
