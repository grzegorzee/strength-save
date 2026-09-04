// Feedback 2026-09-03: wpisy Planu zawsze według faktycznej daty malejąco,
// niezależnie od tego, kiedy cardio lub trening dopisano do bazy. Zastępuje
// T9 (dziś pierwszy, minione rosnąco na dole): ręcznie dopisane wczorajsze
// cardio lądowało POD przedwczorajszym wpisem.
import { describe, expect, it } from 'vitest';
import { orderTimelineDayKeys } from '@/lib/plan-schedule';

describe('orderTimelineDayKeys', () => {
  it('3 wrz, ręcznie dopisane 2 wrz, 1 wrz => 3, 2, 1 (kolejność wejścia bez znaczenia)', () => {
    expect(orderTimelineDayKeys(['2026-09-03', '2026-09-01', '2026-09-02']))
      .toEqual(['2026-09-03', '2026-09-02', '2026-09-01']);
  });

  it('w bieżącym tygodniu utrzymuje dziś jako hero, potem przyszłość i historię malejąco', () => {
    expect(orderTimelineDayKeys(
      ['2026-08-17', '2026-08-22', '2026-08-20', '2026-08-21'],
      '2026-08-20',
    )).toEqual(['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-17']);
  });

  it('wszystko przyszłe: rosnąco od najbliższego dnia', () => {
    expect(orderTimelineDayKeys(
      ['2026-08-24', '2026-08-27', '2026-08-25'],
      '2026-08-20',
    )).toEqual(['2026-08-24', '2026-08-25', '2026-08-27']);
  });

  it('wszystko przeszłe: malejąco', () => {
    expect(orderTimelineDayKeys(['2026-08-14', '2026-08-10', '2026-08-11']))
      .toEqual(['2026-08-14', '2026-08-11', '2026-08-10']);
  });

  it('pusta lista: pusta lista', () => {
    expect(orderTimelineDayKeys([])).toEqual([]);
  });

  it('nie modyfikuje wejściowej tablicy', () => {
    const keys = ['2026-08-17', '2026-08-21'];
    orderTimelineDayKeys(keys);
    expect(keys).toEqual(['2026-08-17', '2026-08-21']);
  });
});
