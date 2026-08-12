import { describe, expect, it } from 'vitest';
import { bestPreviousWeight, detectLiveWeightPR } from '@/lib/live-pr';
import type { SetData, WorkoutSession } from '@/types';

// Runna pakiet 1, krok 5 (spec A4): PR w TRAKCIE sesji — toast + badge przy
// odhaczeniu serii cięższej niż wszystko w historii. Jak w detectNewPRs:
// pierwszy trening ćwiczenia (brak historii) nie jest rekordem.

const set = (weight: number, completed = true, isWarmup = false): SetData => ({
  reps: 5,
  weight,
  completed,
  ...(isWarmup && { isWarmup: true }),
});

const history: WorkoutSession[] = [{
  id: 'w-old',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-05',
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [set(100), set(95)] }],
}];

describe('bestPreviousWeight', () => {
  it('max ciężar z ukończonych serii historii ćwiczenia', () => {
    expect(bestPreviousWeight(history, 'ex-1')).toBe(100);
  });
  it('brak historii = 0', () => {
    expect(bestPreviousWeight(history, 'ex-2')).toBe(0);
  });
});

describe('detectLiveWeightPR', () => {
  it('świeżo odhaczona seria cięższa niż historia = PR', () => {
    const result = detectLiveWeightPR({
      previousSets: [set(102.5, false)],
      nextSets: [set(102.5, true)],
      bestBefore: 100,
    });
    expect(result).toBe(102.5);
  });

  it('bez historii (bestBefore=0) nigdy nie ma PR (pierwszy raz to baseline)', () => {
    expect(detectLiveWeightPR({ previousSets: [set(102.5, false)], nextSets: [set(102.5, true)], bestBefore: 0 })).toBeNull();
  });

  it('seria już wcześniej odhaczona nie triggeruje ponownie', () => {
    expect(detectLiveWeightPR({ previousSets: [set(102.5, true)], nextSets: [set(102.5, true)], bestBefore: 100 })).toBeNull();
  });

  it('rozgrzewka i ciężar równy rekordowi nie liczą się', () => {
    expect(detectLiveWeightPR({ previousSets: [set(105, false, true)], nextSets: [set(105, true, true)], bestBefore: 100 })).toBeNull();
    expect(detectLiveWeightPR({ previousSets: [set(100, false)], nextSets: [set(100, true)], bestBefore: 100 })).toBeNull();
  });
});
