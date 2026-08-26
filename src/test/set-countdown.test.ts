import { describe, expect, it } from 'vitest';
import {
  countdownElapsed,
  countdownRemaining,
  createSetCountdown,
  defaultSetDurationForLevel,
  formatCountdown,
  isCountdownFinished,
  resolveSetCountdownTarget,
} from '@/lib/set-countdown';

// WP-C (X37): odliczanie serii na czas. Logika czysta: cel wg poziomu, deadline,
// reszta liczona z deadline (nie z tikow), format mm:ss.

describe('set-countdown: domyslny cel wg poziomu', () => {
  it('poczatkujacy 30 s, sredni 45 s, zaawansowany 60 s', () => {
    expect(defaultSetDurationForLevel('beginner')).toBe(30);
    expect(defaultSetDurationForLevel('intermediate')).toBe(45);
    expect(defaultSetDurationForLevel('advanced')).toBe(60);
  });

  it('poziom nieznany / brak profilu = 45 s', () => {
    expect(defaultSetDurationForLevel(undefined)).toBe(45);
    expect(defaultSetDurationForLevel(null)).toBe(45);
    expect(defaultSetDurationForLevel('')).toBe(45);
    expect(defaultSetDurationForLevel('elite')).toBe(45);
  });
});

describe('set-countdown: cel odliczania (kaskada)', () => {
  it('wartosc w polu ma pierwszenstwo', () => {
    expect(resolveSetCountdownTarget({ valueSec: 75, weeklyTargetSec: 65, previousSec: 40, planSec: 30, level: 'beginner' })).toBe(75);
  });

  it('puste pole: cel tygodnia silnika progresji', () => {
    expect(resolveSetCountdownTarget({ valueSec: 0, weeklyTargetSec: 65, previousSec: 40, planSec: 30, level: 'beginner' })).toBe(65);
  });

  it('bez celu tygodnia: ostatni wynik', () => {
    expect(resolveSetCountdownTarget({ valueSec: undefined, weeklyTargetSec: null, previousSec: 40, planSec: 30, level: 'beginner' })).toBe(40);
  });

  it('bez historii: sekundy z planu ("3 x 45s")', () => {
    expect(resolveSetCountdownTarget({ previousSec: 0, planSec: 45, level: 'beginner' })).toBe(45);
  });

  it('bez historii i bez planu: cel wg poziomu', () => {
    expect(resolveSetCountdownTarget({ level: 'advanced' })).toBe(60);
    expect(resolveSetCountdownTarget({})).toBe(45);
  });
});

describe('set-countdown: deadline i reszta', () => {
  const now = 1_700_000_000_000;

  it('start = deadline now + cel, totalSeconds = cel', () => {
    expect(createSetCountdown(30, now)).toEqual({ deadlineAt: now + 30_000, totalSeconds: 30 });
  });

  it('reszta liczona z deadline, zaokraglona w gore, nigdy ujemna', () => {
    const run = createSetCountdown(30, now);
    expect(countdownRemaining(run, now)).toBe(30);
    expect(countdownRemaining(run, now + 10_100)).toBe(20);
    expect(countdownRemaining(run, now + 29_900)).toBe(1);
    expect(countdownRemaining(run, now + 30_000)).toBe(0);
    // Po powrocie z tla (JS wstrzymany 5 min): reszta 0, nie ujemna.
    expect(countdownRemaining(run, now + 300_000)).toBe(0);
  });

  it('uplyniety czas (stop w trakcie) = od startu do teraz, w granicach 0..cel', () => {
    const run = createSetCountdown(30, now);
    expect(countdownElapsed(run, now)).toBe(0);
    expect(countdownElapsed(run, now + 12_400)).toBe(12);
    expect(countdownElapsed(run, now + 12_600)).toBe(13);
    expect(countdownElapsed(run, now + 45_000)).toBe(30);
  });

  it('koniec dopiero na deadline', () => {
    const run = createSetCountdown(30, now);
    expect(isCountdownFinished(run, now + 29_999)).toBe(false);
    expect(isCountdownFinished(run, now + 30_000)).toBe(true);
  });
});

describe('set-countdown: format mm:ss', () => {
  it('formatuje sekundy jako m:ss', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(5)).toBe('0:05');
    expect(formatCountdown(30)).toBe('0:30');
    expect(formatCountdown(90)).toBe('1:30');
    expect(formatCountdown(600)).toBe('10:00');
  });
});
