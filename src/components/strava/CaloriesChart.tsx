import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Flame } from 'lucide-react';
import { tooltipStyle } from '@/lib/chart-config';
import { computeWeeklyCalories } from '@/lib/strava-utils';
import type { StravaActivity } from '@/types/strava';

interface CaloriesChartProps {
  activities: StravaActivity[];
}

export const CaloriesChart = ({ activities }: CaloriesChartProps) => {
  const { data, totalSeason } = useMemo(
    () => computeWeeklyCalories(activities, 12),
    [activities],
  );

  if (!data.some((d) => d.calories > 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-4 w-4 text-red-500" />
          Kalorie / tydzień
        </CardTitle>
        <CardDescription className="text-xs">
          Łącznie: {Math.round(totalSeason)} kcal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={2} />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit=" kcal" />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} kcal`, 'Kalorie']} />
            <Bar dataKey="calories" name="Kalorie" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
