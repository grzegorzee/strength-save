// J-T5 (doprecyzowanie właściciela 2026-08-20): eksport CSV z wyborem zakresu.
// Czysta logika zakresów: tydzień/miesiąc/N ostatnich/cykl/od-do; niekompletny
// wybór = null (przycisk Eksportuj disabled).
import { describe, expect, it } from 'vitest';
import { exportFileName, exportRangeBounds, workoutBelongsToExportCycle } from '@/lib/workout-export-range';
import { buildCanonicalState } from '@/test/canonical-states';

const TODAY = '2026-08-20';

describe('exportRangeBounds', () => {
  it('tydzień: 7 dni wstecz włącznie z dziś', () => {
    expect(exportRangeBounds({ kind: 'week' }, TODAY))
      .toEqual({ mode: 'dates', fromDate: '2026-08-14', toDate: '2026-08-20' });
  });

  it('miesiąc: 30 dni wstecz włącznie z dziś', () => {
    expect(exportRangeBounds({ kind: 'month' }, TODAY))
      .toEqual({ mode: 'dates', fromDate: '2026-07-22', toDate: '2026-08-20' });
  });

  it('ostatnie 10 / 30 treningów: limit liczby, bez dat', () => {
    expect(exportRangeBounds({ kind: 'last10' }, TODAY)).toEqual({ mode: 'lastN', limit: 10 });
    expect(exportRangeBounds({ kind: 'last30' }, TODAY)).toEqual({ mode: 'lastN', limit: 30 });
  });

  it('cykl: tryb cycle (daty zapytania + cycleId do filtra); brak wybranego cyklu = null (disabled)', () => {
    // WP-D (X35a): zakres cyklu liczony po cycleId, daty tylko zawężają zapytanie.
    expect(exportRangeBounds({ kind: 'cycle', cycle: { id: 'c-1', startDate: '2026-05-01', endDate: '2026-06-30' } }, TODAY))
      .toEqual({ mode: 'cycle', cycleId: 'c-1', fromDate: '2026-05-01', toDate: '2026-06-30' });
    expect(exportRangeBounds({ kind: 'cycle' }, TODAY)).toBeNull();
  });

  it('WP-D: przynależność do cyklu — cycleId wygrywa, brak cycleId = legacy po datach', () => {
    expect(workoutBelongsToExportCycle({ cycleId: 'c-1' }, 'c-1')).toBe(true);
    expect(workoutBelongsToExportCycle({}, 'c-1')).toBe(true);
    expect(workoutBelongsToExportCycle({ cycleId: 'c-other' }, 'c-1')).toBe(false);
  });

  it('bug 45: aktywny cykl (kanoniczny endDate "") domyka zakres na dziś', () => {
    // Produkcja: createActiveCycle zapisuje endDate '' aż do archiwizacji.
    // Bez fallbacku zapytanie leci bez górnej granicy (workout-read-store
    // pomija toDate przy pustym stringu) — inaczej niż ścieżka z Historii
    // (WorkoutHistory: endDate || todayStr).
    const active = buildCanonicalState('active-plan', TODAY).cycles[0];
    expect(active.endDate).toBe('');
    expect(exportRangeBounds({ kind: 'cycle', cycle: { id: active.id, startDate: active.startDate, endDate: active.endDate } }, TODAY))
      .toEqual({ mode: 'cycle', cycleId: active.id, fromDate: active.startDate, toDate: TODAY });
  });

  it('własny zakres: puste od = od początku, puste do = dziś; od > do = null', () => {
    expect(exportRangeBounds({ kind: 'custom', from: '2026-01-05', to: '2026-02-01' }, TODAY))
      .toEqual({ mode: 'dates', fromDate: '2026-01-05', toDate: '2026-02-01' });
    expect(exportRangeBounds({ kind: 'custom', to: '2026-02-01' }, TODAY))
      .toEqual({ mode: 'dates', fromDate: '1970-01-01', toDate: '2026-02-01' });
    expect(exportRangeBounds({ kind: 'custom', from: '2026-01-05' }, TODAY))
      .toEqual({ mode: 'dates', fromDate: '2026-01-05', toDate: TODAY });
    expect(exportRangeBounds({ kind: 'custom', from: '2026-03-01', to: '2026-02-01' }, TODAY)).toBeNull();
  });
});

describe('exportFileName', () => {
  it('strengthsave-treningi-<od>-<do>.csv z dat eksportowanych treningów', () => {
    const workouts = [
      { date: '2026-08-20' },
      { date: '2026-08-05' },
      { date: '2026-08-12' },
    ];
    expect(exportFileName(workouts)).toBe('strengthsave-treningi-2026-08-05-2026-08-20.csv');
  });

  it('jeden trening: od = do', () => {
    expect(exportFileName([{ date: '2026-08-20' }])).toBe('strengthsave-treningi-2026-08-20-2026-08-20.csv');
  });
});
