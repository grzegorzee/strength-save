import type { WorkoutSession } from '@/types';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

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

export interface StreakDetails {
  /** Liczba kolejnych zaliczonych tygodni (>=2 treningi). */
  streak: number;
  /** Początki tygodni (YYYY-MM-DD) uratowanych tarczą, od najnowszego. */
  frozenWeeks: string[];
}

// Tarcza serii (streak freeze): tydzień bez 2 treningów nie zeruje serii, jeśli
// poprzednia tarcza była użyta co najmniej FREEZE_SPACING_WEEKS tygodni wcześniej
// (max ~1/miesiąc). Zamrożony tydzień nie powiększa serii, tylko ją chroni.
// Bieżący (trwający) tydzień nigdy nie łamie serii i nie zużywa tarczy.
const FREEZE_SPACING_WEEKS = 4;

export const calculateStreakDetails = (workouts: WorkoutSession[]): StreakDetails => {
  const completedWorkouts = workouts.filter(w => w.completed);
  if (completedWorkouts.length === 0) return { streak: 0, frozenWeeks: [] };

  // Liczba ukończonych treningów per początek tygodnia (poniedziałek, czas lokalny).
  const weekCounts = new Map<string, number>();
  let earliestWeek = '';
  completedWorkouts.forEach(w => {
    const { start } = getWeekBounds(parseLocalDate(w.date));
    const key = formatLocalDate(start);
    weekCounts.set(key, (weekCounts.get(key) || 0) + 1);
    if (!earliestWeek || key < earliestWeek) earliestWeek = key;
  });

  const { start: currentWeekStart } = getWeekBounds(new Date());
  const weekStartAt = (weeksBack: number): string => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - weeksBack * 7);
    return formatLocalDate(d);
  };
  const weekQualifies = (key: string) => (weekCounts.get(key) || 0) >= 2;

  let streak = 0;
  const frozenWeeks: string[] = [];
  let lastFreezeIndex: number | null = null;

  for (let i = 0; ; i++) {
    const key = weekStartAt(i);
    if (key < earliestWeek) break;
    if (weekQualifies(key)) {
      streak += 1;
      continue;
    }
    // Bieżący tydzień w toku: ani nie łamie serii, ani nie zużywa tarczy.
    if (i === 0) continue;
    // Tarcza tylko gdy chroni realną kontynuację (starszy tydzień zaliczony)
    // i poprzednia była użyta >= FREEZE_SPACING_WEEKS tygodni temu.
    const freezeAvailable = lastFreezeIndex === null || i - lastFreezeIndex >= FREEZE_SPACING_WEEKS;
    if (freezeAvailable && weekQualifies(weekStartAt(i + 1))) {
      frozenWeeks.push(key);
      lastFreezeIndex = i;
      continue;
    }
    break;
  }

  return { streak, frozenWeeks };
};

export const calculateStreak = (workouts: WorkoutSession[]): number =>
  calculateStreakDetails(workouts).streak;

export const calculateLongestStreak = (workouts: WorkoutSession[]): number => {
  const completedWorkouts = workouts.filter(w => w.completed);
  if (completedWorkouts.length === 0) return 0;

  // Build a set of week-start dates that have ≥2 completed workouts
  const weekCounts = new Map<string, number>();
  completedWorkouts.forEach(w => {
    const d = parseLocalDate(w.date);
    const { start } = getWeekBounds(d);
    const key = formatLocalDate(start);
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
    const prev = parseLocalDate(sortedWeeks[i - 1]);
    const curr = parseLocalDate(sortedWeeks[i]);
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
    const d = parseLocalDate(w.date);
    return d >= bounds.start && d <= bounds.end && w.completed;
  });
};
