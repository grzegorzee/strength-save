// X35b: PreferenceSync = jedyne wejście chmura -> cache dla przerw
// (users/{uid}.preferences.rest). Migracja RAZ z legacy restTimerSec albo z cache
// urządzenia (custom: true), świeży user bez zapisów = zero zapisów.
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

import { PreferenceSync } from '@/components/PreferenceSync';
import { DEFAULT_REST_SETTINGS, loadRestSettings, saveRestSettings } from '@/lib/rest-timer';
import { buildMigratedRestSettings } from '@/lib/rest-preferences';

const restWrite = () => updateDoc.mock.calls
  .map((call) => (call as unknown as [unknown, Record<string, unknown>])[1])
  .find((patch) => 'preferences.rest' in patch);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockProfile.current = { uid: 'u1', photoURL: '', preferences: undefined };
});

describe('PreferenceSync: przerwy z preferences.rest (X35b)', () => {
  it('chmura ma preferences.rest -> cache nadpisany (chmura jest źródłem prawdy)', async () => {
    saveRestSettings({ ...DEFAULT_REST_SETTINGS, workingSeconds: 45, custom: true });
    mockProfile.current = {
      uid: 'u1', photoURL: '',
      preferences: { rest: { workingSeconds: 180, betweenExercisesSeconds: 240, warmupSeconds: 90, perExercise: {}, custom: false } },
    };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(loadRestSettings()).toEqual({
      workingSeconds: 180, betweenExercisesSeconds: 240, warmupSeconds: 90, perExercise: {}, custom: false,
    });
    expect(restWrite()).toBeUndefined();
  });

  it('brak rest, jest legacy restTimerSec -> migracja: workingSeconds z legacy, custom true, jeden zapis', async () => {
    mockProfile.current = { uid: 'u1', photoURL: '', preferences: { restTimerSec: 120 } };
    render(<PreferenceSync />);
    await waitFor(() => expect(restWrite()).toBeDefined());
    expect(restWrite()).toEqual({
      'preferences.rest': {
        workingSeconds: 120,
        warmupSeconds: DEFAULT_REST_SETTINGS.warmupSeconds,
        betweenExercisesSeconds: DEFAULT_REST_SETTINGS.betweenExercisesSeconds,
        perExercise: {},
        custom: true,
      },
    });
    expect(loadRestSettings()).toMatchObject({ workingSeconds: 120, custom: true });
    // Legacy pole nie jest już pisane.
    expect(updateDoc.mock.calls.some((c) => 'preferences.restTimerSec' in (c as unknown as [unknown, Record<string, unknown>])[1])).toBe(false);
  });

  it('brak rest i legacy, ale cache urządzenia ma zapis -> migracja z cache (custom true)', async () => {
    saveRestSettings({ workingSeconds: 100, betweenExercisesSeconds: 200, warmupSeconds: 50, perExercise: { przysiad: 240 } });
    render(<PreferenceSync />);
    await waitFor(() => expect(restWrite()).toBeDefined());
    expect(restWrite()).toEqual({
      'preferences.rest': {
        workingSeconds: 100, warmupSeconds: 50, betweenExercisesSeconds: 200, perExercise: { przysiad: 240 }, custom: true,
      },
    });
  });

  it('świeży user (brak rest, legacy i cache) -> zero zapisów, cache = domyślne', async () => {
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(restWrite()).toBeUndefined();
    expect(loadRestSettings()).toMatchObject({ workingSeconds: DEFAULT_REST_SETTINGS.workingSeconds });
  });

  it('buildMigratedRestSettings: legacy 0 / ujemne = jak brak', () => {
    expect(buildMigratedRestSettings({ restTimerSec: 0 })).toBeNull();
    expect(buildMigratedRestSettings({ restTimerSec: -5 })).toBeNull();
    expect(buildMigratedRestSettings(undefined)).toBeNull();
  });
});
