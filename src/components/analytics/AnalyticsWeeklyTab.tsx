import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useActivities } from '@/hooks/useActivities';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { buildLocalWeeklySummaries } from '@/lib/weekly-summary';
import { getWeekBounds } from '@/lib/summary-utils';
import { dateLocale } from '@/i18n';
import { cn, formatLocalDate, formatLocalDateLabel } from '@/lib/utils';

// Tygodnie liczone lokalnie (Z78) — koniec czytania zamrożonej kolekcji weekly_summaries
// (generator usunięty w R2; kolekcja pokazywała wyłącznie stare dane).
// X28 WP-D: restyle — zamiast 12 dużych Cardów zwarta lista wierszy w jednym
// kontenerze (wzorem listy grupy w /exercises): zakres dat (mono eyebrow) +
// 4 wartości inline; chipy PR dopiero po rozwinięciu wiersza (prosty stan, bez
// Radixa). Bieżący tydzień wyróżniony accent-ring.
const AnalyticsWeeklyTab = () => {
  const { uid, canUseStrava } = useCurrentUser();
  const { t, lang } = useTranslation();
  const { fmt, fmtTonnage } = useUnit();
  const { workouts } = useFirebaseWorkouts(uid, { measurements: 'none', workouts: 'recent' });
  // Z113: podsumowanie tygodnia liczy Strava + ręczne cardio (unified).
  const { activities: stravaActivities } = useActivities(uid, canUseStrava);
  const { plan: trainingPlan } = useTrainingPlan(uid);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  const summaries = useMemo(
    () => buildLocalWeeklySummaries(workouts, stravaActivities, trainingPlan, new Date(), 12, lang),
    [workouts, stravaActivities, trainingPlan, lang],
  );

  const currentWeekStart = formatLocalDate(getWeekBounds(new Date()).start);

  const formatShort = (date: string) =>
    formatLocalDateLabel(date, dateLocale(lang), { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold text-base">{t('analytics.weeklySummaries')}</h3>

      {summaries.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('analytics.noSummaries')}</p>
          </CardContent>
        </Card>
      )}

      {summaries.length > 0 && (
        <div data-testid="weekly-list" className="overflow-hidden rounded-[20px] bg-surface-low">
          <div className="divide-y divide-surface-high">
            {summaries.map(s => {
              const expanded = expandedWeek === s.weekStart;
              return (
                <div
                  key={s.weekStart}
                  data-testid="weekly-row"
                  className={cn(s.weekStart === currentWeekStart && 'accent-ring')}
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedWeek(prev => (prev === s.weekStart ? null : s.weekStart))}
                    className="w-full px-4 py-3 text-left"
                  >
                    <p className="eyebrow-mono font-bold text-muted-foreground">
                      {formatShort(s.weekStart)} - {formatShort(s.weekEnd)}
                    </p>
                    {/* 4 wartości inline; etykieta treningów z istniejącego klucza
                        (wzorem karty miesięcy), km i PR jak dotąd literałami. */}
                    <p className="mt-1 text-sm">
                      <span className="font-bold">{t('analytics.months.workouts', { n: s.stats.workoutCount })}</span>
                      {' · '}<span className="font-bold">{fmtTonnage(s.stats.tonnageKg)}</span>
                      {' · '}<span className="font-bold">{s.stats.runKm}</span> km
                      {' · '}<span className="font-bold">{s.stats.prs.length}</span> PR
                    </p>
                  </button>
                  {expanded && s.stats.prs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                      {s.stats.prs.map((pr, i) => (
                        <Badge key={i} className="text-xs bg-fitness-warning/10 text-fitness-warning border-fitness-warning/30">
                          {pr.exerciseName} - {fmt(pr.newValue)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsWeeklyTab;
