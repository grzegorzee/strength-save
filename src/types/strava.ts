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
  stravaUrl: string;
  syncedAt: string;     // ISO timestamp
}

export interface StravaConnection {
  connected: boolean;
  athleteId?: number;
  athleteName?: string;
  lastSync?: string;
}
