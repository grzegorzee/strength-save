import { describe, expect, it } from 'vitest';
import {
  buildVacationMode,
  isVacationActive,
  resolveDeloadWeek,
  sanitizeVacationMode,
  vacationRangeDays,
  vacationToAdviceWindow,
  vacationWeekIndexes,
} from '@/lib/vacation-mode';
import { reducedModeAdviceFactor } from '@/lib/reduced-mode';
import { detectLapse } from '@/lib/lapse-detection';
import type { TrainingDay } from '@/data/trainingPlan';

// Runna pakiet 1, krok 15 (spec C4): tryb urlopu — deklaracja Z GÓRY (3-21 dni),
// przerwa PEŁNI ROLĘ deloadu (deload cyklu się nie dubluje), po powrocie rampa
// jak w C3, cykl wydłużony o pełne tygodnie (id dni bez zmian, X19).

const VAC = { startDate: '2026-08-17', endDate: '2026-08-23', activity: 'none' as const, extendedWeeks: 1 };

describe('sanitizeVacationMode / buildVacationMode', () => {
  it('przepuszcza poprawny urlop, odrzuca śmieci', () => {
    expect(sanitizeVacationMode(VAC)).toEqual(VAC);
    expect(sanitizeVacationMode({ ...VAC, activity: 'party' })).toBeNull();
    expect(sanitizeVacationMode({ ...VAC, endDate: '2026-08-01' })).toBeNull();
    expect(sanitizeVacationMode(null)).toBeNull();
  });

  it('buildVacationMode: okres z klampem 3-21 dni + wydłużenie cyklu w pełnych tygodniach', () => {
    expect(buildVacationMode('2026-08-17', 7, 'none'))
      .toEqual({ startDate: '2026-08-17', endDate: '2026-08-23', activity: 'none', extendedWeeks: 1 });
    expect(buildVacationMode('2026-08-17', 10, 'mains_only').extendedWeeks).toBe(2);
    expect(buildVacationMode('2026-08-17', 99, 'none').endDate).toBe('2026-09-06');
  });
});

describe('okno urlopu i rampa (reuse mechaniki C3)', () => {
  it('vacationToAdviceWindow: nic = pauza, główne boje = mains_only', () => {
    expect(vacationToAdviceWindow(VAC)).toEqual({ startDate: '2026-08-17', endDate: '2026-08-23', level: 'pause' });
    expect(vacationToAdviceWindow({ ...VAC, activity: 'mains_only' })?.level).toBe('mains_only');
    expect(vacationToAdviceWindow(null)).toBeNull();
  });

  it('po urlopie rampa 85% → 92% przez wspólny factor', () => {
    const window = vacationToAdviceWindow(VAC)!;
    expect(reducedModeAdviceFactor({ mode: window, todayISO: '2026-08-24', workouts: [], exerciseId: 'ex-1' }))
      .toEqual({ factor: 0.85, phase: 'ramp' });
  });

  it('isVacationActive pilnuje granic włącznie', () => {
    expect(isVacationActive(VAC, '2026-08-17')).toBe(true);
    expect(isVacationActive(VAC, '2026-08-24')).toBe(false);
    expect(isVacationActive(null, '2026-08-17')).toBe(false);
  });
});

describe('deload cyklu vs urlop (przerwa pełni rolę deloadu)', () => {
  // Plan startuje pon 2026-08-03; urlop 17-23.08 = tydzień 3 cyklu.
  const config = { enabled: true, deloadEveryWeeks: 4 };

  it('vacationWeekIndexes: tygodnie cyklu pokryte urlopem', () => {
    expect(vacationWeekIndexes(VAC, '2026-08-03')).toEqual([3]);
    expect(vacationWeekIndexes({ ...VAC, endDate: '2026-08-30', extendedWeeks: 2 }, '2026-08-03')).toEqual([3, 4]);
  });

  it('tydzień urlopu JEST deloadem, a pierwszy programowy deload po urlopie jest pomijany', () => {
    // Tydzień 3 = urlop (deload przejęty), tydzień 4 = programowy deload, ale
    // przerwa właśnie go zastąpiła — nie dublujemy; tydzień 8 wraca normalnie.
    expect(resolveDeloadWeek(3, config, VAC, '2026-08-03')).toBe(true);
    expect(resolveDeloadWeek(4, config, VAC, '2026-08-03')).toBe(false);
    expect(resolveDeloadWeek(8, config, VAC, '2026-08-03')).toBe(true);
  });

  it('bez urlopu zachowanie jak dziś (niezmiennik)', () => {
    expect(resolveDeloadWeek(4, config, null, '2026-08-03')).toBe(true);
    expect(resolveDeloadWeek(3, config, null, '2026-08-03')).toBe(false);
  });
});

describe('urlop wycisza zaległości w swoim oknie', () => {
  const day = (id: string, weekday: TrainingDay['weekday']): TrainingDay => ({
    id, dayName: id, weekday, focus: '', exercises: [],
  });

  it('zaplanowane dni w oknie urlopu nie są zaległością', () => {
    const found = detectLapse({
      planDays: [day('day-1', 'monday'), day('day-2', 'wednesday')],
      overrides: {},
      workouts: [{ date: '2026-08-12', completed: true }, { date: '2026-08-10', completed: true }],
      todayISO: '2026-08-26',
      vacation: VAC,
      dismissed: ['week:2026-08-17'],
    });
    expect(found).toBeNull();
  });
});

describe('C-T1: vacationRangeDays — zakres Od-Do włącznie', () => {
  it('zakres w środku miesiąca: 23-31 sierpnia = 9 dni', () => {
    expect(vacationRangeDays('2026-08-23', '2026-08-31')).toBe(9);
  });

  it('granica miesiąca i roku', () => {
    expect(vacationRangeDays('2026-08-28', '2026-09-03')).toBe(7);
    expect(vacationRangeDays('2026-12-28', '2027-01-03')).toBe(7);
  });

  it('DST (koniec czasu letniego 2026-10-25): dni kalendarzowe, nie 24h-owe', () => {
    expect(vacationRangeDays('2026-10-23', '2026-10-27')).toBe(5);
  });

  it('jeden dzień = 1; end < start = null; śmieci = null', () => {
    expect(vacationRangeDays('2026-08-23', '2026-08-23')).toBe(1);
    expect(vacationRangeDays('2026-08-23', '2026-08-22')).toBeNull();
    expect(vacationRangeDays('zle-dane', '2026-08-23')).toBeNull();
  });

  it('min/max: buildVacationMode nadal clampuje 3-21 (API bez zmian)', () => {
    expect(buildVacationMode('2026-08-17', 1, 'none').endDate).toBe('2026-08-19');
    expect(buildVacationMode('2026-08-17', 40, 'none').extendedWeeks).toBe(3);
  });
});
