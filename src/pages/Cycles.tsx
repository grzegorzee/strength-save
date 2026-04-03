import { useState } from 'react';
import { History, Dumbbell, Sparkles, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/contexts/UserContext';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { CycleCard } from '@/components/CycleCard';
import { CycleDetail } from '@/components/CycleDetail';
import type { PlanCycle } from '@/types/cycles';
import { buildActiveCyclePreview, buildCycleComparison, buildCycleRecommendation } from '@/lib/cycle-insights';
import { useNavigate } from 'react-router-dom';

const Cycles = () => {
  const navigate = useNavigate();
  const { uid } = useCurrentUser();
  const { cycles, isLoaded } = usePlanCycles(uid);
  const { workouts } = useFirebaseWorkouts(uid);
  const { plan: trainingPlan, currentWeek, planDurationWeeks, weeksRemaining, isPlanExpired } = useTrainingPlan(uid);
  const [selectedCycle, setSelectedCycle] = useState<PlanCycle | null>(null);
  const activeCycle = cycles.find(cycle => cycle.status === 'active') || null;
  const liveActiveCycle = buildActiveCyclePreview(activeCycle, workouts);
  const previousCompletedCycle = cycles.find(cycle => cycle.status === 'completed') || null;
  const comparison = liveActiveCycle ? buildCycleComparison(liveActiveCycle, previousCompletedCycle) : null;
  const recommendation = liveActiveCycle ? buildCycleRecommendation(liveActiveCycle, previousCompletedCycle) : null;
  const listedCycles = liveActiveCycle
    ? [liveActiveCycle, ...cycles.filter(cycle => cycle.id !== liveActiveCycle.id)]
    : cycles;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (selectedCycle) {
    return (
      <CycleDetail
        cycle={selectedCycle}
        onBack={() => setSelectedCycle(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Cykle treningowe</h1>
      </div>

      {liveActiveCycle && recommendation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-sm">Closeout i progres cyklu</p>
                  <Badge variant="outline">{recommendation.tone === 'success' ? 'progres' : recommendation.tone === 'warning' ? 'uwaga' : 'monitoring'}</Badge>
                </div>
                <p className="text-lg font-semibold">{recommendation.title}</p>
                <p className="text-sm text-muted-foreground">{recommendation.description}</p>
              </div>
              <Button onClick={() => navigate(`/new-plan?fromCycle=${liveActiveCycle.id}`)}>
                Domknij cykl i przygotuj kolejny
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Frekwencja</p>
                <p className="mt-1 text-2xl font-bold">{liveActiveCycle.stats.completionRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {liveActiveCycle.stats.totalWorkouts}/{liveActiveCycle.stats.expectedWorkouts || 0} treningów
                </p>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Missed</p>
                <p className="mt-1 text-2xl font-bold">{liveActiveCycle.stats.missedWorkouts || 0}</p>
                <p className="text-xs text-muted-foreground">zaplanowanych sesji nie weszło</p>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Średnio / trening</p>
                <p className="mt-1 text-2xl font-bold">{liveActiveCycle.stats.averageTonnagePerWorkout || 0}</p>
                <p className="text-xs text-muted-foreground">kg tonażu</p>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">PR-y</p>
                <p className="mt-1 text-2xl font-bold">{liveActiveCycle.stats.prs.length}</p>
                <p className="text-xs text-muted-foreground">top rekordy w cyklu</p>
              </div>
            </div>

            {comparison && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Vs poprzedni cykl</p>
                  <p className="mt-1 font-semibold">{comparison.completionRateDelta >= 0 ? '+' : ''}{comparison.completionRateDelta}% completion</p>
                </div>
                <div className="rounded-lg border bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Tonaż</p>
                  <p className="mt-1 font-semibold">{comparison.tonnageDelta >= 0 ? '+' : ''}{comparison.tonnageDelta} kg</p>
                </div>
                <div className="rounded-lg border bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">PR-y</p>
                  <p className="mt-1 font-semibold">{comparison.prDelta >= 0 ? '+' : ''}{comparison.prDelta}</p>
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
                <p className="font-semibold text-sm">Aktualny plan</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Tydzień {currentWeek} z {planDurationWeeks} · {weeksRemaining} {weeksRemaining === 1 ? 'tydzień' : 'tygodni'} pozostało
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
                  {day.dayName} — {day.focus}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {listedCycles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">Brak historii cykli.</p>
          <p className="text-xs mt-1">Twój pierwszy cykl pojawi się po wygenerowaniu nowego planu.</p>
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
              <p className="font-medium text-foreground">Brak aktywnego closeoutu cyklu</p>
              <p>Wygeneruj nowy plan, aby zacząć zbierać pełne statystyki i rekomendacje na bazie cycle closeout.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Cycles;
