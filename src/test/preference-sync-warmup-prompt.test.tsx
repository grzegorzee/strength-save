// X37 WP-B: PreferenceSync = wejście chmura -> cache dla "Proponuj rozgrzewkę
// przed treningiem" (users/{uid}.preferences.warmupPrompt). Brak pola = włączone
// (cache urządzenia zostaje jak był), wartość z chmury nadpisuje cache.
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

import { PreferenceSync } from '@/components/PreferenceSync';
import { isWarmupPromptEnabled, setWarmupPromptEnabled, WARMUP_PROMPT_KEY } from '@/lib/warmup-prompt';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockProfile.current = { uid: 'u1', photoURL: '', preferences: undefined };
});

describe('PreferenceSync: preferences.warmupPrompt -> cache (X37)', () => {
  it('chmura false -> cache false (start bez arkusza na tym urządzeniu)', async () => {
    mockProfile.current = { uid: 'u1', photoURL: '', preferences: { warmupPrompt: false } };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(localStorage.getItem(WARMUP_PROMPT_KEY)).toBe('false');
    expect(isWarmupPromptEnabled()).toBe(false);
  });

  it('chmura true nadpisuje wyłączony cache (włączone na innym urządzeniu)', async () => {
    setWarmupPromptEnabled(false);
    mockProfile.current = { uid: 'u1', photoURL: '', preferences: { warmupPrompt: true } };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(isWarmupPromptEnabled()).toBe(true);
  });

  it('brak pola w chmurze = włączone; cache urządzenia nietknięty, zero zapisów', async () => {
    mockProfile.current = { uid: 'u1', photoURL: '', preferences: { unit: 'kg' } };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(localStorage.getItem(WARMUP_PROMPT_KEY)).toBeNull();
    expect(isWarmupPromptEnabled()).toBe(true);
    const warmupWrites = updateDoc.mock.calls
      .map((call) => (call as unknown as [unknown, Record<string, unknown>])[1])
      .filter((patch) => 'preferences.warmupPrompt' in patch);
    expect(warmupWrites).toHaveLength(0);
  });
});
