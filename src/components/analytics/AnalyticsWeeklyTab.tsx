import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { dateLocale } from '@/i18n';
import { parseLocalDate } from '@/lib/utils';
import { Dumbbell, Flame, Route, Trophy } from 'lucide-react';

const AnalyticsWeeklyTab = () => {
  const { uid } = useCurrentUser();
  const { t, lang } = useTranslation();
  const { fmt, fmtTonnage } = useUnit();
  const { summaries } = useWeeklySummary(uid);

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

      {summaries.map(s => (
        <Card key={s.id} className="hover:border-primary/30 transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-xs">
                {parseLocalDate(s.weekStart).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })} - {parseLocalDate(s.weekEnd).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(s.generatedAt).toLocaleDateString(dateLocale(lang))}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Dumbbell className="h-3 w-3 text-primary" />
                </div>
                <p className="text-sm font-bold">{s.stats.workoutCount}</p>
                <p className="text-xs text-muted-foreground">{t('analytics.subtab.workouts')}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-3 w-3 text-primary" />
                </div>
                <p className="text-sm font-bold">{fmtTonnage(s.stats.tonnageKg)}</p>
                <p className="text-xs text-muted-foreground">{t('analytics.stat.tonnage')}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Route className="h-3 w-3 text-orange-500" />
                </div>
                <p className="text-sm font-bold">{s.stats.runKm} km</p>
                <p className="text-xs text-muted-foreground">{t('analytics.stat.run')}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="h-3 w-3 text-primary" />
                </div>
                <p className="text-sm font-bold">{s.stats.prs.length}</p>
                <p className="text-xs text-muted-foreground">{t('analytics.stat.prs')}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{s.summary}</p>

            {s.stats.prs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {s.stats.prs.map((pr, i) => (
                  <Badge key={i} className="text-xs bg-fitness-warning/10 text-fitness-warning border-fitness-warning/30">
                    {pr.exerciseName} - {fmt(pr.newValue)}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnalyticsWeeklyTab;
