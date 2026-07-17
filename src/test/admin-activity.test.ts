import { describe, expect, it } from 'vitest';
import { activityBadge, buildDailyActivitySeries, sortUsersByActivity } from '@/lib/admin-activity';

describe('sortUsersByActivity (Z98)', () => {
  it('sortuje po lastActiveAt desc, brak activitySummary na końcu (fallback lastLogin)', () => {
    const users = [
      { uid: 'a', lastLogin: '2026-07-01T10:00:00Z' },
      { uid: 'b', activitySummary: { lastActiveAt: '2026-07-16' } },
      { uid: 'c', activitySummary: { lastActiveAt: '2026-07-10' } },
    ];
    expect(sortUsersByActivity(users).map(u => u.uid)).toEqual(['b', 'c', 'a']);
  });
  it('fallback lastLogin porównywalny z lastActiveAt (prefix daty)', () => {
    const users = [
      { uid: 'x', lastLogin: '2026-07-15T08:00:00Z' },
      { uid: 'y', activitySummary: { lastActiveAt: '2026-07-14' } },
      { uid: 'z' },
    ];
    expect(sortUsersByActivity(users).map(u => u.uid)).toEqual(['x', 'y', 'z']);
  });
});

describe('activityBadge (Z98)', () => {
  const now = new Date('2026-07-17T12:00:00');
  it('active gdy aktywność <= 7 dni, idle <= 30, dormant powyżej', () => {
    expect(activityBadge('2026-07-16', now)).toBe('active');
    expect(activityBadge('2026-07-01', now)).toBe('idle');
    expect(activityBadge('2026-05-01', now)).toBe('dormant');
    expect(activityBadge(undefined, now)).toBe('dormant');
  });
});

describe('buildDailyActivitySeries (Z99)', () => {
  const now = new Date('2026-07-17T12:00:00');
  it('dziury w danych dostają zera, okno dni, kolejność chronologiczna', () => {
    const series = buildDailyActivitySeries([
      { userId: 'u1', date: '2026-07-16', counters: { session_active: 1, action_workout_completed: 1, screen_dashboard: 3 } },
      { userId: 'u1', date: '2026-07-14', counters: { session_active: 1, screen_plan: 2 } },
    ], 5, now);
    expect(series.map(s => s.date)).toEqual(['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17']);
    expect(series[1]).toEqual({ date: '2026-07-14', sessions: 1, workouts: 0, screens: 2 });
    expect(series[3]).toEqual({ date: '2026-07-16', sessions: 1, workouts: 1, screens: 3 });
    expect(series[0]).toEqual({ date: '2026-07-13', sessions: 0, workouts: 0, screens: 0 });
  });
});
