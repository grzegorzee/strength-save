export interface StravaActivity {
  id: string;
  userId: string;
  stravaId: number;
  name: string;
  type: string;         // "Run", "Ride", "Swim", "Walk", "Hike"
  date: string;         // YYYY-MM-DD
  distance?: number;    // meters
  movingTime?: number;  // seconds
  elapsedTime?: number; // seconds
  averageHeartrate?: number;
  maxHeartrate?: number;
  totalElevationGain?: number; // meters
  averageSpeed?: number; // m/s
  calories?: number;
  description?: string;
  sportType?: string;        // more specific than type (e.g. "TrailRun")
  averageCadence?: number;
  startDateLocal?: string;   // full ISO datetime in local timezone
  trainer?: boolean;         // indoor vs outdoor
  kudosCount?: number;
  stravaUrl: string;
  syncedAt: string;     // ISO timestamp
}

export interface StravaConnection {
  connected: boolean;
  athleteId?: number;
  athleteName?: string;
  lastSync?: string;
  estimatedMaxHR?: number;
  maxHRManualOverride?: boolean;
}

export type HRZone = 1 | 2 | 3 | 4 | 5;

export interface HRZoneConfig {
  zone: HRZone;
  name: string;
  minPercent: number;
  maxPercent: number;
  color: string; // Tailwind class
}

export const HR_ZONES: HRZoneConfig[] = [
  { zone: 1, name: 'Regeneracja', minPercent: 50, maxPercent: 60, color: 'bg-blue-400' },
  { zone: 2, name: 'Aerobowa', minPercent: 60, maxPercent: 70, color: 'bg-green-400' },
  { zone: 3, name: 'Tempo', minPercent: 70, maxPercent: 80, color: 'bg-yellow-400' },
  { zone: 4, name: 'Próg', minPercent: 80, maxPercent: 90, color: 'bg-orange-400' },
  { zone: 5, name: 'VO2 Max', minPercent: 90, maxPercent: 100, color: 'bg-red-500' },
];
