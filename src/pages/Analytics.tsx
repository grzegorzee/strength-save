import { lazy, Suspense, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { localizeDayName } from '@/lib/plan-i18n';
import { useCurrentUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import {
  calculateStreak,
  getWeekBounds,
  getMonthBounds,
  calculateTonnage,
  filterWorkoutsByPeriod,
} from '@/lib/summary-utils';
import { detectNewPRs } from '@/lib/pr-utils';
import { parseLocalDate } from '@/lib/utils';
import { countScheduledTrainingsInRange } from '@/lib/plan-schedule';
import {
  Dumbbell, Trophy, Flame, Copy, Check, Calendar, BarChart3,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';

type AnalyticsTab = 'summary' | 'charts' | 'strava' | 'weekly';

const ChartsTab = lazy(() => import('@/components/analytics/AnalyticsChartsTab'));
const WeeklyTab = lazy(() => import('@/components/analytics/AnalyticsWeeklyTab'));
const StravaTab = lazy(() => import('@/components/strava/StravaTab').then((mod) => ({ default: mod.StravaTab })));

// ========================
// TAB: Podsumowanie
// ========================

type Period = 'week' | 'month';

const SummaryTab = () => {
  const { uid } = useCurrentUser();
  const { workouts, measurements, isLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, planStartDate } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const { unit, fmt, toDisplay, fmtTonnage } = useUnit();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('week');
  const [copied, setCopied] = useState(false);

  const bounds = useMemo(() => {
    const now = new Date();
    return period === 'week' ? getWeekBounds(now) : getMonthBounds(now);
  }, [period]);
  const previousBounds = useMemo(() => (
    period === 'week'
      ? getWeekBounds(new Date(bounds.start.getTime() - 7 * 24 * 60 * 60 * 1000))
      : getMonthBounds(new Date(bounds.start.getFullYear(), bounds.start.getMonth() - 1, 1))
  ), [bounds, period]);
  const boundsStartMs = bounds.start.getTime();

  const currentWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, bounds),
    [bounds, workouts],
  );

  const previousWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, previousBounds),
    [previousBounds, workouts],
  );

  const expectedWorkouts = useMemo(
    () => {
      if (!planStartDate) {
        return countScheduledTrainingsInRange(trainingPlan, bounds.start, bounds.end);
      }

      const startDate = parseLocalDate(planStartDate);
      if (bounds.end < startDate) {
        return currentWorkouts.length;
      }

      const effectiveStart = bounds.start < startDate ? startDate : bounds.start;
      return countScheduledTrainingsInRange(trainingPlan, effectiveStart, bounds.end);
    },
    [bounds.end, bounds.start, currentWorkouts.length, planStartDate, trainingPlan],
  );
  const frequency = currentWorkouts.length;

  const currentTonnage = calculateTonnage(currentWorkouts);
  const previousTonnage = calculateTonnage(previousWorkouts);
  const tonnageChange = previousTonnage > 0
    ? Math.round(((currentTonnage - previousTonnage) / previousTonnage) * 100)
    : 0;

  const streak = useMemo(() => calculateStreak(workouts), [workouts]);

  const resolver = useMemo(() => buildWorkoutResolver(trainingPlan, cycles, lang), [trainingPlan, cycles, lang]);

  const periodPRs = useMemo(() => {
    // Nazwy ze wszystkich wykonanych ćwiczeń (snapshot/cykl/plan), nie tylko z aktualnego planu.
    const allNames = new Map<string, string>();
    workouts.forEach(w => w.exercises.forEach(ex => {
      if (!allNames.has(ex.exerciseId)) allNames.set(ex.exerciseId, resolver.resolveExerciseName(w, ex.exerciseId));
    }));
    const allPRs: Array<{ exerciseName: string; type: string }> = [];
    const historicalWorkouts = workouts.filter(w => w.completed && parseLocalDate(w.date).getTime() < boundsStartMs);

    currentWorkouts.forEach(cw => {
      const prs = detectNewPRs(cw, historicalWorkouts, allNames);
      prs.forEach(pr => allPRs.push({ exerciseName: pr.exerciseName, type: pr.type }));
    });

    return allPRs;
  }, [boundsStartMs, currentWorkouts, resolver, workouts]);

  const periodMeasurements = measurements.filter(m => {
    const d = parseLocalDate(m.date);
    return d >= bounds.start && d <= bounds.end && m.weight;
  });
  const latestMeasurement = periodMeasurements[0] || measurements.find(m => m.weight);
  const latestWeight = latestMeasurement?.weight;

  const handleCopy = async () => {
    const periodLabel = period === 'week' ? t('analytics.period.week') : t('analytics.period.month');
    const dateRange = `${bounds.start.toLocaleDateString(dateLocale(lang))} - ${bounds.end.toLocaleDateString(dateLocale(lang))}`;
    const lines = [
      `📊 ${t('analytics.copy.summary', { period: periodLabel })}`,
      `📅 ${dateRange}`,
      ``,
      `🏋️ ${t('analytics.copy.frequency', { done: frequency, expected: expectedWorkouts })}`,
      `💪 ${t('analytics.copy.tonnage', { value: Math.round(toDisplay(currentTonnage)).toLocaleString(dateLocale(lang)), unit })}${tonnageChange !== 0 ? ` (${tonnageChange > 0 ? '+' : ''}${tonnageChange}%)` : ''}`,
      `🔥 ${t('analytics.copy.streak', { n: streak })}`,
    ];
    if (periodPRs.length > 0) lines.push(`🏆 ${t('analytics.copy.newPRs', { list: periodPRs.map(p => p.exerciseName).join(', ') })}`);
    if (latestWeight) lines.push(`⚖️ ${t('analytics.copy.weight', { value: Number(toDisplay(latestWeight).toFixed(1)), unit })}`);

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast({ title: t('analytics.toast.copied'), description: t('analytics.toast.copiedDesc') });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t('common.loading')}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={period === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('week')}>
            <Calendar className="h-4 w-4 mr-2" />{t('analytics.period.week')}
          </Button>
          <Button variant={period === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('month')}>
            <BarChart3 className="h-4 w-4 mr-2" />{t('analytics.period.month')}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? t('analytics.copied') : t('analytics.copy')}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {bounds.start.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' })} - {bounds.end.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Dumbbell className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{frequency}/{expectedWorkouts}</p><p className="text-xs text-muted-foreground">{t('analytics.stat.frequency')}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Trophy className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{fmtTonnage(currentTonnage)}</p>
              <p className="text-xs text-muted-foreground">
                {t('analytics.stat.tonnage')}
                {tonnageChange !== 0 && (
                  <span className={tonnageChange > 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                    {tonnageChange > 0 ? '+' : ''}{tonnageChange}%
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Flame className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold">{streak}</p><p className="text-xs text-muted-foreground">{t('analytics.stat.streakWeeks')}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{latestWeight ? fmt(latestWeight) : '--'}</p><p className="text-xs text-muted-foreground">{t('analytics.stat.bodyWeight')}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {periodPRs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-fitness-warning" />
              {period === 'week' ? t('analytics.newPRs.week') : t('analytics.newPRs.month')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {periodPRs.map((pr, i) => (
                <Badge key={i} className="bg-fitness-warning/10 text-yellow-700 border-fitness-warning/30">🏆 {pr.exerciseName}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentWorkouts.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">{t('analytics.completedWorkouts')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {currentWorkouts.map(w => {
              const dayLabel = resolver.resolveDayLabel(w);
              return (
                <button
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 w-full text-left hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/workout/${w.dayId}?date=${w.date}&session=${w.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{localizeDayName(dayLabel.dayName, lang)}</p>
                    <p className="text-xs text-muted-foreground">
                      {parseLocalDate(w.date).toLocaleDateString(dateLocale(lang), { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{t('analytics.exercisesCount', { n: w.exercises.length })}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {currentWorkouts.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{period === 'week' ? t('analytics.noWorkouts.week') : t('analytics.noWorkouts.month')}</p>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

// ========================
// MAIN PAGE
// ========================

const Analytics = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canUseStrava } = useCurrentUser();
  const { t } = useTranslation();
  const tabParam = searchParams.get('tab') as AnalyticsTab | null;
  const validTabs: AnalyticsTab[] = canUseStrava
    ? ['summary', 'charts', 'strava', 'weekly']
    : ['summary', 'charts', 'weekly'];
  const currentTab: AnalyticsTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'summary';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold uppercase italic tracking-tight">{t('analytics.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('analytics.subtitle')}</p>
      </div>

      <Tabs value={currentTab} onValueChange={(value) => setSearchParams({ tab: value })}>
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="summary" className="flex-1 text-xs min-w-0">{t('analytics.tab.summary')}</TabsTrigger>
          <TabsTrigger value="charts" className="flex-1 text-xs min-w-0">{t('analytics.tab.charts')}</TabsTrigger>
          {canUseStrava && <TabsTrigger value="strava" className="flex-1 text-xs min-w-0">Strava</TabsTrigger>}
          <TabsTrigger value="weekly" className="flex-1 text-xs min-w-0">{t('analytics.tab.weekly')}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary"><SummaryTab /></TabsContent>
        <TabsContent value="charts">
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t('common.loading')}</div></div>}>
            <ChartsTab />
          </Suspense>
        </TabsContent>
        {canUseStrava && (
          <TabsContent value="strava">
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t('common.loading')}</div></div>}>
              <StravaTab />
            </Suspense>
          </TabsContent>
        )}
        <TabsContent value="weekly">
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t('common.loading')}</div></div>}>
            <WeeklyTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
