// X29 WP-H: PreferenceSync odpala automat akcentu z avatara WYŁĄCZNIE gdy
// user nie ma żadnego wyboru (brak preferences.accentColor ORAZ brak wpisu
// w localStorage). Wynik: applyAccent + storeAccentId + mirror w profilu.
// Każdy problem (null z derive, reject) = cichy fail, zostaje limonka.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const updateDoc = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc }));
vi.mock('@/lib/firebase', () => ({ db: {} }));

const mockProfile = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: mockProfile.current }),
}));
vi.mock('@/contexts/UnitContext', () => ({
  useUnit: () => ({ unit: 'kg', setUnit: vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ lang: 'pl', setLang: vi.fn() }),
}));

const deriveAccentFromAvatar = vi.hoisted(() => vi.fn(async (): Promise<string | null> => null));
vi.mock('@/lib/avatar-accent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/avatar-accent')>();
  return { ...actual, deriveAccentFromAvatar };
});

import { PreferenceSync } from '@/components/PreferenceSync';

const PHOTO = 'https://lh3.example/avatar.jpg';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.documentElement.style.cssText = '';
  delete document.documentElement.dataset.accent;
  mockProfile.current = { uid: 'u1', photoURL: PHOTO, preferences: undefined };
});

describe('PreferenceSync: avatar nie jest wtórnie przetwarzany bez zgody', () => {
  it('brak wyboru + photoURL: automat nie analizuje ani nie zapisuje zdjęcia poza onboardingiem', async () => {
    deriveAccentFromAvatar.mockResolvedValueOnce('rose');
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
    expect(localStorage.getItem('ss-accent-color')).toBeNull();
  });

  it('accentColor w profilu (nawet limonka) pozostaje nietknięty', async () => {
    mockProfile.current = { uid: 'u1', photoURL: PHOTO, preferences: { accentColor: 'lime' } };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('wpis w localStorage pozostaje nietknięty (wybór usera jest święty)', async () => {
    localStorage.setItem('ss-accent-color', 'indigo');
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
  });

  it('brak photoURL także nie uruchamia analizy', async () => {
    mockProfile.current = { uid: 'u1', photoURL: '', preferences: undefined };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
  });

});
