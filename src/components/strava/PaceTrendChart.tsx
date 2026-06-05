import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Clock } from 'lucide-react';
import { tooltipStyle } from '@/lib/chart-config';
import { computePaceTrendData, formatPaceFromSeconds } from '@/lib/strava-utils';
import type { StravaActivity } from '@/types/strava';
import { useTranslation } from '@/contexts/LanguageContext';

interface PaceTrendChartProps {
  activities: StravaActivity[];
  referenceDate?: Date;
}

export const PaceTrendChart = ({ activities, referenceDate }: PaceTrendChartProps) => {
  const { t } = useTranslation();
  const data = useMemo(() => computePaceTrendData(activities, 12, referenceDate), [activities, referenceDate]);

  if (!data.some((d) => d.paceSeconds !== null)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          {t('strava.paceTrend')}
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
              formatter={(value: number) => [`${formatPaceFromSeconds(value)} /km`, t('strava.pace')]}
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
