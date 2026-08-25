import { describe, expect, it } from 'vitest';
import { buildFirstWorkoutSchedule, listFirstWorkoutOptions } from '@/lib/first-workout-schedule';
import { isValidPlanStartMonday } from '@/lib/cycle-actions';

// X34b (docs/PLAN-X34-2026-08-25.md, sekcja 7): user wybiera KONKRETNY dzien
// pierwszego treningu; plan zostaje zakotwiczony w poniedzialku tygodnia tej
// daty, a dni treningowe tego tygodnia sprzed wybranej daty (i sprzed dzis)
// trafiaja do skippedDates, zeby nie wisialy jako zalegle.
// Kalendarz: 2026-08-24 = poniedzialek.

const MWF = ['monday', 'wednesday', 'friday'] as const;

describe('buildFirstWorkoutSchedule', () => {
  it('poniedzialek jako pierwszy trening = startDate ten poniedzialek, zero skippedDates', () => {
    expect(buildFirstWorkoutSchedule('2026-08-24', [...MWF], '2026-08-24')).toEqual({ startDate: '2026-08-24', skippedDates: [] });
    expect(buildFirstWorkoutSchedule('2026-08-31', [...MWF], '2026-08-25')).toEqual({ startDate: '2026-08-31', skippedDates: [] });
  });

  it('srodek tygodnia: startDate = poniedzialek tygodnia, dni treningowe przed wyborem pominiete', () => {
    // Wybor piatku 28.08 (dzis wtorek): poniedzialek 24 (przed dzis) i sroda 26 (przed wyborem) pominiete.
    expect(buildFirstWorkoutSchedule('2026-08-28', [...MWF], '2026-08-25')).toEqual({
      startDate: '2026-08-24',
      skippedDates: ['2026-08-24', '2026-08-26'],
    });
    // Wybor srody 26.08 (dzis wtorek): tylko poniedzialek 24.
    expect(buildFirstWorkoutSchedule('2026-08-26', [...MWF], '2026-08-25')).toEqual({
      startDate: '2026-08-24',
      skippedDates: ['2026-08-24'],
    });
  });

  it('niedziela jako dzien treningowy i pierwszy trening: poniedzialek TEGO tygodnia (nie nastepnego), reszta tygodnia pominieta', () => {
    expect(buildFirstWorkoutSchedule('2026-08-30', ['tuesday', 'sunday'], '2026-08-25')).toEqual({
      startDate: '2026-08-24',
      skippedDates: ['2026-08-25'],
    });
  });

  it('dzis jako pierwszy trening: dni sprzed dzis w tym tygodniu pominiete, dzis nie', () => {
    expect(buildFirstWorkoutSchedule('2026-08-26', [...MWF], '2026-08-26')).toEqual({
      startDate: '2026-08-24',
      skippedDates: ['2026-08-24'],
    });
  });

  it('pomija tylko dni TRENINGOWE tygodnia startu (dni wolne nie wchodza do skippedDates)', () => {
    expect(buildFirstWorkoutSchedule('2026-08-29', ['tuesday', 'saturday'], '2026-08-24')).toEqual({
      startDate: '2026-08-24',
      skippedDates: ['2026-08-25'],
    });
  });

  it('dni sprzed dzis sa pomijane nawet gdy wybrana data jest wczesniejsza od dzis (stary szkic)', () => {
    // Wybor srody 26 wczytany w piatek 28: poniedzialek i sroda juz minely.
    expect(buildFirstWorkoutSchedule('2026-08-26', [...MWF], '2026-08-28')).toEqual({
      startDate: '2026-08-24',
      skippedDates: ['2026-08-24', '2026-08-26'],
    });
  });

  it('brak dni treningowych = poniedzialek tygodnia i zero skippedDates', () => {
    expect(buildFirstWorkoutSchedule('2026-08-27', [], '2026-08-25')).toEqual({ startDate: '2026-08-24', skippedDates: [] });
  });
});

describe('listFirstWorkoutOptions', () => {
  it('kolejne dni treningowe od dzis (dzis wlacznie, gdy jest dniem treningowym), do 8', () => {
    expect(listFirstWorkoutOptions([...MWF], '2026-08-26')).toEqual([
      '2026-08-26', '2026-08-28', '2026-08-31', '2026-09-02', '2026-09-04', '2026-09-07', '2026-09-09', '2026-09-11',
    ]);
  });

  it('dzis poza dniami treningowymi: pierwszy chip = najblizszy dzien treningowy', () => {
    expect(listFirstWorkoutOptions([...MWF], '2026-08-25').slice(0, 3)).toEqual(['2026-08-26', '2026-08-28', '2026-08-31']);
  });

  it('kolejnosc dni tygodnia z wejscia nie ma znaczenia; duplikaty ignorowane', () => {
    expect(listFirstWorkoutOptions(['friday', 'monday', 'monday'], '2026-08-24', 3)).toEqual(['2026-08-24', '2026-08-28', '2026-08-31']);
  });

  it('brak dni treningowych: fallback = najblizsze poniedzialki (od dzis)', () => {
    expect(listFirstWorkoutOptions([], '2026-08-25', 3)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14']);
    expect(listFirstWorkoutOptions([], '2026-08-24', 2)).toEqual(['2026-08-24', '2026-08-31']);
  });

  it('granica okna: kazda opcja daje poniedzialek akceptowany przez isValidPlanStartMonday (biezacy tydzien .. +8 tygodni)', () => {
    const today = '2026-08-25';
    const now = new Date(2026, 7, 25);
    // Limit wiekszy niz okno: lista konczy sie na ostatnim dniu tygodnia +8 (niedziela 2026-10-25).
    const all = listFirstWorkoutOptions(['sunday'], today, 100);
    expect(all[all.length - 1]).toBe('2026-10-25');
    for (const iso of all) {
      expect(isValidPlanStartMonday(buildFirstWorkoutSchedule(iso, ['sunday'], today).startDate, now)).toBe(true);
    }
    // Dzien po oknie (poniedzialek tygodnia +9) nie jest opcja.
    expect(listFirstWorkoutOptions(['monday'], today, 100)).not.toContain('2026-10-26');
  });

  it('wlasny plan: dni tygodnia z dni buildera (np. wtorek + sobota)', () => {
    expect(listFirstWorkoutOptions(['tuesday', 'saturday'], '2026-08-24', 4)).toEqual(['2026-08-25', '2026-08-29', '2026-09-01', '2026-09-05']);
  });
});
