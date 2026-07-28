import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { readWorkoutTimersSetting, setWorkoutTimersEnabled } from '@/lib/workout-timers-setting';

// Z157: precedencja flagi timerów = e2eOverride ?? ustawienie usera ?? default ON.
// EMOM/AMRAP + rozgrzewka za OSOBNĄ flagą buildową intervalTimers (default OFF —
// mają tylko setInterval, przy zgaszonym ekranie milkną).

describe('workout-timers-setting (Z157)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('brak wpisu → null (obowiązuje default)', () => {
    expect(readWorkoutTimersSetting()).toBeNull();
  });

  it('set false → false, set true → true', () => {
    setWorkoutTimersEnabled(false);
    expect(readWorkoutTimersSetting()).toBe(false);
    setWorkoutTimersEnabled(true);
    expect(readWorkoutTimersSetting()).toBe(true);
  });
});

describe('FEATURE_FLAGS.workoutTimers precedencja (Z157)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('brak override i ustawienia → default WŁĄCZONY', () => {
    expect(FEATURE_FLAGS.workoutTimers).toBe(true);
  });

  it('ustawienie usera false → false', () => {
    setWorkoutTimersEnabled(false);
    expect(FEATURE_FLAGS.workoutTimers).toBe(false);
  });

  it('e2e override wygrywa z ustawieniem usera', () => {
    vi.stubEnv('VITE_E2E_MODE', 'true');
    setWorkoutTimersEnabled(false);
    localStorage.setItem('fittracker_e2e_flag_workoutTimers', 'true');
    expect(FEATURE_FLAGS.workoutTimers).toBe(true);
  });

  it('poza trybem e2e flaga e2e w localStorage jest ignorowana', () => {
    setWorkoutTimersEnabled(false);
    localStorage.setItem('fittracker_e2e_flag_workoutTimers', 'true');
    expect(FEATURE_FLAGS.workoutTimers).toBe(false);
  });
});

describe('FEATURE_FLAGS.intervalTimers (Z157)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('default OFF (dług Z10: setInterval milknie przy zgaszonym ekranie)', () => {
    expect(FEATURE_FLAGS.intervalTimers).toBe(false);
  });

  it('ustawienie usera timera przerwy NIE włącza interwałów', () => {
    setWorkoutTimersEnabled(true);
    expect(FEATURE_FLAGS.intervalTimers).toBe(false);
  });

  it('e2e override włącza interwały w trybie e2e', () => {
    vi.stubEnv('VITE_E2E_MODE', 'true');
    localStorage.setItem('fittracker_e2e_flag_intervalTimers', 'true');
    expect(FEATURE_FLAGS.intervalTimers).toBe(true);
  });
});
