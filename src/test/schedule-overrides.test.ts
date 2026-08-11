// Krok 3 przełożenia treningu (spec 2026-08-11): mutacje mapy scheduleOverrides.
// Atomowość = buildScheduleMove zwraca JEDNĄ mapę z oboma wpisami ({A, B}) do
// pojedynczego zapisu pola; LWW = pole nadpisywane w całości, ostatni zapis wygrywa.
import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import {
  buildScheduleMove,
  pruneScheduleOverrides,
  sanitizeScheduleOverrides,
  shouldClearOverridesOnPlanSave,
} from '@/lib/schedule-overrides';

const day = (id: string, weekday: TrainingDay['weekday']): TrainingDay => ({
  id,
  dayName: id,
  weekday,
  focus: '',
  exercises: [],
});

// 2026-08-10 = poniedziałek, 2026-08-12 = środa, 2026-08-14 = piątek.
const planDays = [day('day-1', 'monday'), day('day-2', 'wednesday'), day('day-3', 'friday')];
const TODAY = '2026-08-10';

describe('sanitizeScheduleOverrides', () => {
  it('nie-mapa daje pustą mapę', () => {
    expect(sanitizeScheduleOverrides(undefined)).toEqual({});
    expect(sanitizeScheduleOverrides(null)).toEqual({});
    expect(sanitizeScheduleOverrides('oops')).toEqual({});
    expect(sanitizeScheduleOverrides(['2026-08-10'])).toEqual({});
  });

  it('zostawia tylko wpisy klucz YYYY-MM-DD -> string|null', () => {
    expect(sanitizeScheduleOverrides({
      '2026-08-10': null,
      '2026-08-11': 'day-1',
      'nie-data': 'day-1',
      '2026-13-40': 'day-1',
      '2026-08-12': 7,
      '2026-08-13': { evil: true },
    })).toEqual({ '2026-08-10': null, '2026-08-11': 'day-1' });
  });
});

describe('pruneScheduleOverrides', () => {
  it('wpisy starsze niż 28 dni wylatują, granica 28 dni zostaje', () => {
    const pruned = pruneScheduleOverrides({
      '2026-07-12': 'day-1',
      '2026-07-13': null,
      '2026-08-10': 'day-2',
      '2026-09-01': null,
    }, TODAY);
    // TODAY-29 wylatuje, TODAY-28 zostaje, dziś i przyszłość zostają.
    expect(pruned).toEqual({ '2026-07-13': null, '2026-08-10': 'day-2', '2026-09-01': null });
  });
});

describe('buildScheduleMove', () => {
  it('przeniesienie na dzień wolny: JEDNA mapa z parą {A: null, B: dayId}', () => {
    const result = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-10', toISO: '2026-08-11', todayISO: TODAY,
    });
    expect(result).toEqual({
      ok: true,
      swapped: false,
      overrides: { '2026-08-10': null, '2026-08-11': 'day-1' },
    });
  });

  it('kolizja dat: swap {A: dayIdB, B: dayIdA}', () => {
    const result = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-10', toISO: '2026-08-12', todayISO: TODAY,
    });
    expect(result).toEqual({
      ok: true,
      swapped: true,
      overrides: { '2026-08-10': 'day-2', '2026-08-12': 'day-1' },
    });
  });

  it('respektuje istniejące overrides (przeniesienie dnia już przełożonego)', () => {
    const result = buildScheduleMove({
      overrides: { '2026-08-10': null, '2026-08-11': 'day-1' },
      planDays,
      fromISO: '2026-08-11',
      toISO: '2026-08-13',
      todayISO: TODAY,
    });
    expect(result).toEqual({
      ok: true,
      swapped: false,
      overrides: { '2026-08-10': null, '2026-08-11': null, '2026-08-13': 'day-1' },
    });
  });

  it('źródło bez treningu: ok=false, mapa nietknięta', () => {
    const result = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-11', toISO: '2026-08-13', todayISO: TODAY,
    });
    expect(result.ok).toBe(false);
  });

  it('ta sama data źródła i celu: ok=false', () => {
    const result = buildScheduleMove({
      overrides: {}, planDays, fromISO: '2026-08-10', toISO: '2026-08-10', todayISO: TODAY,
    });
    expect(result.ok).toBe(false);
  });

  it('pruning przy zapisie: wpis starszy niż 28 dni znika z wyniku', () => {
    const result = buildScheduleMove({
      overrides: { '2026-07-01': null },
      planDays,
      fromISO: '2026-08-10',
      toISO: '2026-08-11',
      todayISO: TODAY,
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.overrides).toEqual({ '2026-08-10': null, '2026-08-11': 'day-1' });
  });
});

describe('shouldClearOverridesOnPlanSave', () => {
  it('edycja ćwiczeń (te same id i weekday dni) NIE czyści', () => {
    const edited = planDays.map((d, i) => (i === 0 ? { ...d, exercises: [] } : d));
    expect(shouldClearOverridesOnPlanSave(planDays, edited)).toBe(false);
  });

  it('nowy plan / reset (inny zestaw id dni) czyści', () => {
    const fresh = [day('2026-08-10-d1', 'monday'), day('2026-08-10-d2', 'wednesday')];
    expect(shouldClearOverridesOnPlanSave(planDays, fresh)).toBe(true);
  });

  it('zmiana weekday zachowanego dnia czyści', () => {
    const moved = planDays.map((d, i) => (i === 0 ? { ...d, weekday: 'tuesday' as const } : d));
    expect(shouldClearOverridesOnPlanSave(planDays, moved)).toBe(true);
  });

  it('dodanie albo usunięcie dnia czyści', () => {
    expect(shouldClearOverridesOnPlanSave(planDays, [...planDays, day('day-4', 'saturday')])).toBe(true);
    expect(shouldClearOverridesOnPlanSave(planDays, planDays.slice(0, 2))).toBe(true);
  });

  it('brak poprzedniego planu (pierwszy zapis) NIE czyści', () => {
    expect(shouldClearOverridesOnPlanSave(undefined, planDays)).toBe(false);
  });
});
