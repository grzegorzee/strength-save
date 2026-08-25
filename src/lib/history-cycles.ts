import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';
import { addCalendarDays, calendarDayDiff, formatLocalDate, parseLocalDate } from '@/lib/utils';
import { calculateTonnage } from '@/lib/summary-utils';

// Fala 2 (2026-08-20), redesign Historii: cykle jako poziom nadrzędny listy.
// Czyste funkcje grupowania — bez Reacta, w pełni testowalne.
// NIEZMIENNIK KOMPLETNOŚCI: perCycle + outside == wejściowa lista
// (każda sesja dokładnie raz, nic nie ginie, nic się nie dubluje).

export interface CycleAssignment {
  perCycle: Map<string, WorkoutSession[]>;
  outside: WorkoutSession[];
}

/** Poniedziałek tygodnia zawierającego startDate cyklu (kotwica numeracji tygodni,
 *  spójna z buildExpectedPlanSessions w cycle-insights). */
const firstWeekMonday = (startDate: string): string => {
  const start = parseLocalDate(startDate);
  const dayOfWeek = start.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return addCalendarDays(startDate, -daysSinceMonday);
};

/** Numer tygodnia cyklu dla daty (1-based, clamp do 1..durationWeeks). */
export const weekNoFor = (date: string, cycle: Pick<PlanCycle, 'startDate' | 'durationWeeks'>): number => {
  const anchor = firstWeekMonday(cycle.startDate);
  const raw = Math.floor(calendarDayDiff(anchor, date) / 7) + 1;
  const maxWeek = Math.max(1, cycle.durationWeeks);
  return Math.min(Math.max(raw, 1), maxWeek);
};

// Bug 17: aktywny cykl ma endDate '' aż do archiwizacji (createActiveCycle,
// sanitizePlanCycleDoc) — traktujemy go jako zakres OTWARTY, inaczej sesje bez
// cycleId (import CSV, ad-hoc) nigdy nie wpadają do aktywnego cyklu po dacie.
const isInCycleRange = (workout: WorkoutSession, cycle: PlanCycle): boolean => {
  if (workout.date < cycle.startDate) return false;
  if (cycle.status === 'active' && !cycle.endDate) return true;
  return workout.date <= cycle.endDate;
};

/**
 * Przypisanie sesji do WIDOCZNYCH cykli:
 * 1. `workout.cycleId` wygrywa — ale tylko gdy wskazany cykl jest na liście
 *    (cycleId na ukryty/techniczny cykl => `outside`, sesja nie ginie i nie
 *    wpada fałszywie do innego cyklu po zakresie dat),
 * 2. sesja bez cycleId: dopasowanie po zakresie dat (przy nakładających się
 *    zakresach wygrywa cykl aktywny, potem pierwszy z listy),
 * 3. reszta => `outside`.
 */
export const assignWorkoutsToCycles = (
  workouts: WorkoutSession[],
  cycles: PlanCycle[],
): CycleAssignment => {
  const perCycle = new Map<string, WorkoutSession[]>();
  const outside: WorkoutSession[] = [];
  const cycleIds = new Set(cycles.map((cycle) => cycle.id));

  workouts.forEach((workout) => {
    let target: string | null = null;
    if (workout.cycleId) {
      target = cycleIds.has(workout.cycleId) ? workout.cycleId : null;
    } else {
      const candidates = cycles.filter((cycle) => isInCycleRange(workout, cycle));
      const winner = candidates.find((cycle) => cycle.status === 'active') ?? candidates[0];
      target = winner?.id ?? null;
    }
    if (target) {
      const list = perCycle.get(target);
      if (list) list.push(workout);
      else perCycle.set(target, [workout]);
    } else {
      outside.push(workout);
    }
  });

  return { perCycle, outside };
};

export interface CycleWeekGroup {
  weekNo: number;
  isCurrent: boolean;
  workouts: WorkoutSession[];
}

/**
 * Grupowanie sesji cyklu po tygodniach (malejąco: najnowszy tydzień pierwszy;
 * porządek sesji wewnątrz tygodnia = porządek wejściowy, czyli malejący po dacie).
 * `isCurrent` tylko dla cyklu aktywnego i tygodnia zawierającego dziś.
 */
export const groupCycleWorkoutsByWeek = (
  cycle: PlanCycle,
  workouts: WorkoutSession[],
  todayStr = formatLocalDate(new Date()),
): CycleWeekGroup[] => {
  const groups = new Map<number, WorkoutSession[]>();
  workouts.forEach((workout) => {
    const weekNo = weekNoFor(workout.date, cycle);
    const list = groups.get(weekNo);
    if (list) list.push(workout);
    else groups.set(weekNo, [workout]);
  });

  const currentWeekNo = cycle.status === 'active' && todayStr >= cycle.startDate
    ? weekNoFor(todayStr, cycle)
    : null;

  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([weekNo, weekWorkouts]) => ({
      weekNo,
      isCurrent: weekNo === currentWeekNo,
      workouts: weekWorkouts,
    }));
};

/**
 * Sparkline tonażu per tydzień cyklu: durationWeeks kubełków (kg), indeks 0 = tydzień 1.
 * Pusty tydzień = 0. Liczone z PRZEKAZANYCH sesji — wywołujący odpowiada za to,
 * żeby okno danych pokrywało cały cykl (windowCoversCycleStart), inaczej wykres kłamie.
 */
export const buildCycleSparkline = (
  cycle: PlanCycle,
  workouts: WorkoutSession[],
): number[] => {
  const buckets = new Array<number>(Math.max(1, cycle.durationWeeks)).fill(0);
  workouts.forEach((workout) => {
    buckets[weekNoFor(workout.date, cycle) - 1] += calculateTonnage([workout]);
  });
  return buckets;
};

/**
 * Czy załadowane okno historii pokrywa początek cyklu (a więc dane cyklu są kompletne)?
 * - brak dalszych stron (hasMore=false) => wszystko załadowane => true,
 * - najstarsza załadowana sesja <= startDate cyklu => true,
 * - inaczej false (nie renderować sparkline z częściowych danych).
 */
export const windowCoversCycleStart = (
  oldestLoadedDate: string | null,
  cycle: Pick<PlanCycle, 'startDate'>,
  hasMore: boolean,
): boolean => {
  if (!hasMore) return true;
  return oldestLoadedDate !== null && oldestLoadedDate <= cycle.startDate;
};
