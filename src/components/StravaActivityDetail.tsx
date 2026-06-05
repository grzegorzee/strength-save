import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { StravaActivity } from '@/types/strava';
import { HR_ZONES } from '@/types/strava';
import { ExternalLink } from 'lucide-react';
import { getHRZone, getHRZoneConfig, getHRPercent } from '@/lib/hr-zones';
import { useTranslation } from '@/contexts/LanguageContext';

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
  if (!meters) return '—';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

const formatPace = (speedMs?: number, type?: string): string => {
  if (!speedMs || speedMs === 0) return '—';
  if (type === 'Run' || type === 'Walk' || type === 'Hike') {
    const paceSeconds = 1000 / speedMs;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.round(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  }
  return `${(speedMs * 3.6).toFixed(1)} km/h`;
};

const formatFullDate = (activity: StravaActivity): string => {
  const dateSource = activity.startDateLocal || activity.date;
  const date = new Date(dateSource);
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (activity: StravaActivity): string => {
  if (!activity.startDateLocal) return '';
  const date = new Date(activity.startDateLocal);
  return date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface MetricItemProps {
  label: string;
  value: string | number;
}

const MetricItem = ({ label, value }: MetricItemProps) => (
  <div className="bg-muted/50 rounded-lg p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold text-sm mt-0.5">{value}</p>
  </div>
);

interface StravaActivityDetailProps {
  activity: StravaActivity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxHR?: number;
}

export const StravaActivityDetail = ({ activity, open, onOpenChange, maxHR }: StravaActivityDetailProps) => {
  const { t } = useTranslation();
  const icon = activityIcons[activity.type] || '🏅';
  const sportLabel = activity.sportType || activity.type;
  const fullDate = formatFullDate(activity);
  const time = formatTime(activity);

  const metrics: MetricItemProps[] = [
    { label: t('strava.detail.distance'), value: formatDistance(activity.distance) },
    { label: t('strava.detail.movingTime'), value: formatDuration(activity.movingTime) },
    { label: t('strava.detail.paceSpeed'), value: formatPace(activity.averageSpeed, activity.type) },
    { label: t('strava.detail.elapsedTime'), value: formatDuration(activity.elapsedTime) },
    { label: t('strava.detail.avgHR'), value: activity.averageHeartrate ? `${Math.round(activity.averageHeartrate)} bpm` : '—' },
    { label: t('strava.detail.maxHR'), value: activity.maxHeartrate ? `${Math.round(activity.maxHeartrate)} bpm` : '—' },
    { label: t('strava.detail.cadence'), value: activity.averageCadence ? `${Math.round(activity.averageCadence)} spm` : '—' },
    { label: t('strava.detail.elevation'), value: activity.totalElevationGain ? `${Math.round(activity.totalElevationGain)} m` : '—' },
    { label: t('strava.detail.calories'), value: activity.calories ? `${activity.calories} kcal` : '—' },
    { label: t('strava.detail.kudos'), value: activity.kudosCount != null ? `👍 ${activity.kudosCount}` : '—' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{activity.name}</SheetTitle>
              <SheetDescription>
                {sportLabel} {activity.trainer && `(${t('strava.detail.indoor')})`} — {fullDate}{time && `, ${time}`}
              </SheetDescription>
            </div>
          </div>
          {activity.trainer && (
            <Badge variant="secondary" className="w-fit mt-2">🏠 {t('strava.detail.indoor')}</Badge>
          )}
        </SheetHeader>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {metrics.map((m) => (
            <MetricItem key={m.label} label={m.label} value={m.value} />
          ))}
        </div>

        {activity.averageHeartrate && maxHR && (() => {
          const zone = getHRZone(activity.averageHeartrate!, maxHR);
          const zoneConfig = getHRZoneConfig(zone);
          const percent = getHRPercent(activity.averageHeartrate!, maxHR);
          return (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">{t('strava.detail.hrZone')}</p>
              <div className="flex gap-1 h-8 rounded-lg overflow-hidden mb-2">
                {HR_ZONES.map((z) => (
                  <div
                    key={z.zone}
                    className={`flex-1 flex items-center justify-center text-[10px] font-bold transition-opacity ${z.color} ${
                      z.zone === zone ? 'opacity-100 text-white' : 'opacity-25'
                    }`}
                  >
                    Z{z.zone}
                  </div>
                ))}
              </div>
              <p className="text-sm">
                {t('strava.detail.dominantZone')} <span className="font-semibold">Z{zone} — {zoneConfig.name}</span>{' '}
                <span className="text-muted-foreground">({percent}% max HR)</span>
              </p>
            </div>
          );
        })()}

        {activity.description && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1">{t('strava.detail.description')}</p>
            <p className="text-sm">{activity.description}</p>
          </div>
        )}

        <Button
          className="w-full bg-[#FC4C02] hover:bg-[#e04400] text-white"
          onClick={() => window.open(activity.stravaUrl, '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {t('strava.detail.openInStrava')}
        </Button>
      </SheetContent>
    </Sheet>
  );
};
