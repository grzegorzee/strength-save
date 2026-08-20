import { describe, expect, it } from 'vitest';
import { nextRangeSelection } from '@/lib/date-range-select';

// T20.1: semantyka Booking — klik start, klik koniec, klik przed startem
// restartuje wybór, klik przy pełnym zakresie zaczyna od nowa.

describe('nextRangeSelection', () => {
  it('pierwszy klik ustawia from (to puste)', () => {
    expect(nextRangeSelection({ from: null, to: null }, '2026-08-23'))
      .toEqual({ from: '2026-08-23', to: null });
  });

  it('drugi klik po from ustawia to', () => {
    expect(nextRangeSelection({ from: '2026-08-23', to: null }, '2026-08-31'))
      .toEqual({ from: '2026-08-23', to: '2026-08-31' });
  });

  it('klik w ten sam dzień co from = zakres jednodniowy', () => {
    expect(nextRangeSelection({ from: '2026-08-23', to: null }, '2026-08-23'))
      .toEqual({ from: '2026-08-23', to: '2026-08-23' });
  });

  it('klik przed from restartuje from (bez błędu od>do)', () => {
    expect(nextRangeSelection({ from: '2026-08-23', to: null }, '2026-08-20'))
      .toEqual({ from: '2026-08-20', to: null });
  });

  it('klik przy pełnym zakresie zaczyna nowy wybór', () => {
    expect(nextRangeSelection({ from: '2026-08-23', to: '2026-08-31' }, '2026-08-25'))
      .toEqual({ from: '2026-08-25', to: null });
  });

  it('przełom roku: to w kolejnym roku po from', () => {
    expect(nextRangeSelection({ from: '2026-12-28', to: null }, '2027-01-10'))
      .toEqual({ from: '2026-12-28', to: '2027-01-10' });
  });
});
