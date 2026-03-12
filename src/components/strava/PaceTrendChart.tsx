import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Clock } from 'lucide-react';
import { tooltipStyle } from '@/lib/chart-config';
import { computePaceTrendData, formatPaceFromSeconds } from '@/lib/strava-utils';
import type { StravaActivity } from '@/types/strava';

interface PaceTrendChartProps {
  activities: StravaActivity[];
}

export const PaceTrendChart = ({ activities }: PaceTrendChartProps) => {
  const data = useMemo(() => computePaceTrendData(activities, 12), [activities]);

  if (!data.some((d) => d.paceSeconds !== null)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          Trend tempa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={2} />
            <YAxis
              reversed
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickFormatter={(val: number) => formatPaceFromSeconds(val)}
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`${formatPaceFromSeconds(value)} /km`, 'Tempo']}
            />
            <Line
              type="monotone"
              dataKey="paceSeconds"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
