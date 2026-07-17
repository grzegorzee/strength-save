import { describe, expect, it } from 'vitest';
import { aggregateMonthlyStats, formatDurationHM, workoutDurationSec } from '@/lib/monthly-stats';
import type { WorkoutSession } from '@/types';

const w = (over: Partial<WorkoutSession>): WorkoutSession => ({
  id: 'w1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-07-10',
  completed: true,
  exercises: [],
  ...over,
});

describe('workoutDurationSec (Z92)', () => {
  it('bierze durationSec gdy jest', () => {
    expect(workoutDurationSec(w({ durationSec: 3600 }))).toBe(3600);
  });
  it('fallback z completedAt - startedAt', () => {
    expect(workoutDurationSec(w({ startedAt: 1_000_000, completedAt: 4_600_000 }))).toBe(3600);
  });
  it('null gdy brak danych czasu (treningi sprzed M32)', () => {
    expect(workoutDurationSec(w({}))).toBeNull();
  });
  it('null gdy znaczniki niespójne (completedAt <= startedAt)', () => {
    expect(workoutDurationSec(w({ startedAt: 5, completedAt: 5 }))).toBeNull();
  });
});

describe('aggregateMonthlyStats (Z92)', () => {
  const now = new Date('2026-07-17T12:00:00');
  it('grupuje po miesiącu z date (czas lokalny), tylko completed', () => {
    const stats = aggregateMonthlyStats([
      w({ id: 'a', date: '2026-07-01', durationSec: 3000 }),
      w({ id: 'b', date: '2026-07-31', durationSec: 600 }),
      w({ id: 'c', date: '2026-06-30', durationSec: 100 }),
      w({ id: 'd', date: '2026-07-15', completed: false, durationSec: 999 }),
    ], 12, now);
    const july = stats.find(s => s.monthKey === '2026-07')!;
    expect(july.workoutCount).toBe(2);
    expect(july.totalDurationSec).toBe(3600);
    expect(july.workoutsWithDuration).toBe(2);
    expect(stats.find(s => s.monthKey === '2026-06')!.workoutCount).toBe(1);
  });
  it('treningi bez czasu liczą się do workoutCount, nie do totalDurationSec', () => {
    const stats = aggregateMonthlyStats([
      w({ id: 'a', date: '2026-07-01', durationSec: 3600 }),
      w({ id: 'b', date: '2026-07-02' }),
    ], 12, now);
    const july = stats.find(s => s.monthKey === '2026-07')!;
    expect(july.workoutCount).toBe(2);
    expect(july.workoutsWithDuration).toBe(1);
    expect(july.totalDurationSec).toBe(3600);
  });
  it('okno monthsBack: przełom roku, poza oknem odpada, sortowanie od najnowszego', () => {
    const stats = aggregateMonthlyStats([
      w({ id: 'a', date: '2026-01-05' }),
      w({ id: 'b', date: '2025-12-28' }),
      w({ id: 'c', date: '2025-06-01' }),
    ], 8, now);
    expect(stats.map(s => s.monthKey)).toEqual(['2026-01', '2025-12']);
  });
  it('miesiące bez treningów nie są zwracane', () => {
    const stats = aggregateMonthlyStats([w({ date: '2026-05-05' })], 12, now);
    expect(stats.map(s => s.monthKey)).toEqual(['2026-05']);
  });
  it('tonaż liczony istniejącym helperem: ukończone serie bez rozgrzewkowych', () => {
    const stats = aggregateMonthlyStats([
      w({
        id: 'a',
        date: '2026-07-01',
        exercises: [{
          exerciseId: 'ex-1',
          sets: [
            { reps: 5, weight: 100, completed: true },
            { reps: 5, weight: 100, completed: true, isWarmup: true },
            { reps: 5, weight: 100, completed: false },
          ],
        }],
      }),
      w({
        id: 'b',
        date: '2026-07-03',
        exercises: [{
          exerciseId: 'ex-1',
          sets: [{ reps: 10, weight: 50, completed: true }],
        }],
      }),
    ], 12, now);
    expect(stats.find(s => s.monthKey === '2026-07')!.totalTonnageKg).toBe(1000);
  });
});

describe('formatDurationHM (Z92)', () => {
  it('formatuje godziny i minuty', () => {
    expect(formatDurationHM(4980)).toBe('1 h 23 min');
  });
  it('poniżej godziny tylko minuty', () => {
    expect(formatDurationHM(2940)).toBe('49 min');
  });
  it('zero i wartości ujemne dają 0 min', () => {
    expect(formatDurationHM(0)).toBe('0 min');
    expect(formatDurationHM(-30)).toBe('0 min');
  });
});
