import type { PlanCycle } from '@/types/cycles';

export const isCycleVisible = (cycle: PlanCycle): boolean => (
  cycle.technical !== true && cycle.hiddenFromInsights !== true
);

/**
 * Widoczny ORAZ wart pokazania w przeglądach (Dashboard/Cykle/Osiągnięcia):
 * aktywny cykl (nawet pusty, np. świeży po onboardingu) lub completed z treningami.
 * Pusty completed cykl jest ukrywany — opiera się na stats.totalWorkouts, nie na flagach.
 */
export const isCycleVisibleWithData = (cycle: PlanCycle): boolean => (
  isCycleVisible(cycle) && (cycle.status === 'active' || cycle.stats.totalWorkouts > 0)
);
