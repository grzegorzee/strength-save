import { useState } from 'react';
import { History } from 'lucide-react';
import { useCurrentUser } from '@/contexts/UserContext';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { CycleCard } from '@/components/CycleCard';
import { CycleDetail } from '@/components/CycleDetail';
import type { PlanCycle } from '@/types/cycles';

const Cycles = () => {
  const { uid } = useCurrentUser();
  const { cycles, isLoaded } = usePlanCycles(uid);
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
