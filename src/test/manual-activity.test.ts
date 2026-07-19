import { describe, expect, it } from 'vitest';
import {
  MANUAL_ACTIVITY_TYPES,
  manualActivityToUnified,
  sanitizeManualActivity,
  stravaToUnified,
} from '@/lib/manual-activity';
import type { StravaActivity } from '@/types/strava';

describe('sanitizeManualActivity (Z111)', () => {
  it('minimalny wpis: typ + czas (15 sekund do zapisu)', () => {
    const out = sanitizeManualActivity({ type: 'Treadmill', date: '2026-07-19', movingTime: 1800 });
    expect(out).toEqual({ type: 'Treadmill', date: '2026-07-19', movingTime: 1800 });
  });

  it('typ spoza zamkniętej listy => null', () => {
    expect(sanitizeManualActivity({ type: 'Krav Maga', date: '2026-07-19', movingTime: 600 })).toBeNull();
    expect(MANUAL_ACTIVITY_TYPES).toContain('Run');
    expect(MANUAL_ACTIVITY_TYPES).toContain('HIIT');
  });

  it('czas <= 0 albo zła data => null', () => {
    expect(sanitizeManualActivity({ type: 'Run', date: '2026-07-19', movingTime: 0 })).toBeNull();
    expect(sanitizeManualActivity({ type: 'Run', date: 'zaraz', movingTime: 600 })).toBeNull();
  });

  it('opcjonalne pola walidowane i clampowane; bez undefined', () => {
    const out = sanitizeManualActivity({
      type: 'Run', date: '2026-07-19', movingTime: 1800,
      distance: 5000, averageHeartrate: 152, calories: 400,
      perceivedIntensity: 'moderate', name: '  Bieg wieczorem  ',
    })!;
    expect(out).toEqual({
      type: 'Run', date: '2026-07-19', movingTime: 1800,
      distance: 5000, averageHeartrate: 152, calories: 400,
      perceivedIntensity: 'moderate', name: 'Bieg wieczorem',
    });
    expect(Object.values(out).every((v) => v !== undefined)).toBe(true);
  });

  it('śmieciowe wartości opcjonalne pomijane (nie null-ują wpisu)', () => {
    const out = sanitizeManualActivity({
      type: 'Walk', date: '2026-07-19', movingTime: 1200,
      distance: -5, averageHeartrate: 500, perceivedIntensity: 'ultra' as never,
    })!;
    expect(out).toEqual({ type: 'Walk', date: '2026-07-19', movingTime: 1200 });
  });
});

describe('mergeActivities (Z111)', () => {
  it('scala Strava + manual, sort malejąco po dacie, stabilnie', async () => {
    const { mergeActivities } = await import('@/lib/manual-activity');
    const strava = [
      { id: 's1', userId: 'u1', stravaId: 1, name: 'A', type: 'Run', date: '2026-07-15', stravaUrl: '', syncedAt: '' },
      { id: 's2', userId: 'u1', stravaId: 2, name: 'B', type: 'Ride', date: '2026-07-19', stravaUrl: '', syncedAt: '' },
    ] as StravaActivity[];
    const manual = [
      { id: 'm1', userId: 'u1', type: 'Treadmill' as const, date: '2026-07-17', movingTime: 1800, createdAt: 1 },
    ];
    const merged = mergeActivities(strava, manual);
    expect(merged.map((a) => a.id)).toEqual(['s2', 'm1', 's1']);
    expect(merged.map((a) => a.source)).toEqual(['strava', 'manual', 'strava']);
  });

  it('puste wejścia => pusta lista', async () => {
    const { mergeActivities } = await import('@/lib/manual-activity');
    expect(mergeActivities([], [])).toEqual([]);
  });
});

describe('manualActivityToUnified / stravaToUnified (Z111)', () => {
  it('wpis manualny dostaje source=manual i kształt StravaActivity', () => {
    const unified = manualActivityToUnified({
      id: 'ma-1', userId: 'u1', type: 'Treadmill', date: '2026-07-19', movingTime: 1800,
      perceivedIntensity: 'hard', createdAt: 123,
    });
    expect(unified.source).toBe('manual');
    expect(unified.type).toBe('Treadmill');
    expect(unified.movingTime).toBe(1800);
    expect(unified.perceivedIntensity).toBe('hard');
  });

  it('aktywność Strava dostaje source=strava bez zmiany pól', () => {
    const strava: StravaActivity = {
      id: 's1', userId: 'u1', stravaId: 42, name: 'Morning Run', type: 'Run',
      date: '2026-07-18', movingTime: 2400, averageHeartrate: 155,
      stravaUrl: 'https://strava.com/activities/42', syncedAt: '2026-07-18T10:00:00Z',
    };
    const unified = stravaToUnified(strava);
    expect(unified.source).toBe('strava');
    expect(unified.averageHeartrate).toBe(155);
    expect(unified.stravaUrl).toBe('https://strava.com/activities/42');
  });
});
