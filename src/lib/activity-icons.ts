import {
  Activity, Bike, Dumbbell, Flame, Footprints, Leaf, Medal, Mountain,
  PersonStanding, Waves, type LucideIcon,
} from 'lucide-react';

// Jedna mapa dla całej apki (dawniej emoji zduplikowane w StravaActivityCard,
// StravaActivityDetail, AddCardioDialog, strava-utils). Fallback = Medal.
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  Run: Footprints,
  Ride: Bike,
  Swim: Waves,
  Walk: PersonStanding,
  Hike: Mountain,
  WeightTraining: Dumbbell,
  Yoga: Leaf,
  Workout: Activity,
  Treadmill: Footprints,
  IndoorRide: Bike,
  JumpRope: Activity,
  HIIT: Flame,
  Other: Medal,
};

// T6: warianty sport_type Stravy → bazowy klucz (ikona, decyzja tempo vs prędkość).
const SPORT_TYPE_BASE: Record<string, string> = {
  TrailRun: 'Run',
  VirtualRun: 'Run',
  VirtualRide: 'Ride',
  GravelRide: 'Ride',
  MountainBikeRide: 'Ride',
  EBikeRide: 'Ride',
  EMountainBikeRide: 'Ride',
  Handcycle: 'Ride',
  Velomobile: 'Ride',
  Snowshoe: 'Hike',
  RockClimbing: 'Hike',
};

/** Typ do prezentacji: sportType (dokładniejszy, np. TrailRun) z fallbackiem na type. */
export const displayActivityType = (
  activity: { type?: string | null; sportType?: string | null },
): string => activity.sportType || activity.type || 'Other';

/** Bazowy klucz typu (TrailRun→Run itd.) — dla ikon i wyboru min/km vs km/h. */
export const baseActivityType = (type: string): string =>
  SPORT_TYPE_BASE[type] ?? type;

export const getActivityIcon = (type: string): LucideIcon =>
  ACTIVITY_ICONS[type] ?? ACTIVITY_ICONS[baseActivityType(type)] ?? Medal;
