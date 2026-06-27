import type { PlanCycle } from '@/types/cycles';

export const isCycleVisible = (cycle: PlanCycle): boolean => (
  cycle.technical !== true && cycle.hiddenFromInsights !== true
);
