// J-T5 (doprecyzowanie właściciela 2026-08-20): eksport CSV z wyborem zakresu.
// Czysta logika zakresów: tydzień/miesiąc/N ostatnich/cykl/od-do; niekompletny
// wybór = null (przycisk Eksportuj disabled).
import { describe, expect, it } from 'vitest';
import { exportFileName, exportRangeBounds } from '@/lib/workout-export-range';

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

  it('cykl: zakres dat cyklu; brak wybranego cyklu = null (disabled)', () => {
    expect(exportRangeBounds({ kind: 'cycle', cycle: { startDate: '2026-05-01', endDate: '2026-06-30' } }, TODAY))
      .toEqual({ mode: 'dates', fromDate: '2026-05-01', toDate: '2026-06-30' });
    expect(exportRangeBounds({ kind: 'cycle' }, TODAY)).toBeNull();
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
