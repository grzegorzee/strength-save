import { useState, useEffect } from 'react';
import { History, Dumbbell, Sparkles, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/contexts/UserContext';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { useToast } from '@/hooks/use-toast';
import { CycleCard } from '@/components/CycleCard';
import { CycleDetail } from '@/components/CycleDetail';
import type { PlanCycle } from '@/types/cycles';
import { buildActiveCyclePreview, buildCycleComparison, buildCycleRecommendation } from '@/lib/cycle-insights';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { localizeDayName, localizeFocus } from '@/lib/plan-i18n';

const Cycles = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { uid } = useCurrentUser();
  const { cycles, isLoaded, createActiveCycle, deleteCycle } = usePlanCycles(uid);
  const { workouts } = useFirebaseWorkouts(uid);
  const { toast } = useToast();
  const { plan: trainingPlan, planStartDate, currentWeek, planDurationWeeks, weeksRemaining, isPlanExpired } = useTrainingPlan(uid);
  const [selectedCycle, setSelectedCycle] = useState<PlanCycle | null>(null);
  const activeCycle = cycles.find(cycle => cycle.status === 'active') || null;

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
  const liveActiveCycle = buildActiveCyclePreview(activeCycle, workouts);
  const visibleStoredCycles = cycles.filter(cycle => cycle.status === 'active' || cycle.stats.totalWorkouts > 0);
  const previousCompletedCycle = visibleStoredCycles.find(cycle => cycle.status === 'completed') || null;
  const comparison = liveActiveCycle ? buildCycleComparison(liveActiveCycle, previousCompletedCycle) : null;
  const recommendation = liveActiveCycle ? buildCycleRecommendation(liveActiveCycle, previousCompletedCycle, new Date(), lang) : null;
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
        <h1 className="text-xl font-heading font-bold uppercase tracking-tight">{t('cycles.title')}</h1>
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
              <Button onClick={() => navigate(`/new-plan?fromCycle=${liveActiveCycle.id}`)}>
                {t('cycles.closeAndPrepare')}
              </Button>
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
                <p className="mt-1 text-2xl font-bold">{liveActiveCycle.stats.averageTonnagePerWorkout || 0}</p>
                <p className="text-xs text-muted-foreground">{t('cycles.kgTonnage')}</p>
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
                  <p className="mt-1 font-heading font-bold tabular-nums">{comparison.tonnageDelta >= 0 ? '+' : '−'}{Math.abs(Math.round(comparison.tonnageDelta)).toLocaleString(dateLocale(lang))} kg</p>
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
              {trainingPlan.map((day, i) => (
                <span key={day.id} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {localizeDayName(day.dayName, lang)} — {localizeFocus(day.focus, lang)}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
