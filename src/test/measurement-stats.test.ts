import { describe, expect, it } from 'vitest';
import type { BodyMeasurement } from '@/types';
import { buildMeasurementSeries, MEASUREMENT_FIELDS, MEASUREMENT_FIELD_GOALS } from '@/lib/measurement-stats';

const m = (id: string, date: string, fields: Partial<BodyMeasurement>): BodyMeasurement => ({
  id,
  userId: 'u1',
  date,
  ...fields,
});

describe('buildMeasurementSeries (Z77)', () => {
  it('sortuje po dacie rosnąco i liczy deltę vs poprzedni pomiar pola', () => {
    const series = buildMeasurementSeries([
      m('c', '2026-06-15', { waist: 88 }),
      m('a', '2026-06-01', { waist: 90 }),
      m('b', '2026-06-08', { waist: 89.5 }),
    ], 'waist');
    expect(series.map((p) => p.date)).toEqual(['2026-06-01', '2026-06-08', '2026-06-15']);
    expect(series[0].delta).toBeNull();
    expect(series[1].delta).toBeCloseTo(-0.5);
    expect(series[2].delta).toBeCloseTo(-1.5);
  });

  it('pomija wpisy bez pola', () => {
    const series = buildMeasurementSeries([
      m('a', '2026-06-01', { waist: 90 }),
      m('b', '2026-06-08', { weight: 82 }),
      m('c', '2026-06-15', { waist: 89 }),
    ], 'waist');
    expect(series).toHaveLength(2);
    expect(series[1].delta).toBeCloseTo(-1);
  });

  it('puste dane → []', () => {
    expect(buildMeasurementSeries([], 'weight')).toEqual([]);
  });

  it('mapa celów pól: talia w dół zielona, ramię w górę zielone', () => {
    expect(MEASUREMENT_FIELD_GOALS.waist).toBe('down');
    expect(MEASUREMENT_FIELD_GOALS.armLeft).toBe('up');
    expect(MEASUREMENT_FIELD_GOALS.weight).toBe('neutral');
    // Każde pole z listy ma zdefiniowany cel.
    MEASUREMENT_FIELDS.forEach((f) => expect(MEASUREMENT_FIELD_GOALS[f]).toBeDefined());
  });
});
