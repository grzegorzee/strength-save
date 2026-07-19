import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Pencil } from 'lucide-react';
import type { StravaActivity } from '@/types/strava';
import { StravaActivityDetail } from '@/components/StravaActivityDetail';
import { getHRZone, getHRZoneConfig } from '@/lib/hr-zones';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { parseLocalDate } from '@/lib/utils';

const activityIcons: Record<string, string> = {
  Run: '🏃',
  Ride: '🚴',
  Swim: '🏊',
  Walk: '🚶',
  Hike: '🥾',
  WeightTraining: '🏋️',
  Yoga: '🧘',
  Workout: '💪',
  // Typy wpisów manualnych (Z112)
  Treadmill: '🏃',
  IndoorRide: '🚴',
  JumpRope: '🪢',
  HIIT: '🔥',
  Other: '🏅',
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

const parseActivityDate = (value: string): Date =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseLocalDate(value) : new Date(value);

const formatShortDate = (activity: StravaActivity, locale: string): string => {
  const dateSource = activity.startDateLocal || activity.date;
  const date = parseActivityDate(dateSource);
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
};

interface StravaActivityCardProps {
  activity: StravaActivity;
  maxHR?: number;
  /** Z112: wpis manualny — klik otwiera edycję zamiast szczegółów Strava. */
  onEdit?: () => void;
}

export const StravaActivityCard = ({ activity, maxHR, onEdit }: StravaActivityCardProps) => {
  const { t, lang } = useTranslation();
  const [detailOpen, setDetailOpen] = useState(false);
  const isManual = (activity as { source?: string }).source === 'manual';
  const icon = activityIcons[activity.type] || '🏅';
  const shortDate = formatShortDate(activity, dateLocale(lang));

  const hrZone = activity.averageHeartrate && maxHR
    ? getHRZone(activity.averageHeartrate, maxHR)
    : null;
  const hrZoneConfig = hrZone ? getHRZoneConfig(hrZone) : null;

  return (
    <>
      <Card
        className={isManual
          ? 'bg-fitness-cyan/5 border-fitness-cyan/20 cursor-pointer hover:bg-fitness-cyan/10 transition-colors overflow-hidden'
          : 'bg-orange-500/5 border-orange-500/20 cursor-pointer hover:bg-orange-500/10 transition-colors overflow-hidden'}
        data-testid={isManual ? 'manual-activity-card' : undefined}
        onClick={() => (isManual ? onEdit?.() : setDetailOpen(true))}
      >
        <CardContent className="py-3 px-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg ${isManual ? 'bg-fitness-cyan/10' : 'bg-orange-500/10'}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{activity.name || t(`cardio.type.${activity.type}` as Parameters<typeof t>[0])}</p>
                <span className="text-xs text-muted-foreground shrink-0">{shortDate}</span>
                {isManual ? (
                  <Badge variant="outline" className="text-[10px] shrink-0 border-fitness-cyan/30 text-fitness-cyan gap-0.5">
                    <Pencil className="h-2.5 w-2.5" />
                    {t('cardio.manualBadge')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] shrink-0 border-orange-500/30 text-orange-600">
                    Strava
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-muted-foreground mt-0.5">
                {activity.distance && <span>{formatDistance(activity.distance)}</span>}
                {activity.movingTime && <span>{formatDuration(activity.movingTime)}</span>}
                {activity.averageSpeed && <span>{formatPace(activity.averageSpeed, activity.type)}</span>}
                {activity.totalElevationGain != null && activity.totalElevationGain > 0 && (
                  <span>↗ {Math.round(activity.totalElevationGain)}m</span>
                )}
                {activity.averageHeartrate && (
                  <span className="flex items-center gap-1">
                    ❤️ {Math.round(activity.averageHeartrate)}
                    {hrZoneConfig && (
                      <span className={`inline-flex items-center px-1 rounded text-[10px] font-bold text-white ${hrZoneConfig.color}`}>
                        Z{hrZone}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>

      {!isManual && (
        <StravaActivityDetail
          activity={activity}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          maxHR={maxHR}
        />
      )}
    </>
  );
};
