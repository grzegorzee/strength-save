// WP-F (X35a): stan pre-start wyciągnięty z Dashboardu do lib/plan-prestart.
// Zachowanie 1:1: null bez daty startu lub po starcie; pierwszy trening liczony
// OD daty startu (nie od dziś), z respektem dla startDateISO w harmonogramie.
import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { buildPreStartInfo } from '@/lib/plan-prestart';

const day = (id: string, weekday: TrainingDay['weekday']): TrainingDay => ({
  id,
  dayName: `Dzień ${id}`,
  weekday,
  focus: 'Push',
  exercises: [{ id: `ex-${id}`, name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
});

// Plan: poniedziałek + środa; start planu poniedziałek 7.09.2026; dziś 25.08.2026.
const PLAN = [day('day-1', 'monday'), day('day-2', 'wednesday')];
const START = '2026-09-07';
const TODAY = new Date(2026, 7, 25);

describe('buildPreStartInfo', () => {
  it('start w przyszłości: startDateISO + pierwszy trening = pierwszy dzień planu od startu', () => {
    const info = buildPreStartInfo({ planDays: PLAN, planStartDate: START, today: TODAY });
    expect(info?.startDateISO).toBe(START);
    expect(info?.firstEntry?.dateKey).toBe(START);
    expect(info?.firstEntry?.day.id).toBe('day-1');
  });

  it('start w środę: pierwszy trening to środa startu, nie poniedziałek sprzed startu', () => {
    const info = buildPreStartInfo({ planDays: PLAN, planStartDate: '2026-09-09', today: TODAY });
    expect(info?.firstEntry?.dateKey).toBe('2026-09-09');
    expect(info?.firstEntry?.day.id).toBe('day-2');
  });

  it('przełożenie pierwszego dnia respektowane (overrides)', () => {
    const info = buildPreStartInfo({
      planDays: PLAN,
      planStartDate: START,
      today: TODAY,
      scheduleOverrides: { [START]: null, '2026-09-08': 'day-1' },
    });
    expect(info?.firstEntry?.dateKey).toBe('2026-09-08');
  });

  it('null: brak daty startu, dzień startu oraz start w przeszłości (plan wystartował)', () => {
    expect(buildPreStartInfo({ planDays: PLAN, planStartDate: null, today: TODAY })).toBeNull();
    expect(buildPreStartInfo({ planDays: PLAN, planStartDate: '2026-08-25', today: TODAY })).toBeNull();
    expect(buildPreStartInfo({ planDays: PLAN, planStartDate: '2026-08-17', today: TODAY })).toBeNull();
  });

  it('plan bez dni: karta z datą startu, ale bez pierwszego treningu', () => {
    const info = buildPreStartInfo({ planDays: [], planStartDate: START, today: TODAY });
    expect(info).toEqual({ startDateISO: START, firstEntry: null });
  });
});
