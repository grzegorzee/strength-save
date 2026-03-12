import type { WorkoutSession } from '@/types';
import type { StravaActivity } from '@/types/strava';

export interface HeatmapDay {
  date: string;
  strengthTonnage: number;
  cardioKm: number;
  hasWorkout: boolean;
  hasCardio: boolean;
  level: 0 | 1 | 2 | 3 | 4;
}

export const generateHeatmapData = (
  workouts: WorkoutSession[],
  stravaActivities: StravaActivity[],
  year: number,
): HeatmapDay[] => {
  // Build date → tonnage map from workouts
  const tonnageMap = new Map<string, number>();
  workouts.filter(w => w.completed).forEach(w => {
    const tonnage = w.exercises.reduce((sum, ex) =>
      sum + ex.sets.filter(s => s.completed && !s.isWarmup).reduce((s, set) => s + set.reps * set.weight, 0),
    0);
    tonnageMap.set(w.date, (tonnageMap.get(w.date) || 0) + tonnage);
  });

  // Build date → km map from strava
  const cardioMap = new Map<string, number>();
  stravaActivities
    .filter(a => a.type !== 'WeightTraining' && a.type !== 'Crossfit')
    .forEach(a => {
      const km = (a.distance || 0) / 1000;
      cardioMap.set(a.date, (cardioMap.get(a.date) || 0) + km);
    });

  // Calculate avg tonnage for intensity level 4
  const tonnageValues = Array.from(tonnageMap.values()).filter(v => v > 0);
  const avgTonnage = tonnageValues.length > 0
    ? tonnageValues.reduce((a, b) => a + b, 0) / tonnageValues.length
    : 0;

  // Generate 365/366 days
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const totalDays = isLeap ? 366 : 365;
  const days: HeatmapDay[] = [];

  for (let d = 0; d < totalDays; d++) {
    const date = new Date(year, 0, 1 + d);
    const dateStr = date.toISOString().split('T')[0];
    const strengthTonnage = tonnageMap.get(dateStr) || 0;
    const cardioKm = Math.round((cardioMap.get(dateStr) || 0) * 10) / 10;
    const hasWorkout = strengthTonnage > 0;
    const hasCardio = cardioKm > 0;

    days.push({
      date: dateStr,
      strengthTonnage,
      cardioKm,
      hasWorkout,
      hasCardio,
      level: getIntensityLevel({ date: dateStr, strengthTonnage, cardioKm, hasWorkout, hasCardio, level: 0 }, avgTonnage),
    });
  }

  return days;
};

export const getIntensityLevel = (
  day: Omit<HeatmapDay, 'level'>,
  avgTonnage: number = 0,
): 0 | 1 | 2 | 3 | 4 => {
  if (!day.hasWorkout && !day.hasCardio) return 0;
  if (!day.hasWorkout && day.hasCardio) return 1;
  if (day.hasWorkout && day.hasCardio) {
    if (avgTonnage > 0 && day.strengthTonnage > avgTonnage * 1.5) return 4;
    return 3;
  }
  // has workout only
  if (avgTonnage > 0 && day.strengthTonnage > avgTonnage * 1.5) return 4;
  return 2;
};
