import { describe, expect, it } from 'vitest';
import type { BodyMeasurement } from '@/types';
import { buildMeasurementSeries, compareMeasurementsAsc, MEASUREMENT_FIELDS, MEASUREMENT_FIELD_GOALS } from '@/lib/measurement-stats';

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

  // WP-M: po edycji godziny dwa wpisy mogą dzielić dzień — klucz `${field}:${date}`
  // kolidował (delta jednego nadpisywała drugi), a sort samą datą był niestabilny.
  it('dwa wpisy tego samego dnia: porządek po recordedAt, punkty rozróżnialne po id', () => {
    const noonEpoch = new Date('2026-06-08T12:00:00').getTime();
    const series = buildMeasurementSeries([
      m('later', '2026-06-08', { waist: 87, recordedAt: noonEpoch + 6 * 3_600_000 }),
      m('earlier', '2026-06-08', { waist: 89, recordedAt: noonEpoch - 4 * 3_600_000 }),
      m('prev-day', '2026-06-01', { waist: 90 }),
    ], 'waist');

    expect(series.map((p) => p.id)).toEqual(['prev-day', 'earlier', 'later']);
    expect(series[1].delta).toBeCloseTo(-1);
    expect(series[2].delta).toBeCloseTo(-2);
  });

  it('compareMeasurementsAsc: date, potem recordedAt, fallback id (stabilny)', () => {
    const a = m('a', '2026-06-08', { recordedAt: 100 });
    const b = m('b', '2026-06-08', { recordedAt: 200 });
    const legacy1 = m('x', '2026-06-08', {});
    const legacy2 = m('y', '2026-06-08', {});
    expect(compareMeasurementsAsc(a, b)).toBeLessThan(0);
    expect(compareMeasurementsAsc(b, a)).toBeGreaterThan(0);
    // Wpisy legacy bez recordedAt: rozstrzyga id — porządek deterministyczny.
    expect(compareMeasurementsAsc(legacy1, legacy2)).toBeLessThan(0);
    expect(compareMeasurementsAsc(m('a', '2026-06-01', {}), m('b', '2026-06-08', {}))).toBeLessThan(0);
  });

  it('mapa celów pól: talia w dół zielona, ramię w górę zielone', () => {
    expect(MEASUREMENT_FIELD_GOALS.waist).toBe('down');
    expect(MEASUREMENT_FIELD_GOALS.armLeft).toBe('up');
    expect(MEASUREMENT_FIELD_GOALS.weight).toBe('neutral');
    // Każde pole z listy ma zdefiniowany cel.
    MEASUREMENT_FIELDS.forEach((f) => expect(MEASUREMENT_FIELD_GOALS[f]).toBeDefined());
  });
});
