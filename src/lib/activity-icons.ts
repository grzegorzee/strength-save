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

export const getActivityIcon = (type: string): LucideIcon =>
  ACTIVITY_ICONS[type] ?? Medal;
