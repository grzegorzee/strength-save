// Z201: regulacja głośności sygnałów timera (zgłoszenie usera 2026-08-06).
// Minimum 0.2, nie 0 — pełne wyciszenie ma swój przełącznik w Profilu.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_TIMER_VOLUME,
  MIN_TIMER_VOLUME,
  clampTimerVolume,
  loadTimerVolume,
  saveTimerVolume,
} from '@/lib/timer-volume';

beforeEach(() => {
  localStorage.clear();
});

describe('timer-volume', () => {
  it('bez zapisu zwraca domyślną pełną głośność', () => {
    expect(loadTimerVolume()).toBe(DEFAULT_TIMER_VOLUME);
  });

  it('zapis i odczyt zachowują wartość', () => {
    saveTimerVolume(0.65);
    expect(loadTimerVolume()).toBe(0.65);
  });

  it('clamp: poniżej minimum → 0.2, powyżej 1 → 1, NaN → domyślna', () => {
    expect(clampTimerVolume(0.05)).toBe(MIN_TIMER_VOLUME);
    expect(clampTimerVolume(1.7)).toBe(1);
    expect(clampTimerVolume(Number.NaN)).toBe(DEFAULT_TIMER_VOLUME);
  });

  it('uszkodzony wpis w localStorage nie wysypuje odczytu', () => {
    localStorage.setItem('fittracker_timer_volume_v1', 'nie-liczba');
    expect(loadTimerVolume()).toBe(DEFAULT_TIMER_VOLUME);
  });
});
