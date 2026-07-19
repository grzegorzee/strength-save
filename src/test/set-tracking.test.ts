import { describe, expect, it } from 'vitest';
import {
  formatDistanceM,
  formatDurationSec,
  formatHistorySetLabel,
  getTrackingType,
  parseDurationInput,
  visibleSetFields,
  type TrackingType,
} from '@/lib/set-tracking';

describe('getTrackingType (Z105)', () => {
  it('default: weight_reps', () => {
    expect(getTrackingType({})).toBe('weight_reps');
    expect(getTrackingType({ isBodyweight: false })).toBe('weight_reps');
  });

  it('isBodyweight => bodyweight_reps', () => {
    expect(getTrackingType({ isBodyweight: true })).toBe('bodyweight_reps');
  });

  it('jawne pole tracking wygrywa nad isBodyweight', () => {
    expect(getTrackingType({ isBodyweight: true, tracking: 'duration' })).toBe('duration');
    expect(getTrackingType({ isBodyweight: false, tracking: 'assisted_bodyweight' })).toBe('assisted_bodyweight');
    expect(getTrackingType({ tracking: 'weight_distance_duration' })).toBe('weight_distance_duration');
  });
});

describe('visibleSetFields (Z105)', () => {
  const cases: Array<[TrackingType, string[]]> = [
    ['weight_reps', ['weight', 'reps']],
    ['bodyweight_reps', ['reps']],
    ['duration', ['duration']],
    ['weight_distance_duration', ['weight', 'distance', 'duration']],
    ['assisted_bodyweight', ['assist', 'reps']],
  ];

  it.each(cases)('%s => %j', (tracking, fields) => {
    expect(visibleSetFields(tracking)).toEqual(fields);
  });
});

describe('formatDurationSec / parseDurationInput (Z105) — mm:ss w obu kierunkach', () => {
  it('format: sekundy -> m:ss', () => {
    expect(formatDurationSec(90)).toBe('1:30');
    expect(formatDurationSec(125)).toBe('2:05');
    expect(formatDurationSec(45)).toBe('0:45');
    expect(formatDurationSec(3600)).toBe('60:00');
  });

  it('format: 0/brak -> pusty string (pusty input)', () => {
    expect(formatDurationSec(0)).toBe('');
    expect(formatDurationSec(undefined)).toBe('');
  });

  it('parse: "m:ss" -> sekundy', () => {
    expect(parseDurationInput('1:30')).toBe(90);
    expect(parseDurationInput('2:05')).toBe(125);
    expect(parseDurationInput('0:45')).toBe(45);
  });

  it('parse: gołe sekundy bez dwukropka', () => {
    expect(parseDurationInput('90')).toBe(90);
    expect(parseDurationInput('45')).toBe(45);
  });

  it('parse: round-trip format->parse', () => {
    for (const sec of [45, 90, 125, 600]) {
      expect(parseDurationInput(formatDurationSec(sec))).toBe(sec);
    }
  });

  it('parse: śmieci i puste -> 0', () => {
    expect(parseDurationInput('')).toBe(0);
    expect(parseDurationInput('abc')).toBe(0);
    expect(parseDurationInput('-10')).toBe(0);
  });
});

describe('formatHistorySetLabel (Z105) — etykieta serii w historii', () => {
  const fmtW = (kg: number) => `${kg} kg`;
  const bw = 'BW';

  it('zwykła seria: reps×weight (bez zmian)', () => {
    expect(formatHistorySetLabel({ reps: 8, weight: 60, completed: true }, fmtW, bw)).toBe('8×60 kg');
  });

  it('bodyweight: reps×BW (bez zmian)', () => {
    expect(formatHistorySetLabel({ reps: 12, weight: 0, completed: true }, fmtW, bw)).toBe('12×BW');
  });

  it('czysto czasowa: mm:ss', () => {
    expect(formatHistorySetLabel({ reps: 0, weight: 0, completed: true, durationSec: 90 }, fmtW, bw)).toBe('1:30');
  });

  it('ciężar+dystans+czas: złożona etykieta', () => {
    expect(formatHistorySetLabel(
      { reps: 0, weight: 24, completed: true, distanceM: 40, durationSec: 60 }, fmtW, bw,
    )).toBe('24 kg · 40 m · 1:00');
  });

  it('asysta: reps×-asysta', () => {
    expect(formatHistorySetLabel({ reps: 8, weight: 0, completed: true, assistWeight: 25 }, fmtW, bw)).toBe('8×-25 kg');
  });
});

describe('formatDistanceM (Z105) — m lub km wg wielkości', () => {
  it('poniżej 1000 m -> metry', () => {
    expect(formatDistanceM(400)).toBe('400 m');
    expect(formatDistanceM(50)).toBe('50 m');
  });

  it('od 1000 m -> km z 1 miejscem', () => {
    expect(formatDistanceM(1000)).toBe('1 km');
    expect(formatDistanceM(1250)).toBe('1.25 km');
    expect(formatDistanceM(5500)).toBe('5.5 km');
  });

  it('0/brak -> pusty string', () => {
    expect(formatDistanceM(0)).toBe('');
    expect(formatDistanceM(undefined)).toBe('');
  });
});
