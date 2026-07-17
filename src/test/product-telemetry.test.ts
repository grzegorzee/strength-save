import { describe, expect, it } from 'vitest';
import { screenKeyForPath, shouldTrackSessionActive } from '@/lib/product-telemetry';

describe('screenKeyForPath (Z94)', () => {
  it('mapuje trasy główne na klucze ekranów', () => {
    expect(screenKeyForPath('/')).toBe('screen_dashboard');
    expect(screenKeyForPath('/plan')).toBe('screen_plan');
    expect(screenKeyForPath('/analytics')).toBe('screen_analytics');
    expect(screenKeyForPath('/exercises')).toBe('screen_exercises');
    expect(screenKeyForPath('/profile')).toBe('screen_profile');
    expect(screenKeyForPath('/history')).toBe('screen_history');
    expect(screenKeyForPath('/measurements')).toBe('screen_measurements');
    expect(screenKeyForPath('/achievements')).toBe('screen_achievements');
    expect(screenKeyForPath('/cycles')).toBe('screen_cycles');
    expect(screenKeyForPath('/settings')).toBe('screen_settings');
    expect(screenKeyForPath('/workout/day-1')).toBe('screen_workout');
  });
  it('trasy poza whitelist dają null (admin, nieznane)', () => {
    expect(screenKeyForPath('/admin')).toBeNull();
    expect(screenKeyForPath('/admin/users/abc')).toBeNull();
    expect(screenKeyForPath('/cos-dziwnego')).toBeNull();
  });
});

describe('shouldTrackSessionActive (Z94)', () => {
  it('true przy pierwszym wywołaniu danego dnia, false przy kolejnych', () => {
    const store = new Map<string, string>();
    const deps = {
      get: (k: string) => store.get(k) ?? null,
      set: (k: string, v: string) => void store.set(k, v),
    };
    expect(shouldTrackSessionActive('u1', '2026-07-17', deps)).toBe(true);
    expect(shouldTrackSessionActive('u1', '2026-07-17', deps)).toBe(false);
    expect(shouldTrackSessionActive('u1', '2026-07-18', deps)).toBe(true);
  });
  it('guard jest per user', () => {
    const store = new Map<string, string>();
    const deps = {
      get: (k: string) => store.get(k) ?? null,
      set: (k: string, v: string) => void store.set(k, v),
    };
    expect(shouldTrackSessionActive('u1', '2026-07-17', deps)).toBe(true);
    expect(shouldTrackSessionActive('u2', '2026-07-17', deps)).toBe(true);
  });
});
