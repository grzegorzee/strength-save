import type { WorkoutSession } from '@/types';

// Agregaty tygodniowe w stylu arkusza MASZYNA: objętość, średnie RPE/ból i liczba ćwiczeń
// spełniających regułę progresji ("OK"). Liczone z metryk autoregulacji zapisanych per ćwiczenie.
// Tydzień = poniedziałek (ISO). Zwraca tylko tygodnie z ukończonymi treningami, rosnąco po dacie.

export interface WeeklyMetric {
  /** Poniedziałek tygodnia (YYYY-MM-DD). */
  weekStart: string;
  workouts: number;
  totalVolume: number;
  /** Średnie RPE po ćwiczeniach które miały wpisane RPE (null gdy brak). */
  avgRpe: number | null;
  /** Średni ból po ćwiczeniach z wpisanym bólem (null gdy brak). */
  avgPain: number | null;
  /** Liczba ćwiczeń spełniających regułę "OK" (RPE<=8.5 + ból<=2 + jakość>=3). */
  okCount: number;
  /** Czy w tym tygodniu zapisano jakiekolwiek RPE. */
  hasRpe: boolean;
}

// Poniedziałek tygodnia dla daty 'YYYY-MM-DD' (lokalnie, bez stref).
const mondayOf = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const dow = date.getDay();                 // 0=niedz, 1=pon, ...
  const back = dow === 0 ? 6 : dow - 1;
  date.setDate(date.getDate() - back);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
};

export const getWeeklyMetrics = (workouts: WorkoutSession[]): WeeklyMetric[] => {
  const byWeek = new Map<string, {
    workouts: Set<string>;
    totalVolume: number;
    rpeSum: number; rpeN: number;
    painSum: number; painN: number;
    okCount: number;
  }>();

  workouts.filter(w => w.completed).forEach(w => {
    const key = mondayOf(w.date);
    const bucket = byWeek.get(key) ?? { workouts: new Set(), totalVolume: 0, rpeSum: 0, rpeN: 0, painSum: 0, painN: 0, okCount: 0 };
    bucket.workouts.add(w.id);

    w.exercises.forEach(ex => {
      const working = ex.sets.filter(s => s.completed && !s.isWarmup && s.weight > 0);
      bucket.totalVolume += working.reduce((sum, s) => sum + s.weight * s.reps, 0);

      if (ex.rpe !== undefined) {
        bucket.rpeSum += ex.rpe;
        bucket.rpeN += 1;
        const pain = ex.pain ?? 0;
        const quality = ex.quality ?? 5;
        if (ex.rpe <= 8.5 && pain <= 2 && quality >= 3) bucket.okCount += 1;
      }
      if (ex.pain !== undefined) {
        bucket.painSum += ex.pain;
        bucket.painN += 1;
      }
    });

    byWeek.set(key, bucket);
  });

  return Array.from(byWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, b]) => ({
      weekStart,
      workouts: b.workouts.size,
      totalVolume: Math.round(b.totalVolume),
      avgRpe: b.rpeN > 0 ? Math.round((b.rpeSum / b.rpeN) * 10) / 10 : null,
      avgPain: b.painN > 0 ? Math.round((b.painSum / b.painN) * 10) / 10 : null,
      okCount: b.okCount,
      hasRpe: b.rpeN > 0,
    }));
};
