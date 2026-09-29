// Lekcja builda 88: mapper pole-po-polu, nowe pole bez wpisu znika.
// F5 (2026-09-29): „Twoje liczby" pokazuje datę ostatniej synchronizacji Stravy.
import { describe, expect, it } from 'vitest';
import { mapAppUserProfile } from '@/lib/user-profile';
import type { AppUserProfile } from '@/lib/registration-api';

const seed = { userId: 'u1', email: 'a@b.c', displayName: 'T', photoURL: '' };
const map = (extra: Record<string, unknown>) => mapAppUserProfile('u1', { email: 'a@b.c', ...extra } as unknown as AppUserProfile, seed);

describe('mapAppUserProfile: pola Stravy', () => {
  it('przenosi datę ostatniej synchronizacji', () => {
    expect(map({ stravaConnected: true, stravaLastSync: '2026-08-22T08:00:08.263Z' }).stravaLastSync)
      .toBe('2026-08-22T08:00:08.263Z');
  });

  it('null (reset po połączeniu) i śmieci dają brak daty, nie wyjątek', () => {
    expect(map({ stravaLastSync: null }).stravaLastSync).toBeUndefined();
    expect(map({ stravaLastSync: 'nie-data' }).stravaLastSync).toBeUndefined();
    expect(map({}).stravaLastSync).toBeUndefined();
  });

  it('F5b: przenosi zsanityzowany błąd synchronizacji zapisany przez backend', () => {
    expect(map({ stravaSyncError: { kind: 'app_inactive', status: 403, at: '2026-08-31T08:00:06.014Z' } }).stravaSyncError)
      .toEqual({ kind: 'app_inactive', at: '2026-08-31T08:00:06.014Z' });
    expect(map({ stravaSyncError: { kind: 'x' } }).stravaSyncError).toBeUndefined();
  });
});
