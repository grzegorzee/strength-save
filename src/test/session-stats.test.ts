// Z131: nagłówek aktywnej sesji pokazuje Czas / Objętość / Serie w jednym rzędzie.
// Liczba serii to NOWA metryka — dotąd nigdzie nie liczona zbiorczo dla sesji.
import { describe, it, expect } from 'vitest';
import { sessionStats } from '@/lib/workout-day-view';
import type { SetData } from '@/types';

const set = (over: Partial<SetData> = {}): SetData => ({ reps: 0, weight: 0, completed: false, ...over });

describe('sessionStats', () => {
  it('liczy tonaż i serie tylko z ukończonych serii roboczych', () => {
    const stats = sessionStats({
      a: [set({ isWarmup: true, weight: 20, reps: 10, completed: true }), set({ weight: 60, reps: 8, completed: true })],
      b: [set({ weight: 50, reps: 10, completed: true }), set({ weight: 50, reps: 10 })],
    });
    expect(stats.volumeKg).toBe(60 * 8 + 50 * 10);
    expect(stats.completedSets).toBe(2);
  });

  it('rozgrzewka nie wchodzi ani do tonażu, ani do licznika serii', () => {
    const stats = sessionStats({
      a: [set({ isWarmup: true, weight: 40, reps: 5, completed: true })],
    });
    expect(stats.volumeKg).toBe(0);
    expect(stats.completedSets).toBe(0);
  });

  it('serie bez ciężaru (masa własna) liczą się do serii, ale nie do tonażu', () => {
    const stats = sessionStats({ a: [set({ reps: 12, weight: 0, completed: true })] });
    expect(stats.volumeKg).toBe(0);
    expect(stats.completedSets).toBe(1);
  });

  it('pusta sesja daje zera, nie NaN', () => {
    expect(sessionStats({})).toEqual({ volumeKg: 0, completedSets: 0 });
  });
});
