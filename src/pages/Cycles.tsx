import { useState, useEffect } from 'react';
import { History, Dumbbell, Sparkles, TriangleAlert, RefreshCw, Loader2, CalendarX2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCurrentUser } from '@/contexts/UserContext';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { CycleCard } from '@/components/CycleCard';
import { CycleDetail } from '@/components/CycleDetail';
import type { PlanCycle } from '@/types/cycles';
import { buildActiveCyclePreview, buildCycleComparison, buildCycleRecommendation, withLiveCompletedStats } from '@/lib/cycle-insights';
import { startCycleWithPlan } from '@/lib/cycle-actions';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { formatLocalDate } from '@/lib/utils';
import { dateLocale } from '@/i18n';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';
import { isCycleVisible, isCycleVisibleWithData } from '@/lib/cycle-visibility';
import { workoutDraftDb } from '@/lib/workout-draft-db';
import { workoutSyncQueue } from '@/lib/workout-sync-queue';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';

const Cycles = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { unit, toDisplay } = useUnit();
  const { uid } = useCurrentUser();
  const { cycles, isLoaded, createActiveCycle, deleteCycle, archiveCurrentPlan } = usePlanCycles(uid);
  const { workouts, backfillHistoricalWorkouts } = useFirebaseWorkouts(uid);
  const { toast } = useToast();
  const { plan: trainingPlan, planStartDate, currentWeek, planDurationWeeks, weeksRemaining, isPlanExpired, savePlan } = useTrainingPlan(uid);
  const [selectedCycle, setSelectedCycle] = useState<PlanCycle | null>(null);
  const [isRepeating, setIsRepeating] = useState(false);
  const [endPlanOpen, setEndPlanOpen] = useState(false);
  const [isEndingPlan, setIsEndingPlan] = useState(false);
  const visibleCycles = cycles
    .map(cycle => cycle.status === 'completed' ? withLiveCompletedStats(cycle, workouts) : cycle)
    .filter(isCycleVisible);
  const activeCycle = visibleCycles.find(cycle => cycle.status === 'active') || null;
  const [hasPendingFinalSync, setHasPendingFinalSync] = useState(false);

  const handleRepeatPlan = async () => {
    const days = activeCycle?.days?.length ? activeCycle.days : trainingPlan;
    if (days.length === 0) return;
    setIsRepeating(true);
    const res = await startCycleWithPlan(days, activeCycle?.durationWeeks ?? planDurationWeeks, {
      uid, currentPlan: trainingPlan, planStartDate, planDurationWeeks, workouts,
      archiveCurrentPlan, savePlan, createActiveCycle, backfillHistoricalWorkouts,
    });
    setIsRepeating(false);
    if (res.success) {
      toast({ title: t('cycles.repeatStarted') });
      navigate('/');
    } else {
      toast({ title: t('cycles.repeatFailed'), variant: 'destructive' });
    }
  };

  const handleEndPlan = async () => {
    if (!planStartDate || trainingPlan.length === 0) return;
    setIsEndingPlan(true);
    const archivedId = await archiveCurrentPlan(trainingPlan, planDurationWeeks, planStartDate, workouts);
    if (archivedId) {
      const archivedCycle = cycles.find(cycle => cycle.id === archivedId) ?? {
        id: archivedId,
        userId: uid,
        days: trainingPlan,
        durationWeeks: planDurationWeeks,
        startDate: planStartDate,
        endDate: formatLocalDate(new Date()),
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
        stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
      };
      await backfillHistoricalWorkouts([archivedCycle]);
      toast({ title: t('cycles.endPlanDone') });
      navigate(`/new-plan?fromCycle=${archivedId}`);
    } else {
      toast({ title: t('cycles.endPlanFailed'), variant: 'destructive' });
    }
    setIsEndingPlan(false);
    setEndPlanOpen(false);
  };

  // Auto-repair: dotwórz dokument cyklu, jeśli aktywny plan istnieje bez niego.
  //
  // Root cause fantomowych cykli: createActiveCycle jest asynchroniczne, a guard
  // oparty na ref żył tylko w obrębie jednego mountu. W oknie między wywołaniem a
  // aktualizacją snapshotu `cycles` remount (nawigacja tam/z powrotem) resetował ref,
  // activeCycle był wciąż null → powstawał duplikat. Powtórzone → wiele cykli dla
  // tego samego planu (te, które naprawia mergeContinuousCycles).
  //
  // Fix: (1) nie twórz, jeśli ISTNIEJE jakikolwiek cykl dla tego planStartDate
  // (aktywny lub już zarchiwizowany), (2) trwały guard per-plan w localStorage
  // zamiast ref — przeżywa remount/odświeżenie w oknie asynchronicznym.
  useEffect(() => {
    if (!isLoaded || activeCycle || !planStartDate || trainingPlan.length === 0 || isPlanExpired) return;
    // Plan ma już swój cykl (np. zarchiwizowany po wygaśnięciu) — nie dubluj.
    if (cycles.some(c => c.startDate === planStartDate)) return;
    const repairKey = `cycle-repair:${uid}:${planStartDate}`;
    try {
      if (localStorage.getItem(repairKey)) return;
      localStorage.setItem(repairKey, '1');
    } catch { /* localStorage niedostępny — kontynuuj, guard startDate wystarcza */ }
    console.log('[Cycles] Auto-repair: creating missing active cycle for existing plan');
    createActiveCycle(trainingPlan, planDurationWeeks, planStartDate);
  }, [isLoaded, activeCycle, planStartDate, trainingPlan, isPlanExpired, planDurationWeeks, createActiveCycle, cycles, uid]);

  useEffect(() => {
    let cancelled = false;
    const loadSyncState = async () => {
      const drafts = await workoutDraftDb.listDrafts(uid);
      const pending = drafts.some((draft) => draft.finalSyncPending)
        || workoutSyncQueue.list(uid).some((entry) => entry.finalSyncPending);
      if (!cancelled) setHasPendingFinalSync(pending);
    };
    void loadSyncState();
    window.addEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, loadSyncState);
    return () => {
      cancelled = true;
      window.removeEventListener(WORKOUT_SYNC_STATE_CHANGED_EVENT, loadSyncState);
    };
  }, [uid]);
  const liveActiveCycle = buildActiveCyclePreview(activeCycle, workouts);
  const visibleStoredCycles = visibleCycles.filter(isCycleVisibleWithData);
  const previousCompletedCycle = visibleStoredCycles.find(cycle => cycle.status === 'completed') || null;
  const comparison = liveActiveCycle ? buildCycleComparison(liveActiveCycle, previousCompletedCycle) : null;
  const recommendation = liveActiveCycle
    ? buildCycleRecommendation(liveActiveCycle, previousCompletedCycle, new Date(), lang, { hasPendingFinalSync })
    : null;
  const listedCycles = liveActiveCycle
    ? [liveActiveCycle, ...visibleStoredCycles.filter(cycle => cycle.id !== liveActiveCycle.id)]
    : visibleStoredCycles;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (selectedCycle) {
    return (
      <CycleDetail
        cycle={selectedCycle}
        onBack={() => setSelectedCycle(null)}
        onDelete={async () => {
          const ok = await deleteCycle(selectedCycle.id, workouts);
          toast(ok
            ? { title: t('cycles.deleted') }
            : { title: t('cycles.deleteFailed'), variant: 'destructive' });
          if (ok) setSelectedCycle(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-heading font-bold uppercase italic tracking-tight">{t('cycles.title')}</h1>
      </div>

      {liveActiveCycle && recommendation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-sm">{t('cycles.closeoutProgress')}</p>
                  <Badge variant="outline">{recommendation.tone === 'success' ? t('cycles.tone.progress') : recommendation.tone === 'warning' ? t('cycles.tone.warning') : t('cycles.tone.monitoring')}</Badge>
                </div>
                <p className="text-lg font-semibold">{recommendation.title}</p>
                <p className="text-sm text-muted-foreground">{recommendation.description}</p>
              </div>
              {recommendation.canCloseout && (
                <div className="flex flex-col gap-2 shrink-0">
                  <Button onClick={handleRepeatPlan} disabled={isRepeating}>
                    {isRepeating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {t('cycles.repeatPlan')}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/new-plan?fromCycle=${liveActiveCycle.id}`)}>
                    {t('cycles.changePlan')}
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cycles.attendance')}</p>
                <p className="mt-1 text-2xl font-bold">{liveActiveCycle.stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {t('cycles.workoutsCount', { done: liveActiveCycle.stats.totalWorkouts, expected: liveActiveCycle.stats.expectedWorkouts || 0 })}
                </p>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cycles.missed')}</p>
                <p className="mt-1 text-2xl font-bold">{liveActiveCycle.stats.missedWorkouts || 0}</p>
                <p className="text-xs text-muted-foreground">{t('cycles.missedSessionsHint')}</p>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cycles.avgPerWorkout')}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{Math.round(toDisplay(liveActiveCycle.stats.averageTonnagePerWorkout || 0)).toLocaleString(dateLocale(lang))}</p>
                <p className="text-xs text-muted-foreground">{t('cycles.kgTonnage', { unit })}</p>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cycles.prs')}</p>
                <p className="mt-1 text-2xl font-bold">{liveActiveCycle.stats.prs.length}</p>
                <p className="text-xs text-muted-foreground">{t('cycles.topPrsHint')}</p>
              </div>
            </div>

            {comparison && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cycles.vsPrevious')}</p>
                  <p className="mt-1 font-heading font-bold tabular-nums">{comparison.completionRateDelta >= 0 ? '+' : '−'}{Math.abs(comparison.completionRateDelta)}% {t('cycles.completion')}</p>
                </div>
                <div className="rounded-lg border bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cycles.tonnagePerWorkout')}</p>
                  <p className="mt-1 font-heading font-bold tabular-nums">{comparison.tonnageDelta >= 0 ? '+' : '−'}{Math.abs(Math.round(toDisplay(comparison.tonnageDelta))).toLocaleString(dateLocale(lang))} {unit}</p>
                </div>
                <div className="rounded-lg border bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('cycles.prs')}</p>
                  <p className="mt-1 font-heading font-bold tabular-nums">{comparison.prDelta >= 0 ? '+' : '−'}{Math.abs(comparison.prDelta)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current active plan summary */}
      {!isPlanExpired && trainingPlan.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm">{t('cycles.currentPlan')}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('cycles.weekProgress', { current: currentWeek, total: planDurationWeeks })} · {t('cycles.weeksRemaining', { n: weeksRemaining })}
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (currentWeek / planDurationWeeks) * 100)}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {trainingPlan.map((day) => (
                <span key={day.id} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {localizeDayName(day.dayName, lang)} — {localizeFocus(day.focus, lang)}
                </span>
              ))}
            </div>
            {activeCycle && (
              <Button variant="outline" className="w-full" onClick={() => setEndPlanOpen(true)}>
                <CalendarX2 className="h-4 w-4 mr-2" />
                {t('cycles.endPlan')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={endPlanOpen} onOpenChange={setEndPlanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cycles.endPlanConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cycles.endPlanConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEndingPlan}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleEndPlan(); }} disabled={isEndingPlan}>
              {isEndingPlan ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarX2 className="h-4 w-4 mr-2" />}
              {t('cycles.endPlanConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {listedCycles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">{t('cycles.emptyTitle')}</p>
          <p className="text-xs mt-1">{t('cycles.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listedCycles.map(cycle => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              onClick={() => setSelectedCycle(cycle)}
            />
          ))}
        </div>
      )}

      {!liveActiveCycle && (
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-start gap-3 text-sm text-muted-foreground">
            <TriangleAlert className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">{t('cycles.noCloseoutTitle')}</p>
              <p>{t('cycles.noCloseoutHint')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Cycles;
