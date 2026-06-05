import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { StravaActivity } from '@/types/strava';
import { computeSummaryStats, formatPaceFromSeconds } from '@/lib/strava-utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface StravaSummaryStatsProps {
  activities: StravaActivity[];
}

export const StravaSummaryStats = ({ activities }: StravaSummaryStatsProps) => {
  const { t } = useTranslation();
  const stats = useMemo(() => computeSummaryStats(activities), [activities]);

  if (!stats) return null;

  const items = [
    { label: t('strava.totalDistance'), value: `${stats.totalDistance.toFixed(1)} km` },
    { label: t('strava.totalTime'), value: `${(stats.totalTime / 3600).toFixed(1)} h` },
    { label: t('strava.avgPace'), value: stats.avgPace ? `${formatPaceFromSeconds(stats.avgPace)} /km` : '—' },
    { label: t('strava.calories'), value: stats.totalCalories > 0 ? `${Math.round(stats.totalCalories)} kcal` : '—' },
    { label: t('strava.elevation'), value: stats.totalElevation > 0 ? `${Math.round(stats.totalElevation)} m` : '—' },
    { label: t('strava.avgHR'), value: stats.avgHR ? `${stats.avgHR} bpm` : '—' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
