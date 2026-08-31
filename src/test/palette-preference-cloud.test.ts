import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PALETTE_THEMES } from '@/lib/palette-theme';
import type { PalettePreferenceOutboxEntry, PalettePreferencePatch } from '@/lib/palette-preference-outbox';

const harness = vi.hoisted(() => ({
  preferences: {} as Record<string, unknown>,
  update: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ path: 'users/u1' })),
  runTransaction: vi.fn(async (_db, callback) => callback({
    get: vi.fn(async () => ({ data: () => ({ preferences: harness.preferences }) })),
    update: harness.update,
  })),
}));

import { writePalettePreference } from '@/lib/palette-preference-cloud';

const entry = (baseRevision: number): PalettePreferenceOutboxEntry => ({
  version: 2,
  uid: 'u1',
  clientMutationId: 'mutation-a',
  queuedAt: 1,
  baseRevision,
  palette: PALETTE_THEMES[0],
});
const patch = (baseRevision: number): PalettePreferencePatch => ({
  'preferences.accentColor': PALETTE_THEMES[0].primary,
  'preferences.paletteTheme': PALETTE_THEMES[0],
  'preferences.paletteRevision': baseRevision + 1,
  'preferences.paletteMutationId': 'mutation-a',
});

describe('transakcyjny zapis palety między urządzeniami', () => {
  beforeEach(() => {
    harness.preferences = {};
    harness.update.mockClear();
  });

  it('nie pozwala staremu outboxowi nadpisać wyższej rewizji z innego urządzenia', async () => {
    harness.preferences = { paletteRevision: 4, paletteMutationId: 'mutation-b' };

    await expect(writePalettePreference('u1', patch(2), entry(2))).resolves.toBe('stale');
    expect(harness.update).not.toHaveBeenCalled();
  });

  it('zapisuje następną rewizję i pozostaje idempotentny dla tego samego mutationId', async () => {
    harness.preferences = { paletteRevision: 2 };
    await expect(writePalettePreference('u1', patch(2), entry(2))).resolves.toBe('synced');
    expect(harness.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      'preferences.paletteRevision': 3,
    }));

    harness.update.mockClear();
    harness.preferences = { paletteRevision: 3, paletteMutationId: 'mutation-a' };
    await expect(writePalettePreference('u1', patch(2), entry(2))).resolves.toBe('synced');
    expect(harness.update).not.toHaveBeenCalled();
  });
});
