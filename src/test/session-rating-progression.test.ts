import { describe, expect, it } from 'vitest';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import { decideNextSet, lastSessionRatedTooHeavy } from '@/lib/progression-engine';
import type { WorkoutSession } from '@/types';

// Runna pakiet 1, krok 4 (spec A2): ocena sesji zasila silnik progresji.
// Kontrakt "za zgodą": "za ciężko" obniża wyłącznie PROPOZYCJĘ na następny raz
// (bez podbicia), kciuk góra = normalna progresja, brak oceny = zachowanie
// identyczne jak dziś (niezmiennik). Nic nie nadpisuje planu automatycznie.

const session = (overrides: Partial<WorkoutSession>): WorkoutSession => ({
  id: 'w1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-05',
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] }],
  ...overrides,
});

const TODAY_ISO = '2026-08-18'; // 13 dni po bazowej sesji — jeszcze bez comeback deloadu.

describe('sekwencja: sesja → ocena → następna propozycja (spec A2)', () => {
  it('ocena "za ciężko" gasi podbicie: hold przy tym samym ciężarze', () => {
    const workouts = [session({ sessionRating: 'down', sessionRatingReasons: ['too_heavy'] })];
    const advice = getNextSetAdvice(workouts, 'ex-1', '3 x 6-8', 0, { todayISO: TODAY_ISO });
    expect(advice?.kind).toBe('hold');
    expect(advice?.targetWeight).toBe(100);
  });

  it('brak oceny = normalna progresja, identycznie jak dziś (niezmiennik)', () => {
    const advice = getNextSetAdvice([session({})], 'ex-1', '3 x 6-8', 0, { todayISO: TODAY_ISO });
    expect(advice?.kind).toBe('progress');
    expect(advice?.targetWeight).toBe(102.5);
  });

  it('kciuk w górę = normalna progresja', () => {
    const advice = getNextSetAdvice([session({ sessionRating: 'up' })], 'ex-1', '3 x 6-8', 0, { todayISO: TODAY_ISO });
    expect(advice?.kind).toBe('progress');
    expect(advice?.targetWeight).toBe(102.5);
  });

  it('kciuk w dół BEZ powodu "za ciężko" nie zmienia progresji', () => {
    const workouts = [session({ sessionRating: 'down', sessionRatingReasons: ['weak_day'] })];
    const advice = getNextSetAdvice(workouts, 'ex-1', '3 x 6-8', 0, { todayISO: TODAY_ISO });
    expect(advice?.kind).toBe('progress');
  });

  it('liczy się NAJŚWIEŻSZA sesja z ćwiczeniem: nowsza bez oceny wygrywa ze starszą "za ciężko"', () => {
    const workouts = [
      session({ id: 'w-old', date: '2026-07-29', sessionRating: 'down', sessionRatingReasons: ['too_heavy'] }),
      session({ id: 'w-new', date: '2026-08-05' }),
    ];
    const advice = getNextSetAdvice(workouts, 'ex-1', '3 x 6-8', 0, { todayISO: TODAY_ISO });
    expect(advice?.kind).toBe('progress');
  });
});

describe('lastSessionRatedTooHeavy', () => {
  it('true tylko dla down + too_heavy w najświeższej ukończonej sesji z ćwiczeniem', () => {
    expect(lastSessionRatedTooHeavy(
      [session({ sessionRating: 'down', sessionRatingReasons: ['too_heavy', 'too_long'] })],
      'ex-1',
    )).toBe(true);
    expect(lastSessionRatedTooHeavy([session({ sessionRating: 'up' })], 'ex-1')).toBe(false);
    expect(lastSessionRatedTooHeavy([session({ completed: false, sessionRating: 'down', sessionRatingReasons: ['too_heavy'] })], 'ex-1')).toBe(false);
    expect(lastSessionRatedTooHeavy([session({})], 'ex-2')).toBe(false);
  });
});

describe('decideNextSet z flagą lastRatedTooHeavy', () => {
  const repRange = { min: 6, max: 8, isMax: false };

  it('gasi podbicie ciężaru (progress → hold przy lastWeight)', () => {
    const decision = decideNextSet({
      lastWeight: 100, lastReps: 8, repRange, isBodyweight: false, increment: 2.5,
      isPlateau: false, lastRatedTooHeavy: true,
    });
    expect(decision.kind).toBe('hold');
    expect(decision.targetWeight).toBe(100);
    expect(decision.reasonKey).toBe('hold.rated');
  });

  it('gasi podbicie powtórzeń przy bodyweight', () => {
    const decision = decideNextSet({
      lastWeight: 0, lastReps: 8, repRange, isBodyweight: true, increment: 2.5,
      isPlateau: false, lastRatedTooHeavy: true,
    });
    expect(decision.kind).toBe('hold');
    expect(decision.targetReps).toBe(8);
    expect(decision.reasonKey).toBe('hold.rated');
  });

  it('deload przy plateau ma priorytet nad oceną', () => {
    const decision = decideNextSet({
      lastWeight: 100, lastReps: 8, repRange, isBodyweight: false, increment: 2.5,
      isPlateau: true, lastRatedTooHeavy: true,
    });
    expect(decision.kind).toBe('deload');
  });

  it('nie rusza gałęzi hold (w zakresie) — flaga działa tylko na podbicie', () => {
    const decision = decideNextSet({
      lastWeight: 100, lastReps: 7, repRange, isBodyweight: false, increment: 2.5,
      isPlateau: false, lastRatedTooHeavy: true,
    });
    expect(decision.kind).toBe('hold');
    expect(decision.reasonKey).toBe('hold.inrange');
  });
});
