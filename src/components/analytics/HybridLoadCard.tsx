import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Layers } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useActivities } from '@/hooks/useActivities';
import { computeDailyLoads, computeWeeklyBalance, detectInterference } from '@/lib/hybrid-load';
import { tooltipStyle } from '@/lib/chart-config';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { parseLocalDate } from '@/lib/utils';

const WEEKS_SHOWN = 12;

/**
 * Karta obciążenia hybrydowego (Z115): siła (sTRIMP skalibrowany) + cardio (TRIMP)
 * na jednej osi tygodniowej. Etykieta: obciążenie SZACUNKOWE.
 */
export const HybridLoadCard = () => {
  const { t, lang } = useTranslation();
  const { uid, canUseStrava } = useCurrentUser();
  const { workouts } = useFirebaseWorkouts(uid);
  const { activities, connection } = useActivities(uid, canUseStrava);

  const weekly = useMemo(() => {
    const visible = activities.filter((a) => a.source === 'manual' || connection.connected);
    const daily = computeDailyLoads(workouts, visible, 60, connection.estimatedMaxHR || 190);
    return computeWeeklyBalance(daily).slice(-WEEKS_SHOWN);
  }, [workouts, activities, connection.connected, connection.estimatedMaxHR]);

  const interference = useMemo(() => {
    const visible = activities.filter((a) => a.source === 'manual' || connection.connected);
    // Ostatnie 7 dni wystarcza — wskazówka ma sens tylko dla świeżych par.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return detectInterference(
      workouts.filter((w) => w.date >= cutoffStr),
      visible.filter((a) => a.date >= cutoffStr),
    );
  }, [workouts, activities, connection.connected]);

  if (weekly.length === 0) return null;

  const labelStrength = t('hybrid.strength');
  const labelCardio = t('hybrid.cardio');
  const labelTotal = t('hybrid.total');
  const chartData = weekly.map((w) => ({
    week: parseLocalDate(w.weekStart).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'numeric' }),
    [labelStrength]: w.strengthLoad,
    [labelCardio]: w.cardioLoad,
    [labelTotal]: w.strengthLoad + w.cardioLoad,
  }));
  const current = weekly[weekly.length - 1];

  return (
    <Card data-testid="hybrid-load-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-heading uppercase tracking-tight">
          <Layers className="h-5 w-5 text-primary" />
          {t('hybrid.cardTitle')}
        </CardTitle>
        <CardDescription>{t('hybrid.cardDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey={labelStrength} stackId="load" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
            <Bar dataKey={labelCardio} stackId="load" fill="#00e3fd" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey={labelTotal} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-between rounded-lg bg-surface-lowest px-3 py-2 text-sm" data-testid="hybrid-week-split">
          <span className="text-muted-foreground">{t('hybrid.currentWeekSplit')}</span>
          <span className="font-bold tabular-nums">
            <span className="text-primary">{current.strengthPct}%</span>
            {' / '}
            <span className="text-fitness-cyan">{current.cardioPct}%</span>
          </span>
        </div>

        {interference.length > 0 && (
          <div className="rounded-lg bg-fitness-warning/10 px-3 py-2 text-xs text-fitness-warning" data-testid="hybrid-interference">
            {t('hybrid.interferenceHint', { n: interference.length })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HybridLoadCard;
