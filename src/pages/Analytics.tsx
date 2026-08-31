import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useWorkoutRange } from '@/hooks/useWorkoutHistoryPage';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import { useCurrentUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import {
  calculateStreak,
  calculateTonnage,
  filterWorkoutsByPeriod,
} from '@/lib/summary-utils';
import { detectNewPRs } from '@/lib/pr-utils';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { trainingPlan as defaultPlanData } from '@/data/trainingPlan';
import { localizeExerciseName } from '@/data/exercise-i18n';
import { countScheduledTrainingsInRange } from '@/lib/plan-schedule';
import {
  Trophy, Flame, Check, Share2, ChevronLeft,
  ChevronRight, FileDown, FileSpreadsheet, Loader2, TrendingUp,
} from 'lucide-react';
import { ExportWorkoutsDialog } from '@/components/ExportWorkoutsDialog';
import { buildTrainingReportModel, generateTrainingReportPdf } from '@/lib/pdf-report';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';
import { shareOrDownloadFile } from '@/lib/share-export';
import { reportClientErrorWithCurrentUid } from '@/lib/global-error-telemetry';
import { MeasurementReadError } from '@/components/MeasurementReadError';
import { getAnalyticsPeriodWindow, type AnalyticsPeriod } from '@/lib/analytics-period';

type AnalyticsTab = 'summary' | 'charts' | 'strava';

const ChartsTab = lazyWithRetry(() => import('@/components/analytics/AnalyticsChartsTab'), 'lazy-retry:analytics-charts');
const StravaTab = lazyWithRetry(() => import('@/components/strava/StravaTab').then((mod) => ({ default: mod.StravaTab })), 'lazy-retry:analytics-strava');

// ========================
// TAB: Podsumowanie
// ========================

const SummaryTab = () => {
  const { uid, profile } = useCurrentUser();
  const { workouts: liveWorkouts, measurements, measurementError, retryMeasurements, isLoaded: liveLoaded } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, planStartDate } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const { unit, fmt, toDisplay, fmtTonnage } = useUnit();
  const navigate = useNavigate();
  const [summaryParams, setSummaryParams] = useSearchParams();
  const period: AnalyticsPeriod = summaryParams.get('period') === 'month' ? 'month' : 'week';
  const parsedOffset = Number(summaryParams.get('offset') ?? 0);
  const periodOffset = Number.isFinite(parsedOffset)
    ? Math.max(-120, Math.min(0, Math.trunc(parsedOffset)))
    : 0;
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const periodWindow = useMemo(
    () => getAnalyticsPeriodWindow(period, periodOffset),
    [period, periodOffset],
  );
  const bounds = periodWindow.bounds;
  const previousBounds = periodWindow.comparisonPrevious;
  const boundsStartMs = bounds.start.getTime();
  const rangeFromDate = formatLocalDate(previousBounds.start);
  const rangeToDate = formatLocalDate(bounds.end);
  const { workouts: periodRangeWorkouts, isLoaded: rangeLoaded } = useWorkoutRange(uid, {
    fromDate: rangeFromDate,
    toDate: rangeToDate,
    pageSize: 250,
    maxPages: 4,
  });
  const workouts = useMemo(() => {
    const byId = new Map(liveWorkouts.map(workout => [workout.id, workout]));
    periodRangeWorkouts.forEach(workout => byId.set(workout.id, workout));
    return Array.from(byId.values());
  }, [liveWorkouts, periodRangeWorkouts]);
  const isLoaded = liveLoaded && rangeLoaded;

  const currentWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, bounds),
    [bounds, workouts],
  );

  const currentComparisonWorkouts = useMemo(
    () => filterWorkoutsByPeriod(workouts, periodWindow.comparisonCurrent),
    [periodWindow.comparisonCurrent, workouts],
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

  const currentTonnage = calculateTonnage(currentComparisonWorkouts);
  const previousTonnage = calculateTonnage(previousWorkouts);
  const tonnageChange = previousTonnage > 0
    ? Math.round(((currentTonnage - previousTonnage) / previousTonnage) * 100)
    : 0;
  // B4 (X70): delta porównuje PEŁNY poprzedni okres z ledwo rozpoczętym bieżącym,
  // więc np. we wtorek rano pokazywała "-62%" mimo treningów zgodnie z planem.
  // Chowamy ją, gdy baza porównania jest za słaba: poprzedni okres ma <2 treningi
  // (pojedynczy trening to nie trend) LUB bieżący okres trwa <3 dni (za wcześnie
  // na sensowne porównanie). Docelowa matematyka "to-date" = osobna zmiana.
  const showTonnageDelta = tonnageChange !== 0 && previousWorkouts.length >= 2;

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

  // FIX-B T5: ostatni PR przeniesiony z Dashboardu 1:1 (memo + formatPRDate).
  const latestPR = useMemo(() => {
    const allNames = new Map<string, string>([
      ...defaultPlanData.flatMap(d => d.exercises.map(e => [e.id, e.name] as [string, string])),
      ...trainingPlan.flatMap(d => d.exercises.map(e => [e.id, e.name] as [string, string])),
    ]);
    const completedSorted = workouts
      .filter(w => w.completed)
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());

    let checked = 0;
    for (const workout of completedSorted) {
      if (checked >= 10) break;
      checked++;
      const olderWorkouts = completedSorted.filter(
        w => w.id !== workout.id && parseLocalDate(w.date) < parseLocalDate(workout.date),
      );
      if (olderWorkouts.length === 0) continue;
      const prs = detectNewPRs(workout, olderWorkouts, allNames);
      if (prs.length > 0) {
        return {
          exerciseName: prs[0].exerciseName,
          value: prs[0].newValue,
          type: prs[0].type,
          date: workout.date,
        };
      }
    }
    return null;
  }, [workouts, trainingPlan]);

  const formatPRDate = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('dash.date.today');
    if (diffDays === 1) return t('dash.date.yesterday');
    if (diffDays < 7) return t('dash.date.daysAgo', { n: diffDays });
    return d.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' });
  };

  const periodMeasurements = measurements.filter(m => {
    const d = parseLocalDate(m.date);
    return d >= bounds.start && d <= bounds.end && m.weight;
  });
  const latestMeasurement = periodMeasurements[0] || measurements.find(m => m.weight);
  const latestWeight = latestMeasurement?.weight;

  const updatePeriod = (nextPeriod: AnalyticsPeriod) => {
    setSummaryParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('period', nextPeriod);
      next.delete('offset');
      return next;
    }, { replace: true });
  };
  const movePeriod = (delta: -1 | 1) => {
    setSummaryParams((previous) => {
      const next = new URLSearchParams(previous);
      const rawCurrent = Number(next.get('offset') ?? 0);
      const current = Number.isFinite(rawCurrent)
        ? Math.max(-120, Math.min(0, Math.trunc(rawCurrent)))
        : 0;
      const offset = Math.max(-120, Math.min(0, current + delta));
      if (offset === 0) next.delete('offset');
      else next.set('offset', String(offset));
      return next;
    }, { replace: true });
  };

  const handleShareSummary = async () => {
    const periodLabel = period === 'week' ? t('analytics.period.week') : t('analytics.period.month');
    const dateRange = `${bounds.start.toLocaleDateString(dateLocale(lang))} - ${bounds.end.toLocaleDateString(dateLocale(lang))}`;
    const lines = [
      t('analytics.copy.summary', { period: periodLabel }),
      dateRange,
      ``,
      t('analytics.copy.frequency', { done: frequency, expected: expectedWorkouts }),
      `${t('analytics.copy.tonnage', { value: Math.round(toDisplay(currentTonnage)).toLocaleString(dateLocale(lang)), unit })}${showTonnageDelta ? ` (${tonnageChange > 0 ? '+' : ''}${tonnageChange}%)` : ''}`,
      t('analytics.copy.streak', { n: streak }),
    ];
    if (periodPRs.length > 0) lines.push(t('analytics.copy.newPRs', { list: periodPRs.map(p => p.exerciseName).join(', ') }));
    if (latestWeight) lines.push(t('analytics.copy.weight', { value: Number(toDisplay(latestWeight).toFixed(1)), unit }));

    const text = lines.join('\n');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('analytics.copy.summary', { period: periodLabel }), text });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: t('analytics.toast.copied'), description: t('analytics.toast.copiedDesc') });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t('report.error'), variant: 'destructive' });
    }
  };

  // M20: raport PDF (12 miesięcy) generowany lokalnie; jsPDF+html2canvas to lazy chunk.
  const handlePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const now = new Date();
      const model = buildTrainingReportModel(workouts, now);
      const blob = await generateTrainingReportPdf(model, lang, unit, profile?.displayName || '', now);
      const file = new File([blob], `strength-save-raport-${formatLocalDate(now)}.pdf`, { type: 'application/pdf' });
      const result = await shareOrDownloadFile(file, {
        title: t('report.title'),
        onShareError: (err) => reportClientErrorWithCurrentUid({
          code: 'pdf-export-share',
          phase: 'other',
          detail: err instanceof Error ? err.message : String(err),
        }),
      });
      if (result === 'failed') {
        toast({ title: t('report.error'), variant: 'destructive' });
      }
    } catch (err) {
      // Anulowanie systemowego share to nie błąd.
      if (!(err instanceof Error && err.name === 'AbortError')) {
        toast({ title: t('report.error'), variant: 'destructive' });
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t('common.loading')}</div></div>;
  }

  return (
    <div className="space-y-6">
      <MeasurementReadError error={measurementError} onRetry={retryMeasurements} />

      <div className="flex items-center gap-2" data-testid="analytics-period-toolbar">
        <div className="grid min-w-0 flex-1 grid-cols-2 rounded-xl bg-surface-low p-1" data-testid="analytics-period-control">
          <button
            type="button"
            aria-pressed={period === 'week'}
            className={period === 'week'
              ? 'min-h-11 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              : 'min-h-11 rounded-lg px-3 text-sm font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'}
            onClick={() => updatePeriod('week')}
          >
            {t('analytics.period.week')}
          </button>
          <button
            type="button"
            aria-pressed={period === 'month'}
            className={period === 'month'
              ? 'min-h-11 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              : 'min-h-11 rounded-lg px-3 text-sm font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'}
            onClick={() => updatePeriod('month')}
          >
            {t('analytics.period.month')}
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" data-testid="analytics-actions-trigger" aria-label={t('analytics.actions')}>
              <Share2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem className="min-h-11" onSelect={() => void handlePdf()} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              {t('report.download')}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={() => setShowExportDialog(true)} data-testid="analytics-export-csv">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t('exportCsv.analyticsButton')}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={() => void handleShareSummary()} data-testid="analytics-share-summary">
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
              {copied ? t('analytics.copied') : t('analytics.shareSummary')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label={t('analytics.period.previous')} onClick={() => movePeriod(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {bounds.start.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long' })} - {bounds.end.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <Button variant="ghost" size="icon" aria-label={t('analytics.period.next')} onClick={() => movePeriod(1)} disabled={!periodWindow.canGoNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3" data-testid="analytics-summary-first-view">
        {/* A4 (X70): tint banera tygodnia = kolor wspierający B (dekoracja);
            fallback tokenu = primary, więc bez palety wygląd bez zmian. */}
        <div className="overflow-hidden rounded-[20px] bg-surface-low accent-ring" data-testid="analytics-summary-scoreboard">
          <div className="border-b border-support-b/30 bg-support-b/10 px-4 py-4" data-testid="analytics-summary-insight">
            <p className="text-sm font-medium">
              {t(period === 'week' ? 'analytics.insight.week' : 'analytics.insight.month', { done: frequency, expected: expectedWorkouts })}
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-surface-high">
          <div className="min-w-0 p-3" data-testid="analytics-summary-metric">
            <Trophy className="mb-2 h-4 w-4 text-primary" />
            <p className="font-heading text-xl font-bold leading-none">{fmtTonnage(currentTonnage)}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
              {t('analytics.stat.tonnage')}
              {/* B4 (X70): realna spacja przed deltą — sam margines sklejał
                  innerText do "Tonaż-62%" (czytniki i kopiowanie). */}
              {showTonnageDelta && (
                <span className={tonnageChange > 0 ? 'ml-1 text-fitness-success' : 'ml-1 text-destructive'}>
                  {' '}{tonnageChange > 0 ? '+' : ''}{tonnageChange}%
                </span>
              )}
            </p>
          </div>
          <div className="min-w-0 p-3" data-testid="analytics-summary-metric">
            <Flame className="mb-2 h-4 w-4 text-fitness-warning" />
            <p className="font-heading text-xl font-bold leading-none">{streak}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{t('analytics.stat.streakWeeks')}</p>
          </div>
          <div className="min-w-0 p-3" data-testid="analytics-summary-metric">
            {/* A4 (X70): trend rekordów = drugi akcent danych (support-a);
                puchar tonażu zostaje primary, płomień streaka semantyczny. */}
            <TrendingUp className="mb-2 h-4 w-4 text-support-a" />
            <p className="font-heading text-xl font-bold leading-none">{periodPRs.length}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{t('analytics.stat.newRecords')}</p>
          </div>
          </div>
        </div>
      </div>

      <>

      {/* FIX-B T5: ostatni PR (z Dashboardu) — dom rekordów to Achievements (X36: ?view=records). */}
      {latestPR && (
        <Card
          data-testid="analytics-last-pr"
          className="cursor-pointer hover:border-primary/40 transition-all duration-200 border-primary/20"
          onClick={() => navigate('/achievements?view=records')}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('dash.lastPR')}</p>
                  <p className="text-xs text-muted-foreground">
                    {localizeExerciseName(latestPR.exerciseName, lang)} · <span className="font-heading font-semibold text-foreground">{fmt(latestPR.value)}</span>
                    {' '}
                    <span className="text-muted-foreground">({formatPRDate(latestPR.date)})</span>
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Świeżość PR zostaje tu, ale dom rekordów to Achievements (Z79) — klik prowadzi tam. */}
      {periodPRs.length > 0 && (
        <Card className="cursor-pointer hover:border-primary/30 transition-all duration-200" onClick={() => navigate('/achievements?view=records')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-fitness-warning" />
                {period === 'week' ? t('analytics.newPRs.week') : t('analytics.newPRs.month')}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {periodPRs.map((pr, i) => (
                <Badge key={i} className="gap-1 bg-fitness-warning/10 text-fitness-warning border-fitness-warning/30"><Trophy className="h-3 w-3" aria-hidden /> {pr.exerciseName}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>

      {currentWorkouts.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground">{period === 'week' ? t('analytics.noWorkouts.week') : t('analytics.noWorkouts.month')}</p>
            {/* Z82: pusty okres dostaje zaproszenie zamiast samego komunikatu. */}
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              {t('empty.startFirstWorkout')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* T12: eksport CSV z wyborem zakresu — zawsze zamontowany, zamykanie
          wyłącznie przez open=false (pułapka Radix: nie unmountować w open). */}
      <ExportWorkoutsDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        uid={uid}
        cycles={cycles}
        workouts={liveWorkouts}
      />

    </div>
  );
};

// ========================
// MAIN PAGE
// ========================

// Boundary per zakładka: crash jednej zakładki nie może wygaszać całej analityki
// (Z154 — czarny ekran po powrocie z tła). Reset przez zmianę key remountuje subtree.
const TabBoundary = ({ uid, children }: { uid?: string; children: React.ReactNode }) => {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  return (
    <ErrorBoundary
      key={attempt}
      uid={uid}
      fallback={(reset, _error, code) => (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t('analytics.tabError')}{code ? ` [${code}]` : ''}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset();
              setAttempt((value) => value + 1);
            }}
          >
            {t('analytics.tabRetry')}
          </Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

const Analytics = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { uid, canUseStrava } = useCurrentUser();
  const { t } = useTranslation();
  const rawTabParam = searchParams.get('tab');
  const tabParam = rawTabParam as AnalyticsTab | null;
  const validTabs: AnalyticsTab[] = canUseStrava
    ? ['summary', 'charts', 'strava']
    : ['summary', 'charts'];
  // Bez parametru ?tab= otwieramy BIEŻĄCE podsumowanie (zgłoszenie 2026-08-13:
  // weekly digest otwierał się na "randomowym" tygodniu z wejścia z Dashboardu).
  const currentTab: AnalyticsTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'summary';

  useEffect(() => {
    if (rawTabParam !== 'details' && rawTabParam !== 'weekly') return;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('tab');
      if (rawTabParam === 'weekly') next.set('period', 'week');
      return next;
    }, { replace: true });
  }, [rawTabParam, setSearchParams]);

  return (
    <div className="space-y-4">
      {/* D-T4: osadzony w Postępach — nagłówek ma strona-matka. */}
      {!embedded && (
        <div>
          <h1 className="text-2xl font-heading font-bold uppercase tracking-tight">{t('analytics.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('analytics.subtitle')}</p>
        </div>
      )}

      {/* Samodzielna trasa zachowuje skróty. W Postępach ich rolę przejął
          główny segment Podsumowanie / Wykresy / Rekordy. */}
      {!embedded && <div className="grid grid-cols-2 gap-2" data-testid="analytics-quick-access">
        {([
          { id: 'tonnage', icon: Trophy, labelKey: 'analytics.subtab.tonnage' },
          { id: 'progression', icon: TrendingUp, labelKey: 'analytics.subtab.progression' },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`analytics-quick-${item.id}`}
            onClick={() => setSearchParams(embedded
              ? { view: 'analytics', tab: 'charts', chart: item.id }
              : { tab: 'charts', chart: item.id })}
            className="flex items-center gap-2.5 rounded-2xl bg-surface-low px-3 py-3 text-left transition-colors hover:bg-surface-high"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <item.icon className="h-4.5 w-4.5 text-primary" />
            </span>
            {/* Bez chevrona: na 393 px "Progresja" ucinała się do "PROGRES…" (QA X36). */}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-heading text-[13px] font-bold uppercase leading-tight tracking-tight">{t(item.labelKey)}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{t('analytics.quick.hint')}</span>
            </span>
          </button>
        ))}
      </div>}

      <Tabs value={currentTab} onValueChange={(value) => {
        if (value === 'strava') trackTelemetryEvent(uid, 'action_strava_opened');
        setSearchParams(embedded ? { view: 'analytics', tab: value } : { tab: value });
      }}>
        {!embedded && <TabsList className="w-full">
          <TabsTrigger value="summary" className="flex-1 text-xs min-w-0">{t('analytics.tab.summary')}</TabsTrigger>
          <TabsTrigger value="charts" className="flex-1 text-xs min-w-0">{t('analytics.tab.charts')}</TabsTrigger>
          {canUseStrava && <TabsTrigger value="strava" className="flex-1 text-xs min-w-0">Strava</TabsTrigger>}
        </TabsList>}

        <TabsContent value="summary">
          <TabBoundary uid={uid}><SummaryTab /></TabBoundary>
        </TabsContent>
        <TabsContent value="charts">
          <TabBoundary uid={uid}>
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t('common.loading')}</div></div>}>
              <ChartsTab />
            </Suspense>
          </TabBoundary>
        </TabsContent>
        {canUseStrava && (
          <TabsContent value="strava">
            <TabBoundary uid={uid}>
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">{t('common.loading')}</div></div>}>
                <StravaTab />
              </Suspense>
            </TabBoundary>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Analytics;
