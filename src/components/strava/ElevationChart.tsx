import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Mountain } from 'lucide-react';
import { tooltipStyle } from '@/lib/chart-config';
import { computeWeeklyElevation } from '@/lib/strava-utils';
import type { StravaActivity } from '@/types/strava';

interface ElevationChartProps {
  activities: StravaActivity[];
  referenceDate?: Date;
}

export const ElevationChart = ({ activities, referenceDate }: ElevationChartProps) => {
  const { data, totalSeason, trend } = useMemo(
    () => computeWeeklyElevation(activities, 12, referenceDate),
    [activities, referenceDate],
  );

  if (!data.some((d) => d.elevation > 0)) return null;

  const trendText = trend !== null
    ? ` (trend: ${trend >= 0 ? '+' : ''}${trend}%)`
    : '';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Mountain className="h-4 w-4 text-amber-700" />
          Przewyższenie / tydzień
        </CardTitle>
        <CardDescription className="text-xs">
          Łącznie: {Math.round(totalSeason)} m{trendText}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={2} />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit=" m" />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} m`, 'Przewyższenie']} />
            <Bar dataKey="elevation" name="Przewyższenie" fill="#b45309" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
