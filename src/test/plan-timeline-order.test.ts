// T9 (feedback 2026-08-20): timeline Planu w tygodniu z "dziś" układa dni od
// najbliższego — dziś pierwszy, potem przyszłe, minione dni tygodnia na dole.
import { describe, expect, it } from 'vitest';
import { orderTimelineDayKeys } from '@/lib/plan-schedule';

describe('orderTimelineDayKeys (T9)', () => {
  it('czwartek w środku tygodnia: [czw, pt, pon, wt]', () => {
    expect(orderTimelineDayKeys(
      ['2026-08-17', '2026-08-18', '2026-08-20', '2026-08-21'],
      '2026-08-20',
    )).toEqual(['2026-08-20', '2026-08-21', '2026-08-17', '2026-08-18']);
  });

  it('dzień dzisiejszy zawsze pierwszy', () => {
    expect(orderTimelineDayKeys(
      ['2026-08-21', '2026-08-20', '2026-08-17'],
      '2026-08-20',
    )[0]).toBe('2026-08-20');
  });

  it('wszystko przyszłe: rosnąco', () => {
    expect(orderTimelineDayKeys(
      ['2026-08-24', '2026-08-27', '2026-08-25'],
      '2026-08-20',
    )).toEqual(['2026-08-24', '2026-08-25', '2026-08-27']);
  });

  it('wszystko przeszłe: rosnąco', () => {
    expect(orderTimelineDayKeys(
      ['2026-08-14', '2026-08-10', '2026-08-11'],
      '2026-08-20',
    )).toEqual(['2026-08-10', '2026-08-11', '2026-08-14']);
  });

  it('pusta lista: pusta lista', () => {
    expect(orderTimelineDayKeys([], '2026-08-20')).toEqual([]);
  });

  it('nie modyfikuje wejściowej tablicy', () => {
    const keys = ['2026-08-21', '2026-08-17'];
    orderTimelineDayKeys(keys, '2026-08-20');
    expect(keys).toEqual(['2026-08-21', '2026-08-17']);
  });
});
