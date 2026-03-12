import type { StravaActivity } from '@/types/strava';

export interface DailyLoad {
  date: string;
  trimp: number;
}

export interface FitnessFatiguePoint {
  date: string;
  ctl: number;  // Fitness (42-day EWMA)
  atl: number;  // Fatigue (7-day EWMA)
  tsb: number;  // Form (CTL - ATL)
}

/**
 * TRIMP (Banister): duration_min × HRr × 0.64 × e^(1.92 × HRr)
 * where HRr = (avgHR - restHR) / (maxHR - restHR)
 */
export const calculateTRIMP = (
  avgHR: number,
  durationSeconds: number,
  restHR: number,
  maxHR: number,
): number => {
  if (!avgHR || avgHR <= restHR || maxHR <= restHR || durationSeconds <= 0) return 0;

  const hrr = (avgHR - restHR) / (maxHR - restHR);
  const durationMin = durationSeconds / 60;
  return Math.round(durationMin * hrr * 0.64 * Math.exp(1.92 * hrr));
};

/**
 * Compute daily TRIMP sum from activities
 */
export const computeDailyLoad = (
  activities: StravaActivity[],
  restHR: number = 60,
  maxHR: number = 190,
): DailyLoad[] => {
  const dailyMap = new Map<string, number>();

  activities
    .filter(a => a.averageHeartrate && a.averageHeartrate > 0 && a.movingTime && a.movingTime > 0)
    .forEach(a => {
      const trimp = calculateTRIMP(a.averageHeartrate!, a.movingTime!, restHR, maxHR);
      dailyMap.set(a.date, (dailyMap.get(a.date) || 0) + trimp);
    });

  return Array.from(dailyMap.entries())
    .map(([date, trimp]) => ({ date, trimp }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Compute CTL (42-day), ATL (7-day), TSB from daily loads
 */
export const computeFitnessFatigue = (
  dailyLoad: DailyLoad[],
  days: number = 90,
): FitnessFatiguePoint[] => {
  if (dailyLoad.length === 0) return [];

  // Build a continuous date range
  const sorted = [...dailyLoad].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);

  // Extend to `days` before last date if possible
  const startDate = new Date(lastDate);
  startDate.setDate(startDate.getDate() - days + 1);
  if (startDate > firstDate) {
    // Use actual first date
  }
  const effectiveStart = startDate < firstDate ? startDate : firstDate;

  // Build daily TRIMP map
  const trimpMap = new Map<string, number>();
  sorted.forEach(d => trimpMap.set(d.date, d.trimp));

  // EWMA constants
  const ctlDecay = 2 / (42 + 1); // ~0.047
  const atlDecay = 2 / (7 + 1);  // ~0.25

  let ctl = 0;
  let atl = 0;
  const result: FitnessFatiguePoint[] = [];

  const current = new Date(effectiveStart);
  while (current <= lastDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayTrimp = trimpMap.get(dateStr) || 0;

    ctl = ctl + ctlDecay * (dayTrimp - ctl);
    atl = atl + atlDecay * (dayTrimp - atl);

    // Only output last `days` days
    const daysFromEnd = Math.round((lastDate.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
    if (daysFromEnd < days) {
      result.push({
        date: dateStr,
        ctl: Math.round(ctl * 10) / 10,
        atl: Math.round(atl * 10) / 10,
        tsb: Math.round((ctl - atl) * 10) / 10,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return result;
};
