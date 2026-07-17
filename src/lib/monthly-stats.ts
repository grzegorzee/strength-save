import type { WorkoutSession } from '@/types';
import { calculateTonnage } from '@/lib/summary-utils';

// Z92: przegląd miesięcy w Analityce — liczba ukończonych treningów, łączny czas
// i tonaż per miesiąc. Agregacja z już załadowanych workouts, zero nowych odczytów.

export interface MonthlyStat {
  monthKey: string;            // 'YYYY-MM' (z pola date, czas lokalny)
  workoutCount: number;        // ukończone treningi
  workoutsWithDuration: number;
  totalDurationSec: number;    // suma tylko ze zmierzonych
  totalTonnageKg: number;
}

// Czas trwania treningu: durationSec, fallback ze znaczników (M32).
// Null = brak danych (treningi sprzed M32): jawnie raportowane, nie zaniżają sumy.
export const workoutDurationSec = (workout: WorkoutSession): number | null => {
  if (typeof workout.durationSec === 'number' && workout.durationSec > 0) {
    return Math.round(workout.durationSec);
  }
  if (
    typeof workout.startedAt === 'number'
    && typeof workout.completedAt === 'number'
    && workout.completedAt > workout.startedAt
  ) {
    return Math.round((workout.completedAt - workout.startedAt) / 1000);
  }
  return null;
};

const monthKeyOf = (date: string): string => date.slice(0, 7);

const monthKeyFloor = (now: Date, monthsBack: number): string => {
  const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}`;
};

export const aggregateMonthlyStats = (
  workouts: WorkoutSession[],
  monthsBack: number,
  now: Date,
): MonthlyStat[] => {
  const floor = monthKeyFloor(now, monthsBack);
  const byMonth = new Map<string, MonthlyStat>();
  for (const workout of workouts) {
    if (!workout.completed) continue;
    if (typeof workout.date !== 'string' || workout.date.length < 7) continue;
    const monthKey = monthKeyOf(workout.date);
    if (monthKey < floor) continue;
    const entry = byMonth.get(monthKey) ?? {
      monthKey, workoutCount: 0, workoutsWithDuration: 0, totalDurationSec: 0, totalTonnageKg: 0,
    };
    entry.workoutCount += 1;
    const duration = workoutDurationSec(workout);
    if (duration !== null) {
      entry.workoutsWithDuration += 1;
      entry.totalDurationSec += duration;
    }
    entry.totalTonnageKg += calculateTonnage([workout]);
    byMonth.set(monthKey, entry);
  }
  return [...byMonth.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
};

export const formatDurationHM = (totalSec: number): string => {
  const safe = Math.max(0, Math.round(totalSec));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
};
