import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PALETTE_THEMES, readStoredPaletteTheme, storePaletteTheme } from '@/lib/palette-theme';
import {
  enqueuePresetPalettePreference,
  readPalettePreferenceOutbox,
} from '@/lib/palette-preference-outbox';

const updateDoc = vi.hoisted(() => vi.fn(async (_ref?: unknown, _patch?: unknown) => {}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc }));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/palette-preference-cloud', () => ({
  writePalettePreference: vi.fn(async (_uid: string, patch: Record<string, unknown>) => {
    await updateDoc({}, patch);
    return 'synced';
  }),
}));
const profileFixture = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: profileFixture.current }),
}));
vi.mock('@/contexts/UnitContext', () => ({ useUnit: () => ({ unit: 'kg', setUnit: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ lang: 'pl', setLang: vi.fn() }),
}));

import { PreferenceSync } from '@/components/PreferenceSync';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.documentElement.style.cssText = '';
  delete document.documentElement.dataset.palette;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

describe('PreferenceSync: pojedynczy kolor bez palet', () => {
  it('ignoruje dawną paletę z chmury, czyści ją lokalnie i nie robi echo-write', async () => {
    profileFixture.current = {
      preferences: { accentColor: '#38bdf8', paletteTheme: PALETTE_THEMES[2] },
    };
    render(<PreferenceSync />);
    await Promise.resolve();

    expect(readStoredPaletteTheme()).toBeNull();
    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(document.documentElement.dataset.accent).toBe('custom');
    expect(document.documentElement.style.getPropertyValue('--palette-support-a')).toBe('');
    const paletteWrites = updateDoc.mock.calls
      .map((call) => (call as unknown as [unknown, Record<string, unknown>])[1])
      .filter((patch) => 'preferences.paletteTheme' in patch);
    expect(paletteWrites).toHaveLength(0);
  });

  it('stosuje pojedynczy accentColor', async () => {
    profileFixture.current = { preferences: { accentColor: 'indigo' } };
    render(<PreferenceSync />);
    await Promise.resolve();

    expect(readStoredPaletteTheme()).toBeNull();
    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(document.documentElement.dataset.accent).toBe('indigo');
  });

  it('accentColor wygrywa z dawną paletą', async () => {
    profileFixture.current = {
      preferences: { accentColor: 'indigo', paletteTheme: PALETTE_THEMES[0] },
    };
    render(<PreferenceSync />);
    await Promise.resolve();

    expect(readStoredPaletteTheme()).toBeNull();
    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(document.documentElement.dataset.accent).toBe('indigo');
  });

  it('historyczny outbox nie zmienia wyglądu ani nie wysyła wycofanej palety', async () => {
    profileFixture.current = {
      preferences: { accentColor: '#38bdf8', paletteTheme: PALETTE_THEMES[2] },
    };
    storePaletteTheme(PALETTE_THEMES[1]);
    enqueuePresetPalettePreference('u1', PALETTE_THEMES[1]);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    const firstRun = render(<PreferenceSync />);
    await Promise.resolve();
    expect(readStoredPaletteTheme()).toBeNull();
    expect(document.documentElement.dataset.accent).toBe('custom');
    expect(updateDoc).not.toHaveBeenCalled();

    firstRun.unmount();
    const afterKill = render(<PreferenceSync />);
    await Promise.resolve();
    expect(readStoredPaletteTheme()).toBeNull();
    expect(readPalettePreferenceOutbox('u1')?.palette.id).toBe('forge');

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    window.dispatchEvent(new Event('online'));
    await Promise.resolve();
    expect(updateDoc).not.toHaveBeenCalled();
    expect(readPalettePreferenceOutbox('u1')?.palette.id).toBe('forge');
    afterKill.unmount();
  });
});
