import { describe, expect, it } from 'vitest';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import type { WorkoutSession } from '@/types';

// Buduje trening z jedną serią roboczą danego ćwiczenia (weight × reps).
const wk = (id: string, date: string, weight: number, reps: number): WorkoutSession => ({
  id, userId: 'u1', dayId: 'd1', date, completed: true,
  exercises: [{ exerciseId: 'bench', sets: [{ reps, weight, completed: true }] }],
});

describe('getNextSetAdvice', () => {
  it('brak historii → null (zostaje plan)', () => {
    expect(getNextSetAdvice([], 'bench', '3 x 6-8', 0)).toBeNull();
  });

  it('zakres "do upadku" (max) → null', () => {
    const ws = [wk('w1', '2026-05-01', 60, 12)];
    expect(getNextSetAdvice(ws, 'bench', '3 x max', 0)).toBeNull();
  });

  it('dowiózł górę zakresu → progress: +2.5 kg (compound), reset reps do dołu', () => {
    const ws = [wk('w1', '2026-05-01', 80, 8)]; // 8 = górna granica 6-8
    const advice = getNextSetAdvice(ws, 'bench', '3 x 6-8', 0)!;
    expect(advice.kind).toBe('progress');
    expect(advice.targetWeight).toBe(82.5);
    expect(advice.targetReps).toBe(6);
  });

  it('izolacja (index >= 3) dostaje +1 kg', () => {
    const ws = [wk('w1', '2026-05-01', 20, 12)];
    const advice = getNextSetAdvice(ws, 'bench', '3 x 10-12', 4)!;
    expect(advice.kind).toBe('progress');
    expect(advice.targetWeight).toBe(21);
  });

  it('w zakresie → hold, ten sam ciężar, dorzuć powtórzenia', () => {
    const ws = [wk('w1', '2026-05-01', 80, 7)]; // 7 mieści się w 6-8
    const advice = getNextSetAdvice(ws, 'bench', '3 x 6-8', 0)!;
    expect(advice.kind).toBe('hold');
    expect(advice.targetWeight).toBe(80);
    expect(advice.targetReps).toBe(8);
  });

  it('poniżej zakresu → hold, dobij do dołu zakresu', () => {
    const ws = [wk('w1', '2026-05-01', 80, 4)];
    const advice = getNextSetAdvice(ws, 'bench', '3 x 6-8', 0)!;
    expect(advice.kind).toBe('hold');
    expect(advice.targetWeight).toBe(80);
    expect(advice.targetReps).toBe(6);
  });

  it('zastój przez kilka sesji → deload (-10%)', () => {
    // 5 sesji z tym samym maxem 100 kg → plateau.
    const ws = [
      wk('w1', '2026-05-01', 100, 8),
      wk('w2', '2026-05-04', 100, 8),
      wk('w3', '2026-05-07', 100, 8),
      wk('w4', '2026-05-10', 100, 8),
      wk('w5', '2026-05-13', 100, 8),
    ];
    const advice = getNextSetAdvice(ws, 'bench', '3 x 6-8', 0)!;
    expect(advice.kind).toBe('deload');
    expect(advice.targetWeight).toBe(90);
  });

  it('serie czysto czasowe (weight=0, reps=0) nie crashują coacha (Z105)', () => {
    const ws = [
      {
        id: 'w1', userId: 'u1', dayId: 'day-1', date: '2026-07-01', completed: true,
        exercises: [{
          exerciseId: 'plank',
          sets: [{ reps: 0, weight: 0, completed: true, durationSec: 90 }],
        }],
      },
    ];
    expect(() => getNextSetAdvice(ws, 'plank', '3 x 60s', 0)).not.toThrow();
  });
});
