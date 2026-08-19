import { describe, expect, it } from 'vitest';
import {
  backfillWeightForExercise,
  filterPRsAgainstBackfill,
  sanitizePRBackfill,
} from '@/lib/pr-backfill';
import { mapAppUserProfile } from '@/lib/user-profile';
import type { AppUserProfile } from '@/lib/registration-api';
import type { PRComparison } from '@/lib/pr-utils';

// Runna pakiet 1, krok 6 (spec A5): backfill rekordów sprzed instalacji.
// Celebracja PR nie może gratulować ciężarów, które user dźwigał przed apką:
// detekcja porównuje z max(historia w apce, backfill).

describe('sanitizePRBackfill', () => {
  it('przepuszcza znane boje, clampuje do 600 i zaokrągla do 0.5', () => {
    expect(sanitizePRBackfill({ squat: 142.3, bench: 999, deadlift: 180 }))
      .toEqual({ squat: 142.5, bench: 600, deadlift: 180 });
  });

  it('odrzuca śmieci i puste wartości; pusty wynik = undefined', () => {
    expect(sanitizePRBackfill({ squat: 'duzo', curl: 50 })).toBeUndefined();
    expect(sanitizePRBackfill({ squat: 0, bench: -5 })).toBeUndefined();
    expect(sanitizePRBackfill(null)).toBeUndefined();
  });
});

describe('backfillWeightForExercise', () => {
  const backfill = { squat: 140, bench: 100, deadlift: 180 };

  it('dopasowuje boje główne po nazwie PL i EN', () => {
    expect(backfillWeightForExercise('Przysiad ze sztangą', backfill)).toBe(140);
    expect(backfillWeightForExercise('Back Squat', backfill)).toBe(140);
    expect(backfillWeightForExercise('Wyciskanie sztangi leżąc', backfill)).toBe(100);
    expect(backfillWeightForExercise('Bench Press', backfill)).toBe(100);
    expect(backfillWeightForExercise('Martwy ciąg', backfill)).toBe(180);
    expect(backfillWeightForExercise('Deadlift', backfill)).toBe(180);
  });

  it('warianty NIE dziedziczą rekordu boju głównego', () => {
    expect(backfillWeightForExercise('Hack squat maszyna', backfill)).toBe(0);
    expect(backfillWeightForExercise('Przysiad bułgarski', backfill)).toBe(0);
    expect(backfillWeightForExercise('Front squat', backfill)).toBe(0);
    expect(backfillWeightForExercise('Wyciskanie hantli leżąc', backfill)).toBe(0);
    expect(backfillWeightForExercise('Wyciskanie sztangi na skosie', backfill)).toBe(0);
    expect(backfillWeightForExercise('Martwy ciąg rumuński', backfill)).toBe(0);
    expect(backfillWeightForExercise('Uginanie ramion', backfill)).toBe(0);
  });

  it('brak backfillu = 0', () => {
    expect(backfillWeightForExercise('Przysiad ze sztangą', undefined)).toBe(0);
  });

  // B-T5: inwentarz KANONICZNYCH nazw big three z biblioteki ćwiczeń —
  // matcher działa po slugach, nie po fragmencie tłumaczenia ('leż').
  it('kanoniczne nazwy biblioteki big three dziedziczą backfill', () => {
    expect(backfillWeightForExercise('Wyciskanie sztangi na ławce płaskiej', backfill)).toBe(100);
    expect(backfillWeightForExercise('Przysiad ze sztangą (High Bar)', backfill)).toBe(140);
    expect(backfillWeightForExercise('Przysiad ze sztangą (Low Bar)', backfill)).toBe(140);
    expect(backfillWeightForExercise('Martwy ciąg klasyczny', backfill)).toBe(180);
  });

  it('inwentarz wariantów biblioteki, które NIE dziedziczą', () => {
    expect(backfillWeightForExercise('Wyciskanie hantli na ławce płaskiej', backfill)).toBe(0);
    expect(backfillWeightForExercise('Wyciskanie na Smith maszynie (ławka płaska)', backfill)).toBe(0);
    expect(backfillWeightForExercise('Wyciskanie sztangi na ławce ujemnej (deklina)', backfill)).toBe(0);
    expect(backfillWeightForExercise('Wyciskanie sztangi nad głowę (OHP)', backfill)).toBe(0);
    expect(backfillWeightForExercise('Przysiad goblet', backfill)).toBe(0);
    expect(backfillWeightForExercise('Przysiad pistolet (jednonóż)', backfill)).toBe(0);
    expect(backfillWeightForExercise('Przysiady wykroczne', backfill)).toBe(0);
    expect(backfillWeightForExercise('Martwy Ciąg Rumuński (RDL)', backfill)).toBe(0);
    expect(backfillWeightForExercise('Rumuński martwy ciąg z akcentem na pośladek', backfill)).toBe(0);
  });
});

describe('filterPRsAgainstBackfill', () => {
  const pr = (overrides: Partial<PRComparison>): PRComparison => ({
    exerciseId: 'ex-1',
    exerciseName: 'Przysiad ze sztangą',
    type: 'weight',
    newValue: 120,
    oldValue: 110,
    ...overrides,
  });

  it('tnie PR ciężarowy nie przekraczający backfillu', () => {
    const weightFor = () => 140;
    expect(filterPRsAgainstBackfill([pr({ newValue: 120 })], weightFor)).toEqual([]);
    expect(filterPRsAgainstBackfill([pr({ newValue: 142.5 })], weightFor)).toHaveLength(1);
  });

  it('typy nie-ciężarowe (reps/duration) przechodzą bez zmian', () => {
    const weightFor = () => 140;
    expect(filterPRsAgainstBackfill([pr({ type: 'reps', newValue: 12 })], weightFor)).toHaveLength(1);
    expect(filterPRsAgainstBackfill([pr({ type: 'duration', newValue: 60 })], weightFor)).toHaveLength(1);
  });

  it('bez backfillu (0) wszystko przechodzi (niezmiennik)', () => {
    expect(filterPRsAgainstBackfill([pr({})], () => 0)).toHaveLength(1);
  });
});

describe('mapAppUserProfile: passthrough prBackfill (lekcja builda 88)', () => {
  const seed = { userId: 'u1', email: 'a@b.c', displayName: 'T', photoURL: '' };

  it('przenosi zsanityzowany backfill do profilu aplikacji', () => {
    const data = { email: 'a@b.c', prBackfill: { squat: 140, junk: 1 } } as unknown as AppUserProfile;
    expect(mapAppUserProfile('u1', data, seed).prBackfill).toEqual({ squat: 140 });
  });

  it('brak pola = brak backfillu (niezmiennik)', () => {
    const data = { email: 'a@b.c' } as unknown as AppUserProfile;
    expect(mapAppUserProfile('u1', data, seed).prBackfill).toBeUndefined();
  });
});
