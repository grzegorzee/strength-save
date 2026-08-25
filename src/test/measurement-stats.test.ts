import { describe, expect, it } from 'vitest';
import type { BodyMeasurement } from '@/types';
import { buildMeasurementSeries, compareMeasurementsAsc, MEASUREMENT_FIELDS, MEASUREMENT_FIELD_GOALS, weightDeltaTone } from '@/lib/measurement-stats';

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

// WP-G (X35a): ton delty WAGI zależy od celu usera (profile.trainingProfile.objective),
// jedna funkcja dla wiersza historii, badge'u trendu i wykresu.
describe('weightDeltaTone (WP-G)', () => {
  it.each([
    ['fat_loss', -1.2, 'success'],
    ['fat_loss', 0.8, 'destructive'],
    ['build_muscle', 0.8, 'success'],
    ['build_muscle', -1.2, 'destructive'],
    ['peak_strength', 0.8, 'success'],
    ['peak_strength', -1.2, 'destructive'],
    ['athletic', 0.8, 'neutral'],
    ['athletic', -1.2, 'neutral'],
    [undefined, 0.8, 'neutral'],
    [undefined, -1.2, 'neutral'],
    ['nieznany-cel', 2, 'neutral'],
  ] as const)('cel %s, delta %s -> %s', (objective, delta, tone) => {
    expect(weightDeltaTone(delta, objective)).toBe(tone);
  });

  it('|delta| < 0.1 = neutral niezależnie od celu (szum wagi)', () => {
    expect(weightDeltaTone(0.05, 'fat_loss')).toBe('neutral');
    expect(weightDeltaTone(-0.09, 'build_muscle')).toBe('neutral');
    expect(weightDeltaTone(0, 'fat_loss')).toBe('neutral');
    expect(weightDeltaTone(0.1, 'fat_loss')).toBe('destructive');
    expect(weightDeltaTone(-0.1, 'fat_loss')).toBe('success');
  });

  it('null / NaN delta = neutral', () => {
    expect(weightDeltaTone(null, 'fat_loss')).toBe('neutral');
    expect(weightDeltaTone(Number.NaN, 'fat_loss')).toBe('neutral');
  });
});
