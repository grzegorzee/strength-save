// Z100: czyste algorytmy napraw kont (server-side, Admin SDK wykonuje operacje).
// ZERO dostępu do Firestore w tym pliku. Parytet z klientem pilnowany testami
// na wspólnych fixtures (src/test/repairs-parity.test.ts vs algorithms.test.ts).

export interface RepairOperation {
  collection: string;
  docId: string;
  op: 'update' | 'delete';
  before: Record<string, unknown>;
  after: Record<string, unknown> | null;
}

export interface RepairWorkoutDoc {
  id: string;
  date: string;
  dayId: string;
  completed?: boolean;
  cycleId?: string;
  dayName?: string;
  dayFocus?: string;
  exercises?: Array<{ exerciseId: string; name?: string; sets?: unknown[] }>;
  [key: string]: unknown;
}

export interface RepairCycleDoc {
  id: string;
  startDate: string;
  endDate?: string;
  status: string;
  durationWeeks?: number;
  days?: Array<{
    id: string;
    dayName?: string;
    focus?: string;
    exercises?: Array<{ id: string; name?: string }>;
  }>;
  templateId?: string;
  [key: string]: unknown;
}

export interface RepairUserDoc {
  onboardingCompleted?: boolean;
  [key: string]: unknown;
}

// ── dedupeWorkouts: duplikaty (date+dayId) — zostaje najlepszy, reszta delete ──
export const dedupeWorkoutsOperations = (workouts: RepairWorkoutDoc[]): RepairOperation[] => {
  const grouped = new Map<string, RepairWorkoutDoc[]>();
  for (const workout of workouts) {
    const key = `${workout.date}-${workout.dayId}`;
    const existing = grouped.get(key) ?? [];
    existing.push(workout);
    grouped.set(key, existing);
  }

  const operations: RepairOperation[] = [];
  for (const group of grouped.values()) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort((a, b) => {
      const aHasExercises = (a.exercises?.length ?? 0) > 0;
      const bHasExercises = (b.exercises?.length ?? 0) > 0;
      if (aHasExercises && !bHasExercises) return -1;
      if (!aHasExercises && bHasExercises) return 1;
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      return b.id.localeCompare(a.id);
    });
    for (const workout of sorted.slice(1)) {
      operations.push({ collection: 'workouts', docId: workout.id, op: 'delete', before: workout, after: null });
    }
  }
  return operations;
};

// ── repairHistory: brakujący cycleId + etykiety dnia ze snapshotu cyklu ──
// Zakres server-side ŚWIADOMIE węższy niż kliencki backfill (bez przepisywania
// serii/nazw ćwiczeń) — dopisujemy wyłącznie brakujące pola opisowe.
export const repairHistoryOperations = (
  workouts: RepairWorkoutDoc[],
  cycles: RepairCycleDoc[],
): RepairOperation[] => {
  const operations: RepairOperation[] = [];
  for (const workout of workouts) {
    const matchedCycle = workout.cycleId
      ? cycles.find((cycle) => cycle.id === workout.cycleId)
      : cycles.find((cycle) => workout.date >= cycle.startDate && (!cycle.endDate || workout.date <= cycle.endDate));

    const update: Record<string, unknown> = {};
    if (!workout.cycleId && matchedCycle) update.cycleId = matchedCycle.id;
    if (!workout.dayName && matchedCycle) {
      const day = matchedCycle.days?.find((candidate) => candidate.id === workout.dayId);
      if (day?.dayName && day.dayName !== workout.dayId) {
        update.dayName = day.dayName;
        if (day.focus) update.dayFocus = day.focus;
      }
    }
    if (Object.keys(update).length === 0) continue;
    operations.push({
      collection: 'workouts',
      docId: workout.id,
      op: 'update',
      before: workout,
      after: update,
    });
  }
  return operations;
};

// ── mergeCycles: ciągłe cykle tego samego planu w jeden ──
// Kryteria grupowania identyczne z klientem (shouldMergeContinuousCycles).
const calendarDayDiff = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
};

const normalizedExerciseKey = (name?: string): string => (name ?? '').trim().toLowerCase();

const planTemplateHash = (days: RepairCycleDoc['days']): string =>
  (days ?? [])
    .map((day) => [
      (day as { weekday?: string }).weekday ?? '',
      normalizedExerciseKey(day.focus),
      ...(day.exercises ?? []).map((ex) => `${normalizedExerciseKey(ex.name)}:${String((ex as { sets?: string }).sets ?? '').trim()}`),
    ].join('|'))
    .join('||');

const planExerciseOverlap = (left: RepairCycleDoc['days'], right: RepairCycleDoc['days']): number => {
  const leftNames = new Set((left ?? []).flatMap((day) => (day.exercises ?? []).map((ex) => normalizedExerciseKey(ex.name))));
  const rightNames = new Set((right ?? []).flatMap((day) => (day.exercises ?? []).map((ex) => normalizedExerciseKey(ex.name))));
  if (leftNames.size === 0 || rightNames.size === 0) return 0;
  let common = 0;
  leftNames.forEach((name) => {
    if (rightNames.has(name)) common += 1;
  });
  return common / Math.max(leftNames.size, rightNames.size);
};

export const shouldMergeContinuousCycles = (previous: RepairCycleDoc, next: RepairCycleDoc): boolean => {
  if (!previous.endDate || !next.startDate || next.startDate < previous.endDate) return false;
  if (calendarDayDiff(previous.endDate, next.startDate) > 14) return false;
  if (previous.templateId && next.templateId) return previous.templateId === next.templateId;
  if (planTemplateHash(previous.days) === planTemplateHash(next.days)) return true;
  return planExerciseOverlap(previous.days, next.days) >= 0.7;
};

export const mergeCyclesOperations = (
  cycles: RepairCycleDoc[],
  workouts: RepairWorkoutDoc[],
): RepairOperation[] => {
  const completed = cycles
    .filter((cycle) => cycle.status === 'completed' && cycle.startDate && cycle.endDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const groups: RepairCycleDoc[][] = [];
  for (const cycle of completed) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    if (last && prev && shouldMergeContinuousCycles(prev, cycle)) {
      last.push(cycle);
    } else {
      groups.push([cycle]);
    }
  }

  const operations: RepairOperation[] = [];
  for (const group of groups) {
    if (group.length < 2) continue;
    const primary = group[0];
    const rest = group.slice(1);
    const restIds = new Set(rest.map((cycle) => cycle.id));
    const newStart = primary.startDate;
    const newEnd = group[group.length - 1].endDate ?? primary.endDate ?? primary.startDate;
    const newDuration = Math.max(1, Math.ceil((calendarDayDiff(newStart, newEnd) + 1) / 7));

    for (const workout of workouts) {
      if (workout.cycleId && restIds.has(workout.cycleId)) {
        operations.push({
          collection: 'workouts',
          docId: workout.id,
          op: 'update',
          before: workout,
          after: { cycleId: primary.id },
        });
      }
    }
    operations.push({
      collection: 'plan_cycles',
      docId: primary.id,
      op: 'update',
      before: primary,
      after: { startDate: newStart, endDate: newEnd, durationWeeks: newDuration },
    });
    for (const cycle of rest) {
      operations.push({ collection: 'plan_cycles', docId: cycle.id, op: 'delete', before: cycle, after: null });
    }
  }
  return operations;
};

// ── resetOnboarding: wymuś kreator od nowa + zamknij aktywne cykle ──
export const resetOnboardingOperations = (
  userId: string,
  userDoc: RepairUserDoc,
  cycles: RepairCycleDoc[],
  today: string,
): RepairOperation[] => {
  const operations: RepairOperation[] = [];
  for (const cycle of cycles) {
    if (cycle.status !== 'active') continue;
    operations.push({
      collection: 'plan_cycles',
      docId: cycle.id,
      op: 'update',
      before: cycle,
      after: { status: 'completed', endDate: today },
    });
  }
  operations.push({
    collection: 'users',
    docId: userId,
    op: 'update',
    before: userDoc,
    after: { onboardingCompleted: false, 'onboarding.state': 'not_started' },
  });
  return operations;
};

export type RepairAction = 'mergeCycles' | 'repairHistory' | 'dedupeWorkouts' | 'resetOnboarding';
