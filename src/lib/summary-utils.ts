import type { WorkoutSession } from '@/types';

export const getWeekBounds = (date: Date = new Date()): { start: Date; end: Date } => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const start = new Date(d);
  start.setDate(d.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const getMonthBounds = (date: Date = new Date()): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

export const calculateTonnage = (workouts: WorkoutSession[]): number => {
  return workouts.reduce((total, w) => {
    return total + w.exercises.reduce((exTotal, ex) => {
      return exTotal + ex.sets.reduce((setTotal, set) => {
        return setTotal + (set.completed && !set.isWarmup ? set.reps * set.weight : 0);
      }, 0);
    }, 0);
  }, 0);
};

export const calculateStreak = (workouts: WorkoutSession[]): number => {
  if (workouts.length === 0) return 0;

  const completedWorkouts = workouts.filter(w => w.completed);
  if (completedWorkouts.length === 0) return 0;

  // Group by week (week = ISO week starting Monday)
  const weekSet = new Set<string>();
  completedWorkouts.forEach(w => {
    const d = new Date(w.date);
    const { start } = getWeekBounds(d);
    weekSet.add(start.toISOString().split('T')[0]);
  });

  // Sort weeks descending
  const weeks = Array.from(weekSet).sort((a, b) => b.localeCompare(a));

  // Count consecutive weeks with at least 2 workouts
  let streak = 0;
  const now = new Date();
  const { start: currentWeekStart } = getWeekBounds(now);

  for (let i = 0; i < weeks.length; i++) {
    const weekStart = new Date(weeks[i]);
    const expectedWeekStart = new Date(currentWeekStart);
    expectedWeekStart.setDate(expectedWeekStart.getDate() - i * 7);
    const expectedStr = expectedWeekStart.toISOString().split('T')[0];

    if (weeks[i] !== expectedStr) break;

    // Count workouts in this week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekWorkouts = completedWorkouts.filter(w => {
      const d = new Date(w.date);
      return d >= weekStart && d <= weekEnd;
    });

    if (weekWorkouts.length >= 2) {
      streak++;
    } else {
      // Current week is allowed to have fewer (in progress)
      if (i === 0) {
        streak++;
      } else {
        break;
      }
    }
  }

  return streak;
};

export const calculateLongestStreak = (workouts: WorkoutSession[]): number => {
  const completedWorkouts = workouts.filter(w => w.completed);
  if (completedWorkouts.length === 0) return 0;

  // Build a set of week-start dates that have ≥2 completed workouts
  const weekCounts = new Map<string, number>();
  completedWorkouts.forEach(w => {
    const d = new Date(w.date);
    const { start } = getWeekBounds(d);
    const key = start.toISOString().split('T')[0];
    weekCounts.set(key, (weekCounts.get(key) || 0) + 1);
  });

  // Only keep weeks with ≥2 workouts
  const qualifyingWeeks = new Set<string>();
  weekCounts.forEach((count, key) => {
    if (count >= 2) qualifyingWeeks.add(key);
  });

  if (qualifyingWeeks.size === 0) return 0;

  // Sort weeks ascending
  const sortedWeeks = Array.from(qualifyingWeeks).sort();

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedWeeks.length; i++) {
    const prev = new Date(sortedWeeks[i - 1]);
    const curr = new Date(sortedWeeks[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (Math.abs(diffDays - 7) < 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
};

export const filterWorkoutsByPeriod = (
  workouts: WorkoutSession[],
  bounds: { start: Date; end: Date },
): WorkoutSession[] => {
  return workouts.filter(w => {
    const d = new Date(w.date);
    return d >= bounds.start && d <= bounds.end && w.completed;
  });
};
