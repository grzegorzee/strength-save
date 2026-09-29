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
});
