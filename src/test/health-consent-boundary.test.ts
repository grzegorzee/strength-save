import { describe, expect, it } from 'vitest';

import { getActiveHealthGrant, hasActiveHealthConsent, LEGAL_VERSIONS } from '@/lib/legal-versions';

describe('health consent boundary', () => {
  it('jest fail-closed dla braku, odmowy i starej wersji mirrora', () => {
    expect(hasActiveHealthConsent(undefined)).toBe(false);
    expect(hasActiveHealthConsent({
      healthGranted: false,
      healthVersion: LEGAL_VERSIONS.health,
      healthEpoch: 1,
    })).toBe(false);
    expect(hasActiveHealthConsent({
      healthGranted: true,
      healthVersion: 'stale',
      healthEpoch: 1,
    })).toBe(false);
    expect(hasActiveHealthConsent({
      healthGranted: true,
      healthVersion: LEGAL_VERSIONS.health,
    })).toBe(false);
    expect(hasActiveHealthConsent({
      healthGranted: true,
      healthVersion: LEGAL_VERSIONS.health,
      healthEpoch: 0,
    })).toBe(false);
  });

  it('odblokowuje funkcje zdrowotne wyłącznie po aktualnym grant', () => {
    const mirror = {
      healthGranted: true,
      healthVersion: LEGAL_VERSIONS.health,
      healthEpoch: 3,
      healthGrantId: 'grant-3',
    } as const;
    expect(hasActiveHealthConsent(mirror)).toBe(true);
    expect(getActiveHealthGrant(mirror)).toEqual({ healthEpoch: 3, healthGrantId: 'grant-3' });
  });

  it('nie ujawnia epoki ani grantId dla nieaktywnej zgody', () => {
    expect(getActiveHealthGrant({
      healthGranted: false,
      healthVersion: LEGAL_VERSIONS.health,
      healthEpoch: 3,
      healthGrantId: 'grant-3',
    })).toBeNull();
  });
});
