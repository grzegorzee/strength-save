import { describe, expect, it } from 'vitest';
import { computeWeeklyTargets, DEFAULT_PROGRESSION, type WeeklyTarget } from '@/lib/progression-engine';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import { vacationToAdviceWindow, type VacationMode } from '@/lib/vacation-mode';
import { buildPrefillForExercise, resolveSessionTargets } from '@/lib/session-targets';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';

// F3 (2026-09-29): push vacationEndingPush 27.09 obiecał "~85%, potem ~92%",
// a 28.09 prefill wpisał 40 kg (wyciskanie hantli skos, poprzednio 40x8).
// Root cause: rampa (reducedModeAdviceFactor) trafiała tylko do nextAdvice,
// prefill brał weeklyTargets, które deload znały wyłącznie z deloadDecisions.
// Niezmiennik: to, co obiecuje komunikat (push, porada), wpisuje prefill.

const EX = { id: 'tpl-ex-3', name: 'Wyciskanie hantli na ławce skośnej', sets: '3 x 8', instructions: [] };
const DAY: TrainingDay = { id: 'd1', dayName: 'Poniedziałek', weekday: 'monday', focus: 'Push', exercises: [EX] };
// Dane właściciela: urlop 22-27.09, aktywność "none", cykl wydłużony o tydzień.
const VACATION: VacationMode = { startDate: '2026-09-22', endDate: '2026-09-27', activity: 'none', extendedWeeks: 1 };
const WINDOW = vacationToAdviceWindow(VACATION);

const session = (date: string, weight: number, reps = 8): WorkoutSession => ({
  id: `w-${date}`,
  userId: 'u1',
  dayId: 'd1',
  date,
  completed: true,
  exercises: [{
    exerciseId: EX.id,
    name: EX.name,
    sets: [
      { reps, weight, completed: true },
      { reps, weight, completed: true },
      { reps, weight, completed: true },
    ],
  }],
});

const PRE_VACATION = session('2026-09-21', 40);

const targetFor = (workouts: WorkoutSession[], sessionDateISO: string, opts: { week?: number; deloadApplied?: boolean; window?: typeof WINDOW } = {}): WeeklyTarget =>
  computeWeeklyTargets([DAY], workouts, opts.week ?? 4, DEFAULT_PROGRESSION, {
    deloadApplied: opts.deloadApplied,
    reducedMode: opts.window === undefined ? WINDOW : opts.window,
    sessionDateISO,
  })[DAY.id][EX.id];

const adviceFor = (workouts: WorkoutSession[], todayISO: string) =>
  getNextSetAdvice(workouts, EX.id, EX.sets, 0, { todayISO, reducedMode: WINDOW, exerciseName: EX.name });

describe('F3: rampa po urlopie w celu tygodnia (prefill)', () => {
  it('pierwsza sesja po urlopie: 40x8 -> 34 kg (85%), kind deload, ta sama liczba co porada', () => {
    const target = targetFor([PRE_VACATION], '2026-09-28');
    expect(target.kind).toBe('deload');
    expect(target.targetWeight).toBe(34);
    expect(target.reasonKey).toBe('progression.reason.modeRamp');
    expect(adviceFor([PRE_VACATION], '2026-09-28')?.targetWeight).toBe(target.targetWeight);
  });

  it('druga sesja po urlopie: 0.92 x 40 = 36.8 -> 37 kg (baza sprzed urlopu, nie od 34)', () => {
    const workouts = [PRE_VACATION, session('2026-09-28', 34)];
    const target = targetFor(workouts, '2026-10-01');
    expect(target.kind).toBe('deload');
    expect(target.targetWeight).toBe(37);
    expect(adviceFor(workouts, '2026-10-01')?.targetWeight).toBe(37);
  });

  it('trzecia sesja: rampa domknięta, normalna progresja od ostatniej sesji', () => {
    const workouts = [PRE_VACATION, session('2026-09-28', 34), session('2026-10-01', 37)];
    const target = targetFor(workouts, '2026-10-05');
    expect(target.kind).toBe('progress');
    expect(target.reasonKey).toBe('progression.reason.progress');
    expect(target.targetWeight).toBeGreaterThan(37);
  });

  it('niezmiennik: bez okna urlopu ta sama historia daje zwykłą progresję (brak deloadu)', () => {
    const target = targetFor([PRE_VACATION], '2026-09-28', { window: null });
    expect(target.kind).toBe('progress');
    expect(target.targetWeight).toBeGreaterThan(40);
  });

  it('niezmiennik: bez daty sesji (stare wywołania, raport tygodnia) zachowanie bez zmian', () => {
    const target = computeWeeklyTargets([DAY], [PRE_VACATION], 4, DEFAULT_PROGRESSION, { reducedMode: WINDOW })[DAY.id][EX.id];
    expect(target.kind).toBe('progress');
  });

  it('tydzień 5 (programowy deload) tuż po urlopie: bez podwójnego deloadu (34, nie 0.9 x 34)', () => {
    const scheduled = targetFor([PRE_VACATION], '2026-09-28', { week: 5 });
    const applied = targetFor([PRE_VACATION], '2026-09-28', { week: 5, deloadApplied: true });
    expect(scheduled.targetWeight).toBe(34);
    expect(applied.targetWeight).toBe(34);
    expect(applied.kind).toBe('deload');
  });

  it('w oknie trybu lżejszego: 80% bazy sprzed startu trybu', () => {
    const mode = { startDate: '2026-09-22', endDate: '2026-09-30', level: 'lighter' as const };
    const target = computeWeeklyTargets([DAY], [PRE_VACATION], 4, DEFAULT_PROGRESSION, {
      reducedMode: mode,
      sessionDateISO: '2026-09-24',
    })[DAY.id][EX.id];
    expect(target.kind).toBe('deload');
    expect(target.targetWeight).toBe(32);
    expect(target.reasonKey).toBe('progression.reason.modeActive');
  });

  it('comeback po >= 14 dniach przerwy (bez trybu): cel = porada (-10%), nie progresja', () => {
    const target = targetFor([PRE_VACATION], '2026-10-12', { window: null });
    const advice = getNextSetAdvice([PRE_VACATION], EX.id, EX.sets, 0, { todayISO: '2026-10-12', exerciseName: EX.name });
    expect(advice?.kind).toBe('deload');
    expect(target.kind).toBe('deload');
    expect(target.targetWeight).toBe(advice?.targetWeight);
    expect(target.targetWeight).toBe(36);
    expect(target.reasonKey).toBe('progression.reason.comeback');
  });
});

describe('F3: cele sesji w WorkoutDay (resolveSessionTargets + prefill startu)', () => {
  const base = {
    day: DAY,
    progression: DEFAULT_PROGRESSION,
    week: 4,
    deloadApplied: false,
    isAdhocDay: false,
    reducedMode: WINDOW,
    trackingByName: { [EX.name]: 'weight_reps' as const },
  };

  it('prefill startu 28.09 po urlopie wpisuje 34 kg x 8 (nie 40)', () => {
    const targets = resolveSessionTargets({ ...base, workouts: [PRE_VACATION], sessionDateISO: '2026-09-28' });
    const sets = buildPrefillForExercise(EX, targets?.[EX.id], PRE_VACATION.exercises[0].sets, false);
    expect(sets).toHaveLength(3);
    expect(sets.map((s) => s.weight)).toEqual([34, 34, 34]);
    expect(sets.map((s) => s.reps)).toEqual([8, 8, 8]);
  });

  it('silnik progresji wyłączony: rampa i tak trafia do prefillu (komunikat obiecał ~85%)', () => {
    const targets = resolveSessionTargets({ ...base, progression: null, workouts: [PRE_VACATION], sessionDateISO: '2026-09-28' });
    expect(targets?.[EX.id]?.targetWeight).toBe(34);
    const sets = buildPrefillForExercise(EX, targets?.[EX.id], PRE_VACATION.exercises[0].sets, false);
    expect(sets.map((s) => s.weight)).toEqual([34, 34, 34]);
  });

  it('silnik wyłączony i brak trybu: zero celów, prefill = poprzednia sesja (niezmiennik)', () => {
    const targets = resolveSessionTargets({ ...base, progression: null, reducedMode: null, workouts: [PRE_VACATION], sessionDateISO: '2026-09-28' });
    expect(targets).toBeNull();
    const sets = buildPrefillForExercise(EX, undefined, PRE_VACATION.exercises[0].sets, false);
    expect(sets.map((s) => s.weight)).toEqual([40, 40, 40]);
  });
});
