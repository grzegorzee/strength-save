// Krok 4 przełożenia treningu: funkcje harmonogramu honorują scheduleOverrides.
// Niezmiennik (zasada #5 CLAUDE.md): BEZ overrides zachowanie identyczne jak dotąd.
import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { parseLocalDate } from '@/lib/utils';
import {
  buildTrainingSchedule,
  getNextScheduledTraining,
  getScheduledTrainingForDate,
  getScheduledTrainingWeek,
} from '@/lib/plan-schedule';

const day = (id: string, weekday: TrainingDay['weekday']): TrainingDay => ({
  id,
  dayName: id,
  weekday,
  focus: '',
  exercises: [],
});

// 2026-08-10 pn, 2026-08-12 śr, 2026-08-14 pt.
const planDays = [day('day-1', 'monday'), day('day-2', 'wednesday'), day('day-3', 'friday')];
const MONDAY = parseLocalDate('2026-08-10');
const TUESDAY = parseLocalDate('2026-08-11');

describe('niezmiennik: bez overrides zachowanie bez zmian', () => {
  it('getScheduledTrainingForDate i getScheduledTrainingWeek jak dotąd', () => {
    expect(getScheduledTrainingForDate(planDays, MONDAY)?.day.id).toBe('day-1');
    expect(getScheduledTrainingForDate(planDays, TUESDAY)).toBeNull();
    expect(getScheduledTrainingWeek(planDays, MONDAY).map(e => [e.dateKey, e.day.id])).toEqual([
      ['2026-08-10', 'day-1'],
      ['2026-08-12', 'day-2'],
      ['2026-08-14', 'day-3'],
    ]);
    expect(getNextScheduledTraining(planDays, MONDAY)?.dateKey).toBe('2026-08-12');
  });

  it('pusta mapa overrides daje identyczny wynik jak brak mapy', () => {
    expect(getScheduledTrainingWeek(planDays, MONDAY, {}))
      .toEqual(getScheduledTrainingWeek(planDays, MONDAY));
    expect(getScheduledTrainingForDate(planDays, MONDAY, {})?.day.id).toBe('day-1');
  });
});

describe('funkcje harmonogramu z overrides', () => {
  const moved = { '2026-08-10': null, '2026-08-11': 'day-1' };

  it('getScheduledTrainingForDate honoruje przeniesienie', () => {
    expect(getScheduledTrainingForDate(planDays, MONDAY, moved)).toBeNull();
    expect(getScheduledTrainingForDate(planDays, TUESDAY, moved)?.day.id).toBe('day-1');
    expect(getScheduledTrainingForDate(planDays, TUESDAY, moved)?.dateKey).toBe('2026-08-11');
  });

  it('getScheduledTrainingWeek pokazuje przełożony dzień w nowej dacie, posortowany', () => {
    expect(getScheduledTrainingWeek(planDays, MONDAY, moved).map(e => [e.dateKey, e.day.id])).toEqual([
      ['2026-08-11', 'day-1'],
      ['2026-08-12', 'day-2'],
      ['2026-08-14', 'day-3'],
    ]);
  });

  it('getScheduledTrainingWeek ze swapem zachowuje obie daty', () => {
    const swap = { '2026-08-10': 'day-2', '2026-08-12': 'day-1' };
    expect(getScheduledTrainingWeek(planDays, MONDAY, swap).map(e => [e.dateKey, e.day.id])).toEqual([
      ['2026-08-10', 'day-2'],
      ['2026-08-12', 'day-1'],
      ['2026-08-14', 'day-3'],
    ]);
  });

  it('getNextScheduledTraining honoruje overrides (dzień przeniesiony na jutro)', () => {
    expect(getNextScheduledTraining(planDays, MONDAY, { overrides: moved })?.dateKey).toBe('2026-08-11');
    expect(getNextScheduledTraining(planDays, MONDAY, { includeSameDay: true, overrides: moved })?.dateKey)
      .toBe('2026-08-11');
  });
});

// WP-A (X29): buildTrainingSchedule (timeline zakładki Plan + badge NASTĘPNY)
// dostaje opcjonalne opts { overrides, planStartDateISO } i liczy każdą datę
// kanonicznym resolverem; bez opts zachowanie identyczne jak dotąd (zasada 5).
describe('buildTrainingSchedule z opts (WP-A X29)', () => {
  const asKeys = (schedule: Array<{ date: Date; dayId: string }>) =>
    schedule.map((s) => [
      `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, '0')}-${String(s.date.getDate()).padStart(2, '0')}`,
      s.dayId,
    ]);

  it('niezmiennik: bez opts wynik jak dotąd (czysta reguła weekday)', () => {
    expect(asKeys(buildTrainingSchedule(planDays, MONDAY, 2))).toEqual([
      ['2026-08-10', 'day-1'],
      ['2026-08-12', 'day-2'],
      ['2026-08-14', 'day-3'],
      ['2026-08-17', 'day-1'],
      ['2026-08-19', 'day-2'],
      ['2026-08-21', 'day-3'],
    ]);
  });

  it('niezmiennik: puste opts / pusta mapa overrides = wynik identyczny z brakiem opts', () => {
    expect(buildTrainingSchedule(planDays, MONDAY, 2, {}))
      .toEqual(buildTrainingSchedule(planDays, MONDAY, 2));
    expect(buildTrainingSchedule(planDays, MONDAY, 2, { overrides: {} }))
      .toEqual(buildTrainingSchedule(planDays, MONDAY, 2));
  });

  it('overrides: przeniesienie pon -> wt widoczne w harmonogramie, reszta nietknięta', () => {
    const moved = { '2026-08-10': null, '2026-08-11': 'day-1' };
    expect(asKeys(buildTrainingSchedule(planDays, MONDAY, 2, { overrides: moved }))).toEqual([
      ['2026-08-11', 'day-1'],
      ['2026-08-12', 'day-2'],
      ['2026-08-14', 'day-3'],
      ['2026-08-17', 'day-1'],
      ['2026-08-19', 'day-2'],
      ['2026-08-21', 'day-3'],
    ]);
  });

  it('planStartDateISO: daty przed startem planu wypadają z harmonogramu', () => {
    expect(asKeys(buildTrainingSchedule(planDays, MONDAY, 1, {
      overrides: {},
      planStartDateISO: '2026-08-12',
    }))).toEqual([
      ['2026-08-12', 'day-2'],
      ['2026-08-14', 'day-3'],
    ]);
  });
});
