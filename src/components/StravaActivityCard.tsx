import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StravaActivity } from '@/types/strava';

const activityIcons: Record<string, string> = {
  Run: '🏃',
  Ride: '🚴',
  Swim: '🏊',
  Walk: '🚶',
  Hike: '🥾',
  WeightTraining: '🏋️',
  Yoga: '🧘',
  Workout: '💪',
};

const formatDistance = (meters?: number): string => {
  if (!meters) return '';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatPace = (speedMs?: number, type?: string): string => {
  if (!speedMs || speedMs === 0) return '';
  if (type === 'Run' || type === 'Walk' || type === 'Hike') {
    // Pace in min/km
    const paceSeconds = 1000 / speedMs;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.round(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  }
  // Speed in km/h
  return `${(speedMs * 3.6).toFixed(1)} km/h`;
};

export const StravaActivityCard = ({ activity }: { activity: StravaActivity }) => {
  const icon = activityIcons[activity.type] || '🏅';

  return (
    <Card className="bg-orange-500/5 border-orange-500/20">
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-lg">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{activity.name}</p>
              <Badge variant="outline" className="text-[10px] shrink-0 border-orange-500/30 text-orange-600">
                Strava
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              {activity.distance && <span>{formatDistance(activity.distance)}</span>}
              {activity.movingTime && <span>{formatDuration(activity.movingTime)}</span>}
              {activity.averageSpeed && <span>{formatPace(activity.averageSpeed, activity.type)}</span>}
              {activity.averageHeartrate && <span>❤️ {Math.round(activity.averageHeartrate)}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
