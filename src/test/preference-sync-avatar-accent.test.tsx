// X29 WP-H: PreferenceSync odpala automat akcentu z avatara WYŁĄCZNIE gdy
// user nie ma żadnego wyboru (brak preferences.accentColor ORAZ brak wpisu
// w localStorage). Wynik: applyAccent + storeAccentId + mirror w profilu.
// Każdy problem (null z derive, reject) = cichy fail, zostaje limonka.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const updateDoc = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc }));
vi.mock('@/lib/firebase', () => ({ db: {} }));

const mockProfile = vi.hoisted(() => ({
  uid: 'u1',
  current: {} as Record<string, unknown>,
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: mockProfile.uid, profile: mockProfile.current }),
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
  delete document.documentElement.dataset.palette;
  mockProfile.uid = 'u1';
  mockProfile.current = { uid: 'u1', photoURL: PHOTO, preferences: undefined };
});

describe('PreferenceSync: avatar nie jest wtórnie przetwarzany bez zgody', () => {
  it('brak wyboru + photoURL: automat nie analizuje ani nie zapisuje zdjęcia poza onboardingiem', async () => {
    deriveAccentFromAvatar.mockResolvedValueOnce('rose');
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
    expect(localStorage.getItem('ss-accent-color')).toBe('lime');
  });

  it('accentColor w profilu (nawet limonka) pozostaje nietknięty', async () => {
    mockProfile.current = { uid: 'u1', photoURL: PHOTO, preferences: { accentColor: 'lime' } };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('cloud accent jest źródłem prawdy dla pojedynczego koloru', async () => {
    localStorage.setItem('ss-accent-color', 'rose');
    mockProfile.current = { uid: 'u1', photoURL: '', preferences: { accentColor: 'indigo' } };

    render(<PreferenceSync />);
    await Promise.resolve();

    expect(localStorage.getItem('ss-accent-color')).toBe('indigo');
    expect(document.documentElement.dataset.accent).toBe('indigo');
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('235 86% 65%');
    const accentWrites = updateDoc.mock.calls
      .map((call) => (call as unknown as [unknown, Record<string, unknown>])[1])
      .filter((patch) => 'preferences.accentColor' in patch);
    expect(accentWrites).toHaveLength(0);
  });

  it('wpis w localStorage pozostaje nietknięty (wybór usera jest święty)', async () => {
    localStorage.setItem('ss-accent-color', 'indigo');
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
  });

  it('konto B nie dziedziczy lokalnego motywu właściciela A', async () => {
    localStorage.setItem('ss-theme-owner-v1', 'user-a');
    localStorage.setItem('ss-accent-color', 'indigo');
    localStorage.setItem('ss-palette-theme-v2', JSON.stringify({
      version: 2,
      id: 'glacier',
      source: 'preset',
      primary: '#38bdf8',
      supportA: '#818cf8',
      supportB: '#2dd4bf',
    }));
    mockProfile.uid = 'user-b';
    mockProfile.current = { uid: 'user-b', photoURL: '', preferences: undefined };

    render(<PreferenceSync />);
    await Promise.resolve();

    expect(localStorage.getItem('ss-accent-color')).toBe('lime');
    expect(localStorage.getItem('ss-palette-theme-v2')).toBeNull();
    expect(localStorage.getItem('ss-theme-owner-v1')).toBe('user-b');
    expect(document.documentElement.dataset.accent).toBeUndefined();
    expect(document.documentElement.dataset.palette).toBeUndefined();
  });

  it('zmiana konta bez remountu także resetuje cache poprzedniego UID', async () => {
    localStorage.setItem('ss-theme-owner-v1', 'user-a');
    localStorage.setItem('ss-accent-color', 'indigo');
    mockProfile.uid = 'user-a';
    mockProfile.current = { uid: 'user-a', photoURL: '', preferences: undefined };

    const view = render(<PreferenceSync />);
    await Promise.resolve();
    expect(localStorage.getItem('ss-accent-color')).toBe('indigo');

    mockProfile.uid = 'user-b';
    mockProfile.current = { uid: 'user-b', photoURL: '', preferences: undefined };
    view.rerender(<PreferenceSync />);
    await Promise.resolve();

    expect(localStorage.getItem('ss-accent-color')).toBe('lime');
    expect(localStorage.getItem('ss-theme-owner-v1')).toBe('user-b');
  });

  it('brak photoURL także nie uruchamia analizy', async () => {
    mockProfile.current = { uid: 'u1', photoURL: '', preferences: undefined };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
  });

});
