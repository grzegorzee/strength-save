import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Route } from 'lucide-react';
import { tooltipStyle } from '@/lib/chart-config';
import { computeWeeklyKm } from '@/lib/strava-utils';
import type { StravaActivity } from '@/types/strava';

interface WeeklyKmChartProps {
  activities: StravaActivity[];
  referenceDate?: Date;
}

export const WeeklyKmChart = ({ activities, referenceDate }: WeeklyKmChartProps) => {
  const data = useMemo(() => computeWeeklyKm(activities, 12, referenceDate), [activities, referenceDate]);

  if (!data.some((w) => w.km > 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4 text-orange-500" />
          Kilometry / tydzień
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={2} />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit=" km" />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} km`, 'Dystans']} />
            <Bar dataKey="km" name="km" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
