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
}
