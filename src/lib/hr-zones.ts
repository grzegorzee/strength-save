import { HRZone, HRZoneConfig, HR_ZONES, StravaActivity } from '@/types/strava';

export const ZONE_COLORS: Record<HRZone, string> = {
  1: 'bg-blue-400',
  2: 'bg-green-400',
  3: 'bg-yellow-400',
  4: 'bg-orange-400',
  5: 'bg-red-500',
};

export const ZONE_TEXT_COLORS: Record<HRZone, string> = {
  1: 'text-blue-400',
  2: 'text-green-400',
  3: 'text-yellow-400',
  4: 'text-orange-400',
  5: 'text-red-500',
};

export function getHRPercent(heartrate: number, maxHR: number): number {
  return Math.round((heartrate / maxHR) * 100);
}

export function getHRZone(heartrate: number, maxHR: number): HRZone {
  const percent = (heartrate / maxHR) * 100;
  if (percent < 60) return 1;
  if (percent < 70) return 2;
  if (percent < 80) return 3;
  if (percent < 90) return 4;
  return 5;
}

export function getHRZoneConfig(zone: HRZone): HRZoneConfig {
  return HR_ZONES[zone - 1];
}

export function deriveMaxHR(activities: StravaActivity[]): number | null {
  let max = 0;
  for (const a of activities) {
    if (a.maxHeartrate && a.maxHeartrate > max) {
      max = a.maxHeartrate;
    }
  }
  return max > 0 ? max : null;
}

export function calculateZoneDistribution(
  activities: StravaActivity[],
  maxHR: number
): Record<HRZone, number> {
  const dist: Record<HRZone, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const a of activities) {
    if (a.averageHeartrate) {
      const zone = getHRZone(a.averageHeartrate, maxHR);
      dist[zone]++;
    }
  }
  return dist;
}
