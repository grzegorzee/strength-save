import { useCallback, useRef, useState } from 'react';
import { fetchWorkoutRange } from '@/lib/workout-read-store';
import type { PlanCycle } from '@/types/cycles';
import type { WorkoutSession } from '@/types';

// Fala 2 (2026-08-20): lazy dociąganie sesji PRZESZŁEGO cyklu, gdy paginowane
// okno historii nie pokrywa jego zakresu. Wynik cache'owany per cycleId.
// Błąd => status 'error' z wyjściem (retry) — zasada CLAUDE.md #6.

export type CycleSessionsStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface CycleSessionsEntry {
  status: CycleSessionsStatus;
  sessions: WorkoutSession[];
}

export const useCycleSessions = (uid: string) => {
  const [entries, setEntries] = useState<Record<string, CycleSessionsEntry>>({});
  const inFlight = useRef(new Set<string>());
  const done = useRef(new Set<string>());

  const load = useCallback((cycle: PlanCycle, options: { force?: boolean } = {}) => {
    const cycleId = cycle.id;
    if (inFlight.current.has(cycleId)) return;
    if (!options.force && done.current.has(cycleId)) return;

    inFlight.current.add(cycleId);
    setEntries((prev) => ({
      ...prev,
      [cycleId]: { status: 'loading', sessions: prev[cycleId]?.sessions ?? [] },
    }));
    void fetchWorkoutRange(uid, { fromDate: cycle.startDate, toDate: cycle.endDate })
      .then((sessions) => {
        done.current.add(cycleId);
        setEntries((prev) => ({ ...prev, [cycleId]: { status: 'loaded', sessions } }));
      })
      .catch(() => {
        // Fallback: strona dalej pokazuje sesje z okna; user ma przycisk retry.
        setEntries((prev) => ({
          ...prev,
          [cycleId]: { status: 'error', sessions: prev[cycleId]?.sessions ?? [] },
        }));
      })
      .finally(() => {
        inFlight.current.delete(cycleId);
      });
  }, [uid]);

  return { entries, load };
};
