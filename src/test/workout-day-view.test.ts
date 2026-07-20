// Incydent 2026-07-20 (konto admina): po szybkim treningu powrót do treningu z planu
// pokazywał TYLKO 1 ćwiczenie — dzień był odtwarzany WYŁĄCZNIE z kluczy draftu, więc
// ćwiczenia, których user jeszcze nie dotknął, znikały z ekranu (i z treningu).
import { describe, it, expect } from 'vitest';
import { buildDayFromDraft } from '@/lib/workout-day-view';
import type { TrainingDay } from '@/data/trainingPlan';
import type { SetData } from '@/types';

const planDay: TrainingDay = {
  id: 'day-1',
  dayName: 'Poniedziałek',
  weekday: 'monday',
  focus: 'Góra A',
  exercises: [
    { id: 'tpl-ex-29', name: 'Wyciskanie sztangi na skosie', sets: '4 x 6-8', instructions: [{ title: 'T', content: 'C' }] },
    { id: 'tpl-ex-30', name: 'Wiosłowanie sztangą', sets: '4 x 6-8', instructions: [] },
    { id: 'tpl-ex-31', name: 'Wyciskanie hantli nad głowę', sets: '3 x 8-10', instructions: [] },
  ],
};

const sets = (n: number): SetData[] =>
  Array.from({ length: n }, () => ({ reps: 8, weight: 60, completed: true }));

describe('buildDayFromDraft — dzień planu (regresja incydentu 2026-07-20)', () => {
  it('draft z JEDNYM ćwiczeniem NIE kasuje pozostałych ćwiczeń planu', () => {
    const day = buildDayFromDraft(planDay, {
      dayId: 'day-1',
      exerciseSets: { 'tpl-ex-29': sets(3) },
    });
    expect(day.exercises.map((e) => e.id)).toEqual(['tpl-ex-29', 'tpl-ex-30', 'tpl-ex-31']);
  });

  it('kolejność planu zachowana nawet gdy draft ma ćwiczenia w innej kolejności', () => {
    const day = buildDayFromDraft(planDay, {
      dayId: 'day-1',
      exerciseSets: { 'tpl-ex-31': sets(3), 'tpl-ex-29': sets(3) },
    });
    expect(day.exercises.map((e) => e.id)).toEqual(['tpl-ex-29', 'tpl-ex-30', 'tpl-ex-31']);
  });

  it('ćwiczenie dotknięte w drafcie dostaje etykietę z liczby serii (bez rozgrzewki)', () => {
    const withWarmup: SetData[] = [
      { reps: 12, weight: 20, completed: true, isWarmup: true },
      ...sets(3),
    ];
    const day = buildDayFromDraft(planDay, { dayId: 'day-1', exerciseSets: { 'tpl-ex-29': withWarmup } });
    expect(day.exercises[0].sets).toBe('3 serii');
    // Nietknięte zostaje z etykietą z planu.
    expect(day.exercises[1].sets).toBe('4 x 6-8');
  });

  it('ćwiczenia spoza planu (dodane w locie / swap) dochodzą NA KOŃCU z nazwą z draftu', () => {
    const day = buildDayFromDraft(planDay, {
      dayId: 'day-1',
      exerciseSets: { 'tpl-ex-29': sets(3), 'adhoc-ex-plank': sets(2) },
      exerciseNames: { 'adhoc-ex-plank': 'Plank' },
    });
    expect(day.exercises.map((e) => e.id)).toEqual(['tpl-ex-29', 'tpl-ex-30', 'tpl-ex-31', 'adhoc-ex-plank']);
    expect(day.exercises[3].name).toBe('Plank');
  });

  it('instrukcje i nazwa z planu zachowane dla ćwiczeń planu', () => {
    const day = buildDayFromDraft(planDay, { dayId: 'day-1', exerciseSets: { 'tpl-ex-29': sets(3) } });
    expect(day.exercises[0].name).toBe('Wyciskanie sztangi na skosie');
    expect(day.exercises[0].instructions).toHaveLength(1);
  });

  it('nazwa z draftu wygrywa dla ćwiczenia planu (swap "tylko dziś")', () => {
    const day = buildDayFromDraft(planDay, {
      dayId: 'day-1',
      exerciseSets: { 'tpl-ex-30': sets(3) },
      exerciseNames: { 'tpl-ex-30': 'Wiosłowanie hantlem' },
    });
    expect(day.exercises[1].name).toBe('Wiosłowanie hantlem');
  });
});

describe('buildDayFromDraft — szybki trening (bez dnia planu)', () => {
  it('bez baseDay renderuje wyłącznie ćwiczenia z draftu, w kolejności draftu', () => {
    const day = buildDayFromDraft(undefined, {
      dayId: 'adhoc-2026-07-20-1',
      dayName: 'Szybki trening',
      exerciseSets: { 'adhoc-ex-a': sets(2), 'adhoc-ex-b': sets(1) },
      exerciseNames: { 'adhoc-ex-a': 'A', 'adhoc-ex-b': 'B' },
    });
    expect(day.exercises.map((e) => e.id)).toEqual(['adhoc-ex-a', 'adhoc-ex-b']);
    expect(day.dayName).toBe('Szybki trening');
  });

  it('pusty szybki trening => dzień bez ćwiczeń, bez wywrotki', () => {
    const day = buildDayFromDraft(undefined, { dayId: 'adhoc-1', exerciseSets: {} });
    expect(day.exercises).toEqual([]);
  });
});

import { hasAnyCompletedSet } from '@/lib/workout-day-view';

describe('hasAnyCompletedSet — blokada zapisu pustego treningu (regresja 2026-07-20)', () => {
  it('brak ćwiczeń => false', () => {
    expect(hasAnyCompletedSet({})).toBe(false);
  });

  it('serie bez odhaczenia => false (sam pre-fill to nie trening)', () => {
    expect(hasAnyCompletedSet({ a: [{ reps: 8, weight: 60, completed: false }] })).toBe(false);
  });

  it('jedna odhaczona seria => true', () => {
    expect(hasAnyCompletedSet({ a: [{ reps: 8, weight: 60, completed: true }] })).toBe(true);
  });

  it('sama rozgrzewka też się liczy (user coś zrobił)', () => {
    expect(hasAnyCompletedSet({ a: [{ reps: 12, weight: 20, completed: true, isWarmup: true }] })).toBe(true);
  });
});
