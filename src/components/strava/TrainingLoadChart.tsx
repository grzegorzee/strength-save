import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Activity } from 'lucide-react';
import { computeDailyLoad, computeFitnessFatigue } from '@/lib/training-load';
import { tooltipStyle } from '@/lib/chart-config';
import type { StravaActivity } from '@/types/strava';

interface Props {
  activities: StravaActivity[];
  estimatedMaxHR?: number;
}

export const TrainingLoadChart = ({ activities, estimatedMaxHR }: Props) => {
  const data = useMemo(() => {
    const maxHR = estimatedMaxHR || 190;
    const daily = computeDailyLoad(activities, 60, maxHR);
    return computeFitnessFatigue(daily, 90);
  }, [activities, estimatedMaxHR]);

  // Need at least some data points
  const hrActivities = activities.filter(a => a.averageHeartrate);
  if (hrActivities.length < 7 || data.length === 0) return null;

  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric' }),
    Fitness: d.ctl,
    'Zmęczenie': d.atl,
    Forma: d.tsb,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-blue-500" />
          Training Load
        </CardTitle>
        <CardDescription>Pozytywna forma = gotowość do wyścigu</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
            />
            <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="Fitness"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Zmęczenie"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Forma"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
