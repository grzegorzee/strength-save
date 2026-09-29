import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  StravaSyncFailure,
  classifyStravaFailure,
  httpsErrorForStravaFailure,
  stravaSyncErrorDoc,
  withStravaFailureRecording,
} from "./strava-sync-failure";

// Dosłowna odpowiedź z produkcji (logi stravaScheduledSync 2026-08-31 08:00 UTC,
// oba połączone konta): refresh tokenu przeszedł, /athlete/activities dał 403.
const PROD_INACTIVE_BODY = "{\"message\":\"Forbidden\",\"errors\":[{\"resource\":\"Application\",\"field\":\"Status\",\"code\":\"Inactive\"}]}";

describe("F5b: klasyfikacja błędu synchronizacji Stravy", () => {
  it("403 Application/Status/Inactive z produkcji = aplikacja nieaktywna po stronie Stravy", () => {
    expect(classifyStravaFailure(403, PROD_INACTIVE_BODY, "api")).toBe("app_inactive");
    expect(classifyStravaFailure(403, PROD_INACTIVE_BODY, "refresh")).toBe("app_inactive");
  });

  it("odwołany dostęp albo zły refresh token = trzeba połączyć ponownie", () => {
    expect(classifyStravaFailure(401, "{\"message\":\"Authorization Error\",\"errors\":[{\"resource\":\"Athlete\",\"field\":\"access_token\",\"code\":\"invalid\"}]}", "api")).toBe("reauth_required");
    expect(classifyStravaFailure(400, "{\"message\":\"Bad Request\",\"errors\":[{\"resource\":\"RefreshToken\",\"field\":\"refresh_token\",\"code\":\"invalid\"}]}", "refresh")).toBe("reauth_required");
    // Brak zakresu activity:read_all (user odznaczył uprawnienie) też naprawia ponowne połączenie.
    expect(classifyStravaFailure(403, "{\"message\":\"Forbidden\",\"errors\":[{\"resource\":\"AccessToken\",\"field\":\"activity:read_permission\",\"code\":\"missing\"}]}", "api")).toBe("reauth_required");
  });

  it("limit API i awarie dostawcy nie wymagają akcji usera", () => {
    expect(classifyStravaFailure(429, "{\"message\":\"Rate Limit Exceeded\"}", "api")).toBe("rate_limited");
    expect(classifyStravaFailure(503, "<html>down</html>", "api")).toBe("provider_error");
    expect(classifyStravaFailure(500, "", "refresh")).toBe("provider_error");
  });

  it("zapisywany dokument błędu ma rodzaj, status i czas", () => {
    expect(stravaSyncErrorDoc(new StravaSyncFailure("app_inactive", 403), "2026-09-29T10:00:00.000Z"))
      .toEqual({ kind: "app_inactive", status: 403, at: "2026-09-29T10:00:00.000Z" });
  });

  it("callable dostaje stabilny kod, który klient tłumaczy (bez surowej odpowiedzi Stravy)", () => {
    expect(httpsErrorForStravaFailure("app_inactive")).toEqual({ code: "failed-precondition", message: "STRAVA_APP_INACTIVE" });
    expect(httpsErrorForStravaFailure("reauth_required")).toEqual({ code: "failed-precondition", message: "STRAVA_REAUTH_REQUIRED" });
    expect(httpsErrorForStravaFailure("rate_limited")).toEqual({ code: "unavailable", message: "STRAVA_UNAVAILABLE" });
    expect(httpsErrorForStravaFailure("provider_error")).toEqual({ code: "unavailable", message: "STRAVA_UNAVAILABLE" });
  });
});

describe("F5b: błąd synchronizacji zostaje zapisany (stan błędu ma wyjście w UI)", () => {
  it("zapisuje błąd Stravy i rzuca dalej", async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const failure = new StravaSyncFailure("app_inactive", 403);
    await expect(withStravaFailureRecording(async () => { throw failure; }, record)).rejects.toBe(failure);
    expect(record).toHaveBeenCalledWith(failure);
  });

  it("nie zapisuje nic przy sukcesie ani przy błędach spoza Stravy", async () => {
    const record = vi.fn();
    await expect(withStravaFailureRecording(async () => 7, record)).resolves.toBe(7);
    const other = new Error("STRAVA_ACCESS_CLOSED");
    await expect(withStravaFailureRecording(async () => { throw other; }, record)).rejects.toBe(other);
    expect(record).not.toHaveBeenCalled();
  });

  it("awaria zapisu błędu nie maskuje pierwotnego błędu Stravy", async () => {
    const failure = new StravaSyncFailure("reauth_required", 401);
    await expect(withStravaFailureRecording(async () => { throw failure; }, async () => { throw new Error("firestore down"); }))
      .rejects.toBe(failure);
  });
});

describe("F5b: kontrakt index.ts (ścieżki zapisu i czyszczenia błędu)", () => {
  const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const block = (start: string, end: string) => {
    const from = source.indexOf(start);
    expect(from).toBeGreaterThanOrEqual(0);
    const to = source.indexOf(end, from + start.length);
    expect(to).toBeGreaterThan(from);
    return source.slice(from, to);
  };

  it("sync ręczny i codzienny zapisują błąd Stravy", () => {
    expect(block("export const stravaSync = onCall", "export const")).toContain("withStravaFailureRecording(");
    expect(block("export const stravaScheduledSync = onSchedule", "export const stravaDisconnect")).toContain("withStravaFailureRecording(");
  });

  it("API i refresh rzucają sklasyfikowany StravaSyncFailure zamiast surowego HttpsError", () => {
    expect(block("async function refreshStravaToken", "interface SyncResult")).toContain("new StravaSyncFailure(");
    expect(block("async function syncUserActivities", "Scheduled daily Strava sync")).toContain("new StravaSyncFailure(");
  });

  it("udany sync, ponowne połączenie i rozłączenie czyszczą stravaSyncError", () => {
    expect(block("async function syncUserActivities", "Scheduled daily Strava sync")).toContain("stravaSyncError: FieldValue.delete()");
    expect(block("const saveStravaConnection", "const getStravaConnection")).toContain("stravaSyncError: FieldValue.delete()");
    expect(block("export const stravaDisconnect", "saveMaxHR usunięte")).toContain("stravaSyncError: FieldValue.delete()");
  });
});
