import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PALETTE_THEMES } from '@/lib/palette-theme';
import {
  discardPalettePreferenceOutbox,
  enqueuePresetPalettePreference,
  flushPalettePreferenceOutbox,
  readPalettePreferenceOutbox,
} from '@/lib/palette-preference-outbox';

describe('outbox preferencji gotowej palety', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('przyjmuje wyłącznie trzy kanoniczne presety 1.0', () => {
    const queued = enqueuePresetPalettePreference('u1', PALETTE_THEMES[1], 7);
    expect(queued?.palette.id).toBe('forge');
    expect(queued?.baseRevision).toBe(7);
    expect(enqueuePresetPalettePreference('u1', {
      version: 2,
      id: 'avatar-custom',
      source: 'avatar',
      primary: '#111111',
      supportA: '#222222',
      supportB: '#333333',
    })).toBeNull();
  });

  it('usuwa stary wpis odrzucony przez wyższą rewizję z innego urządzenia', async () => {
    enqueuePresetPalettePreference('u1', PALETTE_THEMES[0], 2);
    const writer = vi.fn(async () => 'stale' as const);

    await expect(flushPalettePreferenceOutbox('u1', writer)).resolves.toBe('stale');
    expect(writer).toHaveBeenCalledWith(
      expect.objectContaining({ 'preferences.paletteRevision': 3 }),
      expect.objectContaining({ baseRevision: 2 }),
    );
    expect(readPalettePreferenceOutbox('u1')).toBeNull();
  });

  it('po porażce zachowuje wpis, a równoległy retry wykonuje jeden idempotentny zapis', async () => {
    enqueuePresetPalettePreference('u1', PALETTE_THEMES[1]);
    const rejectedWriter = vi.fn(async () => { throw new Error('offline'); });

    await expect(flushPalettePreferenceOutbox('u1', rejectedWriter)).resolves.toBe('pending');
    expect(readPalettePreferenceOutbox('u1')?.palette.id).toBe('forge');

    let resolveWrite: (() => void) | undefined;
    const writer = vi.fn(() => new Promise<void>((resolve) => { resolveWrite = resolve; }));
    const first = flushPalettePreferenceOutbox('u1', writer);
    const second = flushPalettePreferenceOutbox('u1', writer);
    expect(writer).toHaveBeenCalledTimes(1);
    resolveWrite?.();

    await expect(Promise.all([first, second])).resolves.toEqual(['synced', 'synced']);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(readPalettePreferenceOutbox('u1')).toBeNull();
  });

  it('świadomy wybór legacy usuwa oczekujący preset tylko dla bieżącego UID', () => {
    enqueuePresetPalettePreference('u1', PALETTE_THEMES[1]);
    discardPalettePreferenceOutbox('other-user');
    expect(readPalettePreferenceOutbox('u1')?.palette.id).toBe('forge');

    discardPalettePreferenceOutbox('u1');
    expect(readPalettePreferenceOutbox('u1')).toBeNull();
  });

  it('po discardzie flush nie wykonuje zapisu — stary preset nie wraca po wyborze legacy/custom', async () => {
    enqueuePresetPalettePreference('u1', PALETTE_THEMES[1]);
    discardPalettePreferenceOutbox('u1');

    const writer = vi.fn(async () => undefined);
    await expect(flushPalettePreferenceOutbox('u1', writer)).resolves.toBe('none');
    expect(writer).not.toHaveBeenCalled();
  });
});
