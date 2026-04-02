import { useState } from 'react';
import { History, Dumbbell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/contexts/UserContext';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { CycleCard } from '@/components/CycleCard';
import { CycleDetail } from '@/components/CycleDetail';
import type { PlanCycle } from '@/types/cycles';

const Cycles = () => {
  const { uid } = useCurrentUser();
  const { cycles, isLoaded } = usePlanCycles(uid);
  const { plan: trainingPlan, currentWeek, planDurationWeeks, weeksRemaining, isPlanExpired } = useTrainingPlan(uid);
  const [selectedCycle, setSelectedCycle] = useState<PlanCycle | null>(null);

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

      {cycles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">Brak historii cykli.</p>
          <p className="text-xs mt-1">Twój pierwszy cykl pojawi się po wygenerowaniu nowego planu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map(cycle => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              onClick={() => setSelectedCycle(cycle)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Cycles;
