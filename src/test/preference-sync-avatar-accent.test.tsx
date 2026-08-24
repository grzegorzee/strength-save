// X29 WP-H: PreferenceSync odpala automat akcentu z avatara WYŁĄCZNIE gdy
// user nie ma żadnego wyboru (brak preferences.accentColor ORAZ brak wpisu
// w localStorage). Wynik: applyAccent + storeAccentId + mirror w profilu.
// Każdy problem (null z derive, reject) = cichy fail, zostaje limonka.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

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

describe('PreferenceSync: automat akcentu z avatara (X29 WP-H)', () => {
  it('brak wyboru + photoURL: aplikuje, zapisuje localStorage i mirror w profilu', async () => {
    deriveAccentFromAvatar.mockResolvedValueOnce('rose');
    render(<PreferenceSync />);
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      'preferences.accentColor': 'rose',
    }));
    expect(deriveAccentFromAvatar).toHaveBeenCalledWith(PHOTO);
    expect(document.documentElement.dataset.accent).toBe('rose');
    expect(localStorage.getItem('ss-accent-color')).toBe('rose');
  });

  it('accentColor w profilu (nawet limonka) = automat NIE odpala się', async () => {
    mockProfile.current = { uid: 'u1', photoURL: PHOTO, preferences: { accentColor: 'lime' } };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('wpis w localStorage = automat NIE odpala się (wybór usera jest święty)', async () => {
    localStorage.setItem('ss-accent-color', 'indigo');
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
  });

  it('brak photoURL = automat NIE odpala się', async () => {
    mockProfile.current = { uid: 'u1', photoURL: '', preferences: undefined };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(deriveAccentFromAvatar).not.toHaveBeenCalled();
  });

  it('derive daje null (szary avatar/siec): zostaje limonka, zero zapisów', async () => {
    deriveAccentFromAvatar.mockResolvedValueOnce(null);
    render(<PreferenceSync />);
    await waitFor(() => expect(deriveAccentFromAvatar).toHaveBeenCalled());
    await Promise.resolve();
    expect(document.documentElement.dataset.accent).toBeUndefined();
    expect(localStorage.getItem('ss-accent-color')).toBeNull();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('derive odrzuca: cichy fail bez unhandled rejection', async () => {
    deriveAccentFromAvatar.mockRejectedValueOnce(new Error('boom'));
    render(<PreferenceSync />);
    await waitFor(() => expect(deriveAccentFromAvatar).toHaveBeenCalled());
    await Promise.resolve();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('user wybrał kolor w międzyczasie: wynik derive NIE nadpisuje wyboru', async () => {
    let resolveDerive: (id: string | null) => void = () => {};
    deriveAccentFromAvatar.mockReturnValueOnce(new Promise((res) => { resolveDerive = res; }));
    render(<PreferenceSync />);
    await waitFor(() => expect(deriveAccentFromAvatar).toHaveBeenCalled());
    // W trakcie pobierania avatara user kliknął swatch (np. w onboardingu).
    localStorage.setItem('ss-accent-color', 'amber');
    resolveDerive('sky');
    await Promise.resolve();
    await Promise.resolve();
    expect(localStorage.getItem('ss-accent-color')).toBe('amber');
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
