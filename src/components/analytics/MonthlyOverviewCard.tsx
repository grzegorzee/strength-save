import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarRange } from 'lucide-react';
import { aggregateMonthlyStats, formatDurationHM } from '@/lib/monthly-stats';
import { parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';
import type { WorkoutSession } from '@/types';

// Z93: przegląd miesięcy — ile treningów i ile czasu w każdym miesiącu (12 wstecz).
// Treningi sprzed M32 nie mają zmierzonego czasu: liczą się do liczby treningów,
// a ich brak jest jawnie dopisany (nie zaniżają sumy czasu).

export const MonthlyOverviewCard = ({ workouts }: { workouts: WorkoutSession[] }) => {
  const { t, lang } = useTranslation();
  const { fmtTonnage } = useUnit();

  const stats = useMemo(() => aggregateMonthlyStats(workouts, 12, new Date()), [workouts]);

  if (stats.length === 0) return null;

  const monthLabel = (monthKey: string): string => {
    const label = parseLocalDate(`${monthKey}-01`)
      .toLocaleDateString(dateLocale(lang), { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-heading font-bold uppercase italic tracking-tight">
          <CalendarRange className="h-4 w-4 text-primary" />
          {t('analytics.months.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.map((month) => {
          const missingDuration = month.workoutCount - month.workoutsWithDuration;
          return (
            <div key={month.monthKey} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{monthLabel(month.monthKey)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('analytics.months.workouts', { n: month.workoutCount })}
                  {missingDuration > 0 && (
                    <span> · {t('analytics.months.noTime', { n: missingDuration })}</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums">
                  {formatDurationHM(month.totalDurationSec)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {fmtTonnage(month.totalTonnageKg)}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
