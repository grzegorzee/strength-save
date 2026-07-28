import type { TranslationKey } from '@/i18n';

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

/**
 * Aktywność zunifikowana (Z111): Strava + wpisy manualne w jednym strumieniu.
 * Komponenty listujące cardio przechodzą na ten typ; czysto-Stravowe zostają na StravaActivity.
 */
export interface UnifiedActivity extends StravaActivity {
  source: 'strava' | 'manual';
  /** Intensywność odczuwana wpisu manualnego bez HR (TRIMP: easy/moderate/hard -> 60/75/88 %HRmax). */
  perceivedIntensity?: 'easy' | 'moderate' | 'hard';
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
  /** Klucz i18n nazwy strefy (Z164) — render przez t()/translate(). */
  nameKey: TranslationKey;
  minPercent: number;
  maxPercent: number;
  color: string; // Tailwind class
}

export const HR_ZONES: HRZoneConfig[] = [
  { zone: 1, nameKey: 'strava.zoneRecovery', minPercent: 50, maxPercent: 60, color: 'bg-blue-400' },
  { zone: 2, nameKey: 'strava.zoneAerobic', minPercent: 60, maxPercent: 70, color: 'bg-green-400' },
  { zone: 3, nameKey: 'strava.zoneTempo', minPercent: 70, maxPercent: 80, color: 'bg-yellow-400' },
  { zone: 4, nameKey: 'strava.zoneThreshold', minPercent: 80, maxPercent: 90, color: 'bg-orange-400' },
  { zone: 5, nameKey: 'strava.zoneVo2max', minPercent: 90, maxPercent: 100, color: 'bg-red-500' },
];
