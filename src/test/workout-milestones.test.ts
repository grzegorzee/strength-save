import { beforeEach, describe, expect, it } from 'vitest';
import {
  MILESTONE_CELEBRATED_STORAGE_KEY,
  hasCelebrated,
  markCelebrated,
  workoutMilestoneFor,
} from '@/lib/workout-milestones';

// WP-F (X37, RESEARCH sekcja 5): świętuj rzadko. Pierwszy trening i kamienie
// milowe dostają baner; każdy inny numer = zwykłe zakończenie bez banera.

describe('workoutMilestoneFor', () => {
  it('1 = pierwszy trening', () => {
    expect(workoutMilestoneFor(1)).toEqual({ kind: 'first', n: 1 });
  });

  it.each([10, 25, 50, 100, 150, 200, 300, 500])('%i = kamień milowy', (n) => {
    expect(workoutMilestoneFor(n)).toEqual({ kind: 'milestone', n });
  });

  it.each([0, 2, 3, 9, 11, 24, 26, 99, 101, 499, 501, 1000])('%i = brak celebracji', (n) => {
    expect(workoutMilestoneFor(n)).toBeNull();
  });

  it('wartości niecałkowite i ujemne = brak celebracji', () => {
    expect(workoutMilestoneFor(1.5)).toBeNull();
    expect(workoutMilestoneFor(-10)).toBeNull();
    expect(workoutMilestoneFor(Number.NaN)).toBeNull();
  });
});

describe('hasCelebrated / markCelebrated (klucz = ostatni świętowany n)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('bez wpisu nic nie było świętowane', () => {
    expect(hasCelebrated(1)).toBe(false);
    expect(hasCelebrated(10)).toBe(false);
  });

  it('po markCelebrated(1) pierwszy trening jest odhaczony, 10 jeszcze nie', () => {
    markCelebrated(1);
    expect(localStorage.getItem(MILESTONE_CELEBRATED_STORAGE_KEY)).toBe('1');
    expect(hasCelebrated(1)).toBe(true);
    expect(hasCelebrated(10)).toBe(false);
  });

  it('kolejny kamień nadpisuje poprzedni (jeden wpis, ostatni n)', () => {
    markCelebrated(1);
    markCelebrated(10);
    expect(localStorage.getItem(MILESTONE_CELEBRATED_STORAGE_KEY)).toBe('10');
    expect(hasCelebrated(10)).toBe(true);
  });

  it('śmieci w localStorage = nic nie świętowano (bez wyjątku)', () => {
    localStorage.setItem(MILESTONE_CELEBRATED_STORAGE_KEY, 'abc');
    expect(hasCelebrated(1)).toBe(false);
  });
});
