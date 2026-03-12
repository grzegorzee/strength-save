import { describe, it, expect } from 'vitest';
import { generateHeatmapData, getIntensityLevel } from '@/lib/heatmap-utils';
import type { WorkoutSession } from '@/types';
import type { StravaActivity } from '@/types/strava';

const makeWorkout = (date: string, tonnage: number): WorkoutSession => ({
  id: `w-${date}`, userId: 'u1', dayId: 'day1', date, completed: true,
  exercises: [{
    exerciseId: 'ex1',
    sets: [{ reps: tonnage / 10, weight: 10, completed: true }],
  }],
});

const makeStrava = (date: string, km: number): StravaActivity => ({
  id: `s-${date}`, userId: 'u1', stravaId: 1, name: 'Run', type: 'Run',
  date, distance: km * 1000, stravaUrl: '', syncedAt: '',
});

describe('generateHeatmapData', () => {
  it('returns 365 days for non-leap year', () => {
    const days = generateHeatmapData([], [], 2025);
    expect(days).toHaveLength(365);
  });

  it('returns 366 days for leap year', () => {
    const days = generateHeatmapData([], [], 2024);
    expect(days).toHaveLength(366);
  });

  it('workout day has hasWorkout=true and tonnage', () => {
    const workouts = [makeWorkout('2026-03-01', 1000)];
    const days = generateHeatmapData(workouts, [], 2026);
    const march1 = days.find(d => d.date === '2026-03-01');
    expect(march1?.hasWorkout).toBe(true);
    expect(march1?.strengthTonnage).toBe(1000);
  });

  it('strava day has hasCardio=true and km', () => {
    const strava = [makeStrava('2026-03-01', 5.3)];
    const days = generateHeatmapData([], strava, 2026);
    const march1 = days.find(d => d.date === '2026-03-01');
    expect(march1?.hasCardio).toBe(true);
    expect(march1?.cardioKm).toBe(5.3);
  });

  it('both in one day are merged', () => {
    const workouts = [makeWorkout('2026-03-01', 500)];
    const strava = [makeStrava('2026-03-01', 3)];
    const days = generateHeatmapData(workouts, strava, 2026);
    const march1 = days.find(d => d.date === '2026-03-01');
    expect(march1?.hasWorkout).toBe(true);
    expect(march1?.hasCardio).toBe(true);
  });
});

describe('getIntensityLevel', () => {
  it('no activity → 0', () => {
    expect(getIntensityLevel({ date: '2026-01-01', strengthTonnage: 0, cardioKm: 0, hasWorkout: false, hasCardio: false })).toBe(0);
  });

  it('cardio only → 1', () => {
    expect(getIntensityLevel({ date: '2026-01-01', strengthTonnage: 0, cardioKm: 5, hasWorkout: false, hasCardio: true })).toBe(1);
  });

  it('workout + cardio → 3', () => {
    expect(getIntensityLevel({ date: '2026-01-01', strengthTonnage: 500, cardioKm: 5, hasWorkout: true, hasCardio: true }, 1000)).toBe(3);
  });
});
