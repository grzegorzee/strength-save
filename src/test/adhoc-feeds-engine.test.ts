import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { matchesExerciseEntry } from '@/lib/adhoc-workout';
import { getExerciseHistory, getTrackedExerciseHistory } from '@/lib/exercise-progression';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import { computeWeeklyTargets, DEFAULT_PROGRESSION, lastSessionRatedTooHeavy } from '@/lib/progression-engine';
import { detectNewPRs, getExerciseBest1RM } from '@/lib/pr-utils';
import { getRzaAdvice } from '@/lib/rza-progression';
import { reducedModeAdviceFactor } from '@/lib/reduced-mode';

// Krok 16 (Runna p.1, spec C5): serie z szybkiego treningu (ad-hoc) muszą zasilać
// historię ciężarów per ćwiczenie i propozycje silnika. Ćwiczenie ad-hoc ma
// syntetyczne id `adhoc-ex-<slug>` + snapshot nazwy — match wyłącznie po
// exerciseId gubił te sesje. Kontrakt: wpis ad-hoc liczy się do ćwiczenia
// planowego, gdy snapshot nazwy jest identyczny. Wpisy NIE-ad-hoc nadal
// wyłącznie po id (stare zachowanie nietknięte).

const NAME = 'Wyciskanie sztangi leżąc';

const planSession = (id: string, date: string, weight: number, reps: number): WorkoutSession => ({
  id, userId: 'u1', dayId: 'd1', date, completed: true,
  exercises: [{ exerciseId: 'bench', name: NAME, sets: [{ reps, weight, completed: true }] }],
});

const adhocSession = (id: string, date: string, weight: number, reps: number): WorkoutSession => ({
  id, userId: 'u1', dayId: `adhoc-${date}-123`, date, completed: true,
  exercises: [{ exerciseId: 'adhoc-ex-wyciskanie-sztangi-lezac', name: NAME, sets: [{ reps, weight, completed: true }] }],
});

describe('matchesExerciseEntry', () => {
  it('trafia po id niezależnie od nazwy', () => {
    expect(matchesExerciseEntry({ exerciseId: 'bench', name: 'cokolwiek' }, 'bench', NAME)).toBe(true);
  });

  it('wpis ad-hoc trafia po identycznym snapshocie nazwy', () => {
    expect(matchesExerciseEntry({ exerciseId: 'adhoc-ex-w', name: NAME }, 'bench', NAME)).toBe(true);
  });

  it('wpis NIE-ad-hoc o tej samej nazwie ale innym id NIE trafia (tylko ad-hoc po nazwie)', () => {
    expect(matchesExerciseEntry({ exerciseId: 'bench-cycle2', name: NAME }, 'bench', NAME)).toBe(false);
  });

  it('symetria: szukane ćwiczenie AD-HOC trafia w planowy wpis po nazwie', () => {
    expect(matchesExerciseEntry({ exerciseId: 'bench', name: NAME }, 'adhoc-ex-wyciskanie', NAME)).toBe(true);
  });

  it('bez podanej nazwy zachowanie jak dziś: wyłącznie po id', () => {
    expect(matchesExerciseEntry({ exerciseId: 'adhoc-ex-w', name: NAME }, 'bench')).toBe(false);
  });
});

describe('historia ciężarów per ćwiczenie widzi ad-hoc', () => {
  it('getExerciseHistory z nazwą dokłada punkt z sesji ad-hoc', () => {
    const ws = [planSession('w1', '2026-08-01', 90, 8), adhocSession('a1', '2026-08-08', 100, 5)];
    const withName = getExerciseHistory(ws, 'bench', false, NAME);
    expect(withName.map((h) => h.maxWeight)).toEqual([90, 100]);
    // Niezmiennik: bez nazwy — jak dziś, ad-hoc niewidoczny.
    expect(getExerciseHistory(ws, 'bench', false).map((h) => h.maxWeight)).toEqual([90]);
  });

  it('getTrackedExerciseHistory (duration) z nazwą widzi serię ad-hoc', () => {
    const ws: WorkoutSession[] = [{
      id: 'a1', userId: 'u1', dayId: 'adhoc-2026-08-08-1', date: '2026-08-08', completed: true,
      exercises: [{ exerciseId: 'adhoc-ex-deska', name: 'Deska', sets: [{ reps: 1, weight: 0, completed: true, durationSec: 70 }] }],
    }];
    expect(getTrackedExerciseHistory(ws, 'plank', 'duration', null, 'Deska')).toEqual([{ date: '2026-08-08', value: 70 }]);
    expect(getTrackedExerciseHistory(ws, 'plank', 'duration', null)).toEqual([]);
  });
});

describe('propozycje silnika liczą się od sesji ad-hoc (scenariusz specu C5)', () => {
  it('ad-hoc 100 kg x góra zakresu → propozycja 102.5, nie wg starej rozpiski', () => {
    const ws = [planSession('w1', '2026-08-01', 90, 8), adhocSession('a1', '2026-08-08', 100, 8)];
    const advice = getNextSetAdvice(ws, 'bench', '3 x 6-8', 0, { todayISO: '2026-08-12', exerciseName: NAME })!;
    expect(advice.kind).toBe('progress');
    expect(advice.targetWeight).toBe(102.5);
    // Niezmiennik: bez nazwy propozycja jak dziś (od 90 kg).
    const legacy = getNextSetAdvice(ws, 'bench', '3 x 6-8', 0, { todayISO: '2026-08-12' })!;
    expect(legacy.targetWeight).toBe(92.5);
  });

  it('ocena "za ciężko" sesji ad-hoc gasi podbicie ćwiczenia planowego', () => {
    const rated = { ...adhocSession('a1', '2026-08-08', 100, 8), sessionRating: 'down' as const, sessionRatingReasons: ['too_heavy' as const] };
    const ws = [planSession('w1', '2026-08-01', 90, 8), rated];
    expect(lastSessionRatedTooHeavy(ws, 'bench', NAME)).toBe(true);
    expect(lastSessionRatedTooHeavy(ws, 'bench')).toBe(false);
    const advice = getNextSetAdvice(ws, 'bench', '3 x 6-8', 0, { todayISO: '2026-08-12', exerciseName: NAME })!;
    expect(advice.kind).toBe('hold');
    expect(advice.targetWeight).toBe(100);
  });

  it('cele tygodnia (computeWeeklyTargets) bazują na maksie z ad-hoc', () => {
    const ws = [planSession('w1', '2026-08-01', 90, 8), adhocSession('a1', '2026-08-08', 100, 8)];
    const planDays = [{ id: 'd1', dayName: 'A', weekday: 'monday' as const, focus: '', exercises: [{ id: 'bench', name: NAME, sets: '3 x 6-8', instructions: [] }] }];
    const targets = computeWeeklyTargets(planDays, ws, 2, DEFAULT_PROGRESSION);
    expect(targets.d1.bench.targetWeight).toBe(102.5);
  });

  it('rekomendacja RZA czyta metryki z sesji ad-hoc', () => {
    const withMetrics: WorkoutSession = {
      ...adhocSession('a1', '2026-08-08', 100, 5),
      exercises: [{ exerciseId: 'adhoc-ex-wyciskanie-sztangi-lezac', name: NAME, rpe: 7, sets: [{ reps: 5, weight: 100, completed: true }] }],
    };
    const advice = getRzaAdvice([withMetrics], 'bench', NAME)!;
    expect(advice.decision).toBe('progress');
    expect(advice.lastKg).toBe(100);
  });

  it('rampa trybu "nie na 100%" liczy sesję ad-hoc jako krok powrotu', () => {
    const mode = { startDate: '2026-08-01', endDate: '2026-08-05', level: 'lighter' as const };
    const ws = [adhocSession('a1', '2026-08-08', 100, 5)];
    const withName = reducedModeAdviceFactor({ mode, todayISO: '2026-08-10', workouts: ws, exerciseId: 'bench', exerciseName: NAME })!;
    expect(withName.factor).toBe(0.92);
    const withoutName = reducedModeAdviceFactor({ mode, todayISO: '2026-08-10', workouts: ws, exerciseId: 'bench' })!;
    expect(withoutName.factor).toBe(0.85);
  });
});

describe('rekordy widzą ad-hoc (bez fałszywego PR w sesji planowej)', () => {
  it('getExerciseBest1RM z nazwą uwzględnia serię ad-hoc', () => {
    const ws = [planSession('w1', '2026-08-01', 90, 8), adhocSession('a1', '2026-08-08', 100, 5)];
    expect(getExerciseBest1RM(ws, 'bench', NAME).maxWeight).toBe(100);
    expect(getExerciseBest1RM(ws, 'bench').maxWeight).toBe(90);
  });

  it('95 kg w sesji planowej po ad-hoc 100 kg NIE jest PR ciężaru', () => {
    const previous = [planSession('w1', '2026-08-01', 90, 8), adhocSession('a1', '2026-08-08', 100, 5)];
    const current = planSession('w2', '2026-08-12', 95, 5);
    const prs = detectNewPRs(current, previous, new Map([['bench', NAME]]));
    expect(prs.filter((pr) => pr.type === 'weight' || pr.type === 'both')).toEqual([]);
  });

  it('symetria: 105 kg w sesji AD-HOC po planowych 100 kg JEST rekordem ciężaru', () => {
    const previous = [planSession('w1', '2026-08-01', 100, 5)];
    const current = adhocSession('a1', '2026-08-12', 105, 5);
    const prs = detectNewPRs(current, previous, new Map());
    expect(prs.some((pr) => pr.type === 'weight' || pr.type === 'both' || pr.type === '1rm')).toBe(true);
  });
});
