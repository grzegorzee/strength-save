// Krok 5 przełożenia treningu (spec 2026-08-11): OBOWIĄZKOWE testy sekwencji.
// Scenariusz 8: plan → przełóż jutrzejszy dzień na dziś → start → wyjście →
// szybki trening → powrót → dokończenie → sync. Dashboard/WorkoutDay spójne po
// każdym kroku, wszystkie ćwiczenia na miejscu, historia z datą WYKONANIA.
// Plus przypadek 5: granica tygodnia nie zmienia id dni, progresji ani planu.
import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { getScheduledTrainingWeek, resolvePlannedDay } from '@/lib/plan-schedule';
import { buildScheduleMove, shouldClearOverridesOnPlanSave } from '@/lib/schedule-overrides';
import { buildDayFromDraft } from '@/lib/workout-day-view';
import { findWorkoutForRoute } from '@/lib/workout-lookup';
import { findMissedWorkout } from '@/lib/missed-workout';
import { parseLocalDate } from '@/lib/utils';

const day = (id: string, weekday: TrainingDay['weekday'], exerciseIds: string[]): TrainingDay => ({
  id,
  dayName: id,
  weekday,
  focus: 'F',
  exercises: exerciseIds.map((exId) => ({ id: exId, name: exId, sets: '3 x 6-8', instructions: [] })),
});

// 2026-08-10 pn, 2026-08-12 śr, 2026-08-14 pt. "Dziś" = wtorek 2026-08-11.
const planDays = [
  day('day-1', 'monday', ['ex-1-1', 'ex-1-2']),
  day('day-2', 'wednesday', ['ex-2-1', 'ex-2-2', 'ex-2-3']),
  day('day-3', 'friday', ['ex-3-1']),
];
const TODAY = '2026-08-11';
const MONDAY = parseLocalDate('2026-08-10');

// Historia sprzed sekwencji: poprzedni piątek i poniedziałek zrobione.
const history: WorkoutSession[] = [
  { id: 'w-fri', userId: 'u1', dayId: 'day-3', date: '2026-08-07', completed: true, exercises: [] },
  { id: 'w-mon', userId: 'u1', dayId: 'day-1', date: '2026-08-10', completed: true, exercises: [] },
];

const weekView = (overrides: Record<string, string | null>) =>
  getScheduledTrainingWeek(planDays, MONDAY, overrides).map((e) => [e.dateKey, e.day.id]);

describe('sekwencja przełożenia (scenariusz 8 ze specu)', () => {
  it('przełóż jutro→dziś, start, wyjście, szybki trening, powrót, dokończenie, sync', () => {
    const planSnapshot = JSON.stringify(planDays);

    // Krok 0: stan wyjściowy — środa (jutro) ma day-2, dziś (wtorek) wolne.
    expect(weekView({})).toEqual([
      ['2026-08-10', 'day-1'], ['2026-08-12', 'day-2'], ['2026-08-14', 'day-3'],
    ]);
    expect(resolvePlannedDay(TODAY, planDays, {})).toBeNull();

    // Krok 1: przełożenie jutrzejszego treningu na dziś.
    const move = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-12', toISO: TODAY, todayISO: TODAY,
    });
    expect(move).toEqual({
      ok: true, swapped: false,
      overrides: { '2026-08-12': null, [TODAY]: 'day-2' },
    });
    const overrides = move.ok ? move.overrides : {};

    // Dashboard spójny: dzisiejsza karta = day-2, środa zniknęła z tygodnia.
    expect(weekView(overrides)).toEqual([
      ['2026-08-10', 'day-1'], ['2026-08-11', 'day-2'], ['2026-08-14', 'day-3'],
    ]);
    const todayDay = resolvePlannedDay(TODAY, planDays, overrides)!;
    expect(todayDay.id).toBe('day-2');

    // Krok 2: start treningu — draft z jedną odhaczoną serią pierwszego ćwiczenia.
    const draft = {
      dayId: 'day-2',
      date: TODAY,
      exerciseSets: { 'ex-2-1': [{ reps: 8, weight: 60, completed: true }] },
    };
    const viewAfterStart = buildDayFromDraft(todayDay, draft);
    expect(viewAfterStart.exercises.map((e) => e.id)).toEqual(['ex-2-1', 'ex-2-2', 'ex-2-3']);

    // Krok 3: wyjście + szybki trening — osobna sesja ad-hoc, draft planu NIETKNIĘTY.
    const adhocView = buildDayFromDraft(undefined, {
      dayId: 'adhoc-2026-08-11-1',
      dayName: 'Szybki trening',
      exerciseSets: { 'adhoc-ex-plank': [{ reps: 1, weight: 0, completed: true }] },
      exerciseNames: { 'adhoc-ex-plank': 'Plank' },
    });
    expect(adhocView.exercises.map((e) => e.id)).toEqual(['adhoc-ex-plank']);
    expect(draft.exerciseSets).toEqual({ 'ex-2-1': [{ reps: 8, weight: 60, completed: true }] });

    // Krok 4: powrót do treningu z planu — WSZYSTKIE ćwiczenia na miejscu
    // (niezmiennik incydentu 2026-07-20), harmonogram bez zmian.
    const viewAfterReturn = buildDayFromDraft(resolvePlannedDay(TODAY, planDays, overrides)!, draft);
    expect(viewAfterReturn.exercises.map((e) => e.id)).toEqual(['ex-2-1', 'ex-2-2', 'ex-2-3']);

    // Krok 5: dokończenie + sync — historia z datą WYKONANIA (dziś, nie środa).
    const finished: WorkoutSession = {
      id: 'w-today', userId: 'u1', dayId: 'day-2', date: TODAY, completed: true,
      exercises: viewAfterReturn.exercises.map((e) => ({
        exerciseId: e.id, name: e.name, sets: [{ reps: 8, weight: 60, completed: true }],
      })),
    };
    const workouts = [...history, finished];
    const card = findWorkoutForRoute(workouts, {
      dayId: 'day-2', date: TODAY, allowDateFallback: true, today: TODAY,
    });
    expect(card?.id).toBe('w-today');
    expect(card?.date).toBe(TODAY);

    // Dashboard następnego dnia: zero banera (środa zwolniona, wtorek zrobiony,
    // wcześniejsze dni w historii).
    expect(findMissedWorkout({
      planDays, overrides, workouts, todayISO: '2026-08-13',
    })).toBeNull();

    // Niezmienniki końcowe: plan niezmutowany, id dni bez zmian (X19) —
    // kolejny zapis planu nie wyczyści overrides.
    expect(JSON.stringify(planDays)).toBe(planSnapshot);
    expect(shouldClearOverridesOnPlanSave(planDays, planDays)).toBe(false);
  });

  it('baner podąża za resolverem: niezrobiony przełożony dzień wskazuje NOWĄ datę', () => {
    const overrides = { '2026-08-12': null, [TODAY]: 'day-2' };
    // Bez sesji z wtorku: pominięty jest wtorek (data override), nie środa.
    const missed = findMissedWorkout({
      planDays, overrides, workouts: history, todayISO: '2026-08-13',
    });
    expect(missed).toEqual({ day: planDays[1], dateISO: TODAY });
  });
});

// WP-A (X27, 2026-08-21): ukończonego treningu nie da się przełożyć ani nie
// można przełożyć innego treningu NA datę z ukończoną sesją (bug TestFlight 113:
// po ukończeniu dzisiejszej sesji swap Z/NA dziś rozjeżdżał historię).
describe('blokada ukończonych treningów (WP-A)', () => {
  it('completed-source: data źródłowa z ukończonym treningiem => ok:false, overrides nietknięte', () => {
    const overrides = {};
    const move = buildScheduleMove({
      overrides, planDays, fromISO: '2026-08-12', toISO: TODAY, todayISO: TODAY,
      completedDates: new Set(['2026-08-12']),
    });
    expect(move).toEqual({ ok: false, reason: 'completed-source' });
    expect(overrides).toEqual({});
  });

  it('completed-target (dzień wolny): ukończona sesja dziś blokuje dziś jako cel (scenariusz buga usera)', () => {
    const move = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-12', toISO: TODAY, todayISO: TODAY,
      completedDates: new Set([TODAY]),
    });
    expect(move).toEqual({ ok: false, reason: 'completed-target' });
  });

  it('completed-target (swap): cel zajęty przez inny dzień planu z ukończonym treningiem => blokada', () => {
    const move = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-12', toISO: '2026-08-14', todayISO: TODAY,
      completedDates: new Set(['2026-08-14']),
    });
    expect(move).toEqual({ ok: false, reason: 'completed-target' });
  });

  it('pusty zbiór completedDates nie blokuje niczego (draft/nieukończone sesje jak dotąd)', () => {
    const move = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-12', toISO: TODAY, todayISO: TODAY,
      completedDates: new Set(),
    });
    expect(move.ok).toBe(true);
  });
});

describe('granica tygodnia (przypadek 5 ze specu)', () => {
  it('przeniesienie na następny tydzień: id dnia bez zmian, kolejne tygodnie regularne', () => {
    const planSnapshot = JSON.stringify(planDays);
    const move = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-12', toISO: '2026-08-18', todayISO: TODAY,
    });
    expect(move).toEqual({
      ok: true, swapped: false,
      overrides: { '2026-08-12': null, '2026-08-18': 'day-2' },
    });
    const overrides = move.ok ? move.overrides : {};

    // Progresja idzie po exercise.id — przełożony dzień to TEN SAM dzień planu.
    const movedDay = resolvePlannedDay('2026-08-18', planDays, overrides)!;
    expect(movedDay).toBe(planDays[1]);
    expect(movedDay.exercises.map((e) => e.id)).toEqual(['ex-2-1', 'ex-2-2', 'ex-2-3']);

    // Bieżący tydzień bez środy; następny: wtorek (override) ORAZ regularna środa
    // 2026-08-19 (override dotyczy KONKRETNEJ daty, nie weekday).
    expect(weekView(overrides)).toEqual([
      ['2026-08-10', 'day-1'], ['2026-08-14', 'day-3'],
    ]);
    expect(getScheduledTrainingWeek(planDays, parseLocalDate('2026-08-17'), overrides)
      .map((e) => [e.dateKey, e.day.id])).toEqual([
      ['2026-08-17', 'day-1'],
      ['2026-08-18', 'day-2'],
      ['2026-08-19', 'day-2'],
      ['2026-08-21', 'day-3'],
    ]);

    // Plan (dni, id, startDate poza zapisem) nietknięty => numer tygodnia,
    // progresja i deload liczą się jak dotąd; X19 nienaruszone.
    expect(JSON.stringify(planDays)).toBe(planSnapshot);
    expect(shouldClearOverridesOnPlanSave(planDays, planDays)).toBe(false);
  });

  it('swap przez granicę tygodnia jest symetryczny i odwracalny', () => {
    const move = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-12', toISO: '2026-08-17', todayISO: TODAY,
    });
    expect(move).toEqual({
      ok: true, swapped: true,
      overrides: { '2026-08-12': 'day-1', '2026-08-17': 'day-2' },
    });
    const overrides = move.ok ? move.overrides : {};

    // Odwrócenie: ten sam ruch z powrotem przywraca harmonogram wyjściowy.
    const undo = buildScheduleMove({
      overrides, planDays, fromISO: '2026-08-17', toISO: '2026-08-12', todayISO: TODAY,
    });
    expect(undo.ok && undo.overrides).toEqual({ '2026-08-12': 'day-2', '2026-08-17': 'day-1' });
    expect(undo.ok && weekView(undo.overrides)).toEqual([
      ['2026-08-10', 'day-1'], ['2026-08-12', 'day-2'], ['2026-08-14', 'day-3'],
    ]);
  });
});
