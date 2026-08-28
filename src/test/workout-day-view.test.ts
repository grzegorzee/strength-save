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

  it('Z185: klucz swapu "tylko dziś" ZASTĘPUJE kartę planu zamiast tworzyć drugą (restart sesji)', () => {
    const day = buildDayFromDraft(planDay, {
      dayId: 'day-1',
      exerciseSets: { 'tpl-ex-29': sets(3), 'tpl-ex-30__swap-wioslowanie-hantlem': sets(3) },
      exerciseNames: { 'tpl-ex-30__swap-wioslowanie-hantlem': 'Wiosłowanie hantlem' },
    });
    // Jedna karta na pozycji planowej tpl-ex-30 — z tożsamością swapu, zero extras.
    expect(day.exercises.map((e) => e.id)).toEqual([
      'tpl-ex-29',
      'tpl-ex-30__swap-wioslowanie-hantlem',
      'tpl-ex-31',
    ]);
    expect(day.exercises[1].name).toBe('Wiosłowanie hantlem');
    expect(day.exercises[1].sets).toBe('3 serii');
  });

  it('Z185 niezmiennik: gdy draft ANORMALNIE ma oba klucze (plan + swap), nic nie znika z widoku', () => {
    const day = buildDayFromDraft(planDay, {
      dayId: 'day-1',
      exerciseSets: { 'tpl-ex-30': sets(2), 'tpl-ex-30__swap-wioslowanie-hantlem': sets(3) },
      exerciseNames: { 'tpl-ex-30__swap-wioslowanie-hantlem': 'Wiosłowanie hantlem' },
    });
    // Reprezentacja bez utraty edycji: karta planu zostaje, swap jako extras.
    expect(day.exercises.map((e) => e.id)).toEqual([
      'tpl-ex-29',
      'tpl-ex-30',
      'tpl-ex-31',
      'tpl-ex-30__swap-wioslowanie-hantlem',
    ]);
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

  it('legacy/corrupt: completed=true bez żadnego wyniku nadal jest pustym treningiem', () => {
    expect(hasAnyCompletedSet({
      a: [{ reps: 0, weight: 0, completed: true }],
    })).toBe(false);
  });

  it('legacy/corrupt: sama waga albo sama asysta bez ruchu nadal są pustym treningiem', () => {
    expect(hasAnyCompletedSet({
      a: [{ reps: 0, weight: 100, completed: true }],
    })).toBe(false);
    expect(hasAnyCompletedSet({
      a: [{ reps: 0, weight: 0, assistWeight: 30, completed: true }],
    })).toBe(false);
  });

  it('prawidłowy wynik reps-only, czasowy albo dystansowy przechodzi', () => {
    expect(hasAnyCompletedSet({ a: [{ reps: 10, weight: 0, completed: true }] })).toBe(true);
    expect(hasAnyCompletedSet({ a: [{ reps: 0, weight: 0, durationSec: 45, completed: true }] })).toBe(true);
    expect(hasAnyCompletedSet({ a: [{ reps: 0, weight: 0, distanceM: 100, completed: true }] })).toBe(true);
  });

  it('sama rozgrzewka też się liczy (user coś zrobił)', () => {
    expect(hasAnyCompletedSet({ a: [{ reps: 12, weight: 20, completed: true, isWarmup: true }] })).toBe(true);
  });
});

import { seedSetsFromSession } from '@/lib/workout-day-view';

// Bug 5 (X30): mapper seedujacy stan widoku z sesji Firestore enumerowal tylko
// reps/weight/completed/isWarmup — pola serii Z105 (durationSec, distanceM,
// assistWeight, updatedAt, updatedEventId) ginely przy powrocie do sesji.
describe('seedSetsFromSession — pelny ksztalt serii Z105 przezywa seed widoku', () => {
  it('przenosi pola opcjonalne Z105 i LWW bez zmian', () => {
    const seeded = seedSetsFromSession([{
      reps: 1, weight: 0, completed: true,
      durationSec: 60, distanceM: 50, assistWeight: 30,
      updatedAt: 1700000000000, updatedEventId: 'evt-1',
    }]);
    expect(seeded).toEqual([{
      reps: 1, weight: 0, completed: true,
      durationSec: 60, distanceM: 50, assistWeight: 30,
      updatedAt: 1700000000000, updatedEventId: 'evt-1',
    }]);
  });

  it('niezmiennik starego przeplywu: braki reps/weight/completed dostaja defaulty', () => {
    const seeded = seedSetsFromSession([
      { completed: true } as unknown as SetData,
      { reps: 5, weight: 80, completed: true, isWarmup: true },
    ]);
    expect(seeded[0]).toEqual({ reps: 0, weight: 0, completed: true });
    expect(seeded[1]).toEqual({ reps: 5, weight: 80, completed: true, isWarmup: true });
  });

  it('zwraca nowe obiekty (mutacja stanu widoku nie dotyka danych sesji)', () => {
    const source: SetData[] = [{ reps: 5, weight: 80, completed: false }];
    const seeded = seedSetsFromSession(source);
    expect(seeded[0]).not.toBe(source[0]);
  });
});

import { autoCompleteFilledSets, plSetsPluralForm } from '@/lib/workout-day-view';

// WP-D (X37): przy "Zakończ" serie robocze z kompletem danych, ale bez odhaczenia,
// odhaczają się same (Hevy pomija je po cichu; my liczymy i mówimy ile).
describe('autoCompleteFilledSets: auto-odhaczanie serii z danymi przy Zakończ', () => {
  const weightReps = () => 'weight_reps' as const;

  it('weight_reps: seria z wagą i powtórzeniami dostaje completed, pusta zostaje pusta', () => {
    const result = autoCompleteFilledSets({
      a: [
        { reps: 8, weight: 60, completed: true },
        { reps: 8, weight: 60, completed: false },
        { reps: 0, weight: 60, completed: false },
        { reps: 0, weight: 0, completed: false },
      ],
    }, weightReps);
    expect(result.autoCompleted).toBe(1);
    expect(result.changedExerciseIds).toEqual(['a']);
    expect(result.exerciseSets.a.map((s) => s.completed)).toEqual([true, true, false, false]);
  });

  it('weight_reps: same powtórzenia bez wagi to NIE komplet danych', () => {
    const result = autoCompleteFilledSets({ a: [{ reps: 8, weight: 0, completed: false }] }, weightReps);
    expect(result.autoCompleted).toBe(0);
    expect(result.changedExerciseIds).toEqual([]);
  });

  it('bodyweight_reps: powtórzenia bez wagi wystarczą', () => {
    const result = autoCompleteFilledSets(
      { pullups: [{ reps: 10, weight: 0, completed: false }, { reps: 0, weight: 0, completed: false }] },
      () => 'bodyweight_reps',
    );
    expect(result.autoCompleted).toBe(1);
    expect(result.exerciseSets.pullups.map((s) => s.completed)).toEqual([true, false]);
  });

  it('assisted_bodyweight: powtórzenia wystarczą (asysta opcjonalna)', () => {
    const result = autoCompleteFilledSets(
      { dips: [{ reps: 8, weight: 0, completed: false, assistWeight: 20 }, { reps: 0, weight: 0, completed: false, assistWeight: 20 }] },
      () => 'assisted_bodyweight',
    );
    expect(result.exerciseSets.dips.map((s) => s.completed)).toEqual([true, false]);
  });

  it('duration: czas > 0 odhacza, brak czasu nie', () => {
    const result = autoCompleteFilledSets(
      { plank: [{ reps: 0, weight: 0, completed: false, durationSec: 45 }, { reps: 0, weight: 0, completed: false, durationSec: 0 }] },
      () => 'duration',
    );
    expect(result.autoCompleted).toBe(1);
    expect(result.exerciseSets.plank.map((s) => s.completed)).toEqual([true, false]);
  });

  it('weight_distance_duration: dystans albo czas odhacza, sama waga nie', () => {
    const result = autoCompleteFilledSets(
      {
        farmer: [
          { reps: 0, weight: 24, completed: false, distanceM: 40 },
          { reps: 0, weight: 24, completed: false, durationSec: 30 },
          { reps: 0, weight: 24, completed: false },
        ],
      },
      () => 'weight_distance_duration',
    );
    expect(result.autoCompleted).toBe(2);
    expect(result.exerciseSets.farmer.map((s) => s.completed)).toEqual([true, true, false]);
  });

  it('rozgrzewka NIETKNIĘTA nawet z kompletem danych', () => {
    const result = autoCompleteFilledSets(
      { a: [{ reps: 10, weight: 20, completed: false, isWarmup: true }, { reps: 8, weight: 60, completed: false }] },
      weightReps,
    );
    expect(result.autoCompleted).toBe(1);
    expect(result.exerciseSets.a[0]).toEqual({ reps: 10, weight: 20, completed: false, isWarmup: true });
    expect(result.exerciseSets.a[1].completed).toBe(true);
  });

  it('niezmiennik: nic nie zmienia => te same referencje tablic, zero zmienionych ćwiczeń', () => {
    const untouched: SetData[] = [{ reps: 0, weight: 0, completed: false }, { reps: 8, weight: 60, completed: true }];
    const result = autoCompleteFilledSets({ a: untouched }, weightReps);
    expect(result.autoCompleted).toBe(0);
    expect(result.changedExerciseIds).toEqual([]);
    expect(result.exerciseSets.a).toBe(untouched);
  });

  it('nie mutuje wejścia i przenosi pola serii bez zmian (durationSec, updatedAt)', () => {
    const source: SetData[] = [{ reps: 8, weight: 60, completed: false, durationSec: 12, updatedAt: 5 }];
    const result = autoCompleteFilledSets({ a: source }, weightReps);
    expect(source[0].completed).toBe(false);
    expect(result.exerciseSets.a[0]).toEqual({ reps: 8, weight: 60, completed: true, durationSec: 12, updatedAt: 5 });
  });

  it('resolver trackingu dostaje id ćwiczenia (różne typy w jednej sesji)', () => {
    const result = autoCompleteFilledSets(
      {
        bench: [{ reps: 8, weight: 0, completed: false }],
        plank: [{ reps: 0, weight: 0, completed: false, durationSec: 30 }],
      },
      (id) => (id === 'plank' ? 'duration' : 'weight_reps'),
    );
    expect(result.changedExerciseIds).toEqual(['plank']);
    expect(result.autoCompleted).toBe(1);
  });
});

describe('plSetsPluralForm: forma liczebnika do toastu "Odhaczono N serii"', () => {
  it('1 => one, 2-4 => few, 5-21 => many, 22-24 => few, 25 => many', () => {
    expect(plSetsPluralForm(1)).toBe('one');
    expect(plSetsPluralForm(2)).toBe('few');
    expect(plSetsPluralForm(4)).toBe('few');
    expect(plSetsPluralForm(5)).toBe('many');
    expect(plSetsPluralForm(12)).toBe('many');
    expect(plSetsPluralForm(21)).toBe('many');
    expect(plSetsPluralForm(22)).toBe('few');
    expect(plSetsPluralForm(25)).toBe('many');
  });
});
