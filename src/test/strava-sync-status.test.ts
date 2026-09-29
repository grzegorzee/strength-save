// F5b (2026-09-29): sync Stravy stał od 2026-08-22 (403 Application Inactive,
// job wstrzymany), a UI pokazywało „Połączono". Stan synchronizacji musi być
// widoczny i mieć wyjście (zasada 6).
import { describe, expect, it } from 'vitest';
import {
  STRAVA_SYNC_STALE_MS,
  sanitizeStravaSyncError,
  stravaCallableErrorKey,
  stravaSyncHealth,
} from '@/lib/strava-sync-status';

const NOW = new Date('2026-09-29T10:00:00.000Z').getTime();

describe('sanitizeStravaSyncError', () => {
  it('przyjmuje kształt zapisywany przez backend', () => {
    expect(sanitizeStravaSyncError({ kind: 'app_inactive', status: 403, at: '2026-08-31T08:00:06.014Z' }))
      .toEqual({ kind: 'app_inactive', at: '2026-08-31T08:00:06.014Z' });
  });

  it.each([null, 'x', {}, { kind: 'nope', at: '2026-08-31T08:00:06Z' }, { kind: 'app_inactive', at: 'zła data' }])(
    'odrzuca śmieci: %j', (raw) => expect(sanitizeStravaSyncError(raw)).toBeUndefined(),
  );
});

describe('stravaSyncHealth', () => {
  it('stan właściciela z produkcji: ostatni sync 22.08, błąd 31.08 = błąd aplikacji nieaktywnej', () => {
    expect(stravaSyncHealth('2026-08-22T08:00:08.263Z', { kind: 'app_inactive', at: '2026-08-31T08:00:06.014Z' }, NOW))
      .toEqual({ state: 'error', kind: 'app_inactive', at: '2026-08-31T08:00:06.014Z' });
  });

  it('bez zapisanego błędu (job wstrzymany, nic się nie odpala) zastój i tak jest widoczny', () => {
    expect(stravaSyncHealth('2026-08-22T08:00:08.263Z', undefined, NOW)).toEqual({ state: 'stale', days: 38 });
  });

  it('świeży sync = ok; próg zastoju to 48 h', () => {
    expect(stravaSyncHealth(new Date(NOW - 60 * 60 * 1000).toISOString(), undefined, NOW)).toEqual({ state: 'ok' });
    expect(stravaSyncHealth(new Date(NOW - STRAVA_SYNC_STALE_MS).toISOString(), undefined, NOW)).toEqual({ state: 'ok' });
    expect(stravaSyncHealth(new Date(NOW - STRAVA_SYNC_STALE_MS - 1000).toISOString(), undefined, NOW).state).toBe('stale');
  });

  it('błąd starszy niż udany sync to relikt, nie aktualny stan', () => {
    expect(stravaSyncHealth('2026-09-29T09:00:00.000Z', { kind: 'reauth_required', at: '2026-09-28T09:00:00.000Z' }, NOW))
      .toEqual({ state: 'ok' });
  });

  it('świeże połączenie przed pierwszym importem (lastSync null) to nie zastój', () => {
    expect(stravaSyncHealth(null, undefined, NOW)).toEqual({ state: 'ok' });
  });
});

describe('stravaCallableErrorKey', () => {
  it('tłumaczy stabilne kody backendu na klucze i18n zamiast surowej odpowiedzi Stravy', () => {
    expect(stravaCallableErrorKey({ message: 'STRAVA_APP_INACTIVE' })).toBe('strava.err.appInactive');
    expect(stravaCallableErrorKey({ message: 'STRAVA_REAUTH_REQUIRED' })).toBe('strava.err.reauth');
    expect(stravaCallableErrorKey({ message: 'STRAVA_UNAVAILABLE' })).toBe('strava.err.unavailable');
    expect(stravaCallableErrorKey({ message: 'Retry in 30s' })).toBeNull();
    expect(stravaCallableErrorKey(null)).toBeNull();
  });
});
