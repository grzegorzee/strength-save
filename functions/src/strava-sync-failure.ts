/**
 * F5b (2026-09-29): klasyfikacja i zapis błędów synchronizacji Stravy.
 *
 * Root cause z produkcji: od 2026-08-23 /athlete/activities odpowiada 403
 * `{"resource":"Application","field":"Status","code":"Inactive"}` (refresh
 * tokenu przechodzi), a codzienny job wstrzymano 2026-08-31. Błąd lądował
 * tylko w logach, user widział „Połączono” i stojące dane. Teraz rodzaj błędu
 * trafia do `users/{uid}.stravaSyncError`, a callable zwraca stabilny kod.
 */
export type StravaSyncErrorKind = "app_inactive" | "reauth_required" | "rate_limited" | "provider_error";

export class StravaSyncFailure extends Error {
  constructor(readonly kind: StravaSyncErrorKind, readonly status: number) {
    super(`Strava sync failed: ${kind} (${status})`);
    this.name = "StravaSyncFailure";
  }
}

const isApplicationInactive = (body: string): boolean => {
  try {
    const parsed = JSON.parse(body) as { errors?: Array<{ resource?: unknown; code?: unknown }> };
    return Array.isArray(parsed.errors)
      && parsed.errors.some((e) => e?.resource === "Application" && e?.code === "Inactive");
  } catch {
    return false;
  }
};

export function classifyStravaFailure(status: number, body: string, stage: "refresh" | "api"): StravaSyncErrorKind {
  if (isApplicationInactive(body)) return "app_inactive";
  if (status === 429) return "rate_limited";
  // refresh: 400/401 = refresh token nieważny albo dostęp odwołany w Stravie.
  if (stage === "refresh" && (status === 400 || status === 401)) return "reauth_required";
  // api: 401 = token odwołany; 403 bez „Inactive” = brak zakresu (np. activity:read_all).
  if (stage === "api" && (status === 401 || status === 403)) return "reauth_required";
  return "provider_error";
}

export function stravaSyncErrorDoc(failure: StravaSyncFailure, nowIso: string) {
  return { kind: failure.kind, status: failure.status, at: nowIso };
}

export function httpsErrorForStravaFailure(kind: StravaSyncErrorKind): { code: "failed-precondition" | "unavailable"; message: string } {
  if (kind === "app_inactive") return { code: "failed-precondition", message: "STRAVA_APP_INACTIVE" };
  if (kind === "reauth_required") return { code: "failed-precondition", message: "STRAVA_REAUTH_REQUIRED" };
  return { code: "unavailable", message: "STRAVA_UNAVAILABLE" };
}

/** Zapisuje sklasyfikowany błąd Stravy (best effort) i rzuca go dalej bez zmian. */
export async function withStravaFailureRecording<T>(
  run: () => Promise<T>,
  record: (failure: StravaSyncFailure) => Promise<unknown>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof StravaSyncFailure) {
      await record(error).catch(() => undefined);
    }
    throw error;
  }
}
