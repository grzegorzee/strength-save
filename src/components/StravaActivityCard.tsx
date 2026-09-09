import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Heart, MoveUpRight, Pencil } from 'lucide-react';
import type { StravaActivity } from '@/types/strava';
import { StravaActivityDetail } from '@/components/StravaActivityDetail';
import { baseActivityType, displayActivityType, getActivityIcon } from '@/lib/activity-icons';
import { getHRZone, getHRZoneConfig } from '@/lib/hr-zones';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { parseLocalDateSafe } from '@/lib/utils';
import { PoweredByStrava } from '@/components/strava/StravaBranding';

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
  parseLocalDateSafe(value) ?? new Date(value);

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
  /** Oś czasu ma datę nad kartą, więc nie powtarza jej wewnątrz. */
  showDate?: boolean;
}

export const StravaActivityCard = ({ activity, maxHR, onEdit, showDate = true }: StravaActivityCardProps) => {
  const { t, lang } = useTranslation();
  const [detailOpen, setDetailOpen] = useState(false);
  const isManual = (activity as { source?: string }).source === 'manual';
  // T6: sportType (np. TrailRun) jest dokładniejszy niż type; spacer ma być
  // PODPISANY jako spacer, nie udawać biegu.
  const displayType = displayActivityType(activity);
  const Icon = getActivityIcon(displayType);
  const typeKey = `cardio.type.${displayType}`;
  const typeTranslated = t(typeKey as Parameters<typeof t>[0]);
  const typeLabel = typeTranslated === typeKey ? displayType : typeTranslated;
  const shortDate = formatShortDate(activity, dateLocale(lang));
  const activityLabel = activity.name || t(`cardio.type.${activity.type}` as Parameters<typeof t>[0]);
  const openActivity = () => (isManual ? onEdit?.() : setDetailOpen(true));

  const hrZone = activity.averageHeartrate && maxHR
    ? getHRZone(activity.averageHeartrate, maxHR)
    : null;
  const hrZoneConfig = hrZone ? getHRZoneConfig(hrZone) : null;

  return (
    <>
      <Card
        className={isManual
          ? 'border-0 bg-surface-low cursor-pointer hover:bg-surface-high transition-colors overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : 'bg-orange-500/5 border-orange-500/20 cursor-pointer hover:bg-orange-500/10 transition-colors overflow-hidden'}
        data-testid={isManual ? 'manual-activity-card' : undefined}
        role="button"
        tabIndex={0}
        aria-label={activityLabel}
        aria-haspopup="dialog"
        onClick={openActivity}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openActivity();
          }
        }}
      >
        <CardContent className="py-3 px-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${isManual ? 'bg-fitness-cyan/10' : 'bg-orange-500/10'}`}>
              <Icon className={`h-5 w-5 ${isManual ? 'text-fitness-cyan' : 'text-orange-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="w-full break-words font-medium text-sm leading-snug">{activityLabel}</p>
                {showDate && <span className="text-xs text-muted-foreground">{shortDate}</span>}
                {!isManual && (
                  <>
                    <Badge variant="outline" className="text-[11px] shrink-0 border-orange-500/30 text-orange-600">
                      Strava
                    </Badge>
                    <Badge variant="outline" className="text-[11px] shrink-0 text-muted-foreground">
                      {typeLabel}
                    </Badge>
                  </>
                )}
              </div>
              <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-muted-foreground mt-0.5">
                {activity.distance && <span>{formatDistance(activity.distance)}</span>}
                {activity.movingTime && <span>{formatDuration(activity.movingTime)}</span>}
                {isManual && <span className="inline-flex items-center gap-1 text-muted-foreground"><Pencil className="h-3 w-3" aria-hidden />{t('cardio.manualBadge')}</span>}
                {activity.averageSpeed && <span>{formatPace(activity.averageSpeed, baseActivityType(displayType))}</span>}
                {activity.totalElevationGain != null && activity.totalElevationGain > 0 && (
                  <span className="flex items-center gap-0.5"><MoveUpRight className="h-3 w-3" aria-hidden />{Math.round(activity.totalElevationGain)}m</span>
                )}
                {activity.averageHeartrate && (
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" aria-hidden /> {Math.round(activity.averageHeartrate)}
                    {hrZoneConfig && (
                      <span className={`inline-flex items-center px-1 rounded text-[11px] font-bold text-white ${hrZoneConfig.color}`}>
                        Z{hrZone}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {!isManual && <PoweredByStrava className="mt-2 h-[14px]" />}
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
