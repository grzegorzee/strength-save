import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { StravaActivity } from '@/types/strava';
import { computeSummaryStats, formatPaceFromSeconds } from '@/lib/strava-utils';

interface StravaSummaryStatsProps {
  activities: StravaActivity[];
}

export const StravaSummaryStats = ({ activities }: StravaSummaryStatsProps) => {
  const stats = useMemo(() => computeSummaryStats(activities), [activities]);

  if (!stats) return null;

  const items = [
    { label: 'Łączny dystans', value: `${stats.totalDistance.toFixed(1)} km` },
    { label: 'Łączny czas', value: `${(stats.totalTime / 3600).toFixed(1)} h` },
    { label: 'Średnie tempo', value: stats.avgPace ? `${formatPaceFromSeconds(stats.avgPace)} /km` : '—' },
    { label: 'Kalorie', value: stats.totalCalories > 0 ? `${Math.round(stats.totalCalories)} kcal` : '—' },
    { label: 'Przewyższenie', value: stats.totalElevation > 0 ? `${Math.round(stats.totalElevation)} m` : '—' },
    { label: 'Średnie HR', value: stats.avgHR ? `${stats.avgHR} bpm` : '—' },
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
