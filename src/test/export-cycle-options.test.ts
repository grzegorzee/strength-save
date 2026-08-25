// WP-D (X35a): jedna lista cykli do eksportu (sheet Historii + dialog
// Ustawień/Analityki): filtr widoczności, numeracja od najstarszego, etykieta
// "Cykl N · nazwa · start → koniec|w toku · n treningów", domyślnie aktywny.
// Fixtury przez canonical-states (zasada 11).
import { describe, expect, it } from 'vitest';
import { translate } from '@/i18n';
import { buildExportCycleOptions, defaultExportCycleId } from '@/lib/export-cycle-options';
import { buildCanonicalState } from '@/test/canonical-states';

const TODAY = '2026-08-20';
const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('pl', key, params);

const optionsFor = (stateId: Parameters<typeof buildCanonicalState>[0], todayISO = TODAY) => {
  const state = buildCanonicalState(stateId, todayISO);
  return { state, options: buildExportCycleOptions({ cycles: state.cycles, workouts: state.workouts, todayISO, lang: 'pl', t }) };
};

describe('buildExportCycleOptions', () => {
  it('history-multi-cycle: najnowszy pierwszy, numeracja od najstarszego, aktywny z nazwą planu i "w toku"', () => {
    const { state, options } = optionsFor('history-multi-cycle');
    const active = state.cycles.find((c) => c.status === 'active')!;
    const past = state.cycles.find((c) => c.status === 'completed')!;

    expect(options.map((o) => o.id)).toEqual([active.id, past.id]);
    expect(options[0]).toMatchObject({ number: 2, isActive: true, workoutCount: 2, title: 'Cykl 2 · Mój plan siłowy' });
    expect(options[0].detail).toMatch(/→ w toku · 2 treningi$/);
    expect(options[0].label).toBe(`${options[0].title} · ${options[0].detail}`);
    // Przeszły cykl sprzed zapisu odpowiedzi: bez nazwy, liczba ze stats.
    expect(options[1]).toMatchObject({ number: 1, isActive: false, workoutCount: 8, title: 'Cykl 1' });
    expect(options[1].detail).toMatch(/· 8 treningów$/);
    expect(options[1].detail).not.toMatch(/w toku/);
  });

  it('licznik aktywnego cyklu: tylko ukończone sesje należące do cyklu (draft i cudzy cycleId odpadają, legacy bez cycleId wchodzi)', () => {
    const { state } = optionsFor('history-multi-cycle');
    const active = state.cycles.find((c) => c.status === 'active')!;
    const inCycle = state.workouts.filter((w) => w.cycleId === active.id && w.completed);
    const legacy = { ...inCycle[0], id: 'legacy', cycleId: undefined };
    const foreign = { ...inCycle[0], id: 'foreign', cycleId: 'cycle-inny' };
    const options = buildExportCycleOptions({
      cycles: [active],
      workouts: [...state.workouts, legacy, foreign],
      todayISO: TODAY,
      lang: 'pl',
      t,
    });
    expect(options[0].workoutCount).toBe(inCycle.length + 1);
  });

  it('filtr widoczności: cykl techniczny i pusty completed nie wchodzą; brak cykli = brak domyślnego', () => {
    const { state } = optionsFor('history-multi-cycle');
    const cycles = state.cycles.map((c) => (c.status === 'active'
      ? { ...c, technical: true }
      : { ...c, stats: { ...c.stats, totalWorkouts: 0 } }));
    const options = buildExportCycleOptions({ cycles, workouts: state.workouts, todayISO: TODAY, lang: 'pl', t });
    expect(options).toEqual([]);
    expect(defaultExportCycleId(options)).toBeNull();
  });

  it('domyślny wybór: aktywny cykl, a bez aktywnego najnowszy', () => {
    const multi = optionsFor('history-multi-cycle');
    const active = multi.state.cycles.find((c) => c.status === 'active')!;
    expect(defaultExportCycleId(multi.options)).toBe(active.id);

    const ended = optionsFor('plan-ended');
    expect(ended.options).toHaveLength(1);
    expect(defaultExportCycleId(ended.options)).toBe(ended.state.cycles[0].id);
  });

  it('cykl z innego roku niż dziś dostaje rok w datach; EN używa nazw szablonu i "ongoing"', () => {
    const { state } = optionsFor('history-multi-cycle');
    const active = state.cycles.find((c) => c.status === 'active')!;
    const en = buildExportCycleOptions({
      cycles: [active],
      workouts: state.workouts,
      todayISO: '2027-01-10',
      lang: 'en',
      t: (key, params) => translate('en', key, params),
    });
    expect(en[0].title).toBe('Cycle 1 · Mój plan siłowy');
    expect(en[0].detail).toMatch(/2026/);
    expect(en[0].detail).toMatch(/→ ongoing · \d+ workouts?$/);
  });

  it('plural PL: 1 trening / 3 treningi / 5 treningów / 22 treningi', () => {
    const { state } = optionsFor('plan-ended');
    const cycle = state.cycles[0];
    const detailFor = (n: number) => buildExportCycleOptions({
      cycles: [{ ...cycle, stats: { ...cycle.stats, totalWorkouts: n } }],
      workouts: [],
      todayISO: TODAY,
      lang: 'pl',
      t,
    })[0].detail;
    expect(detailFor(1)).toMatch(/1 trening$/);
    expect(detailFor(3)).toMatch(/3 treningi$/);
    expect(detailFor(5)).toMatch(/5 treningów$/);
    expect(detailFor(22)).toMatch(/22 treningi$/);
  });
});
