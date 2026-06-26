import { describe, expect, it } from 'vitest';
import { generateHeatmapData } from '@/lib/heatmap-utils';
import { calculateTonnage } from '@/lib/summary-utils';
import type { WorkoutSession } from '@/types';
import type { StravaActivity } from '@/types/strava';

const dateIn2026 = (offset: number): string => {
  const date = new Date(2026, 0, 1 + (offset % 365));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const workoutFixture = (index: number): WorkoutSession => ({
  id: `workout-${index}`,
  userId: 'scale-user',
  dayId: `day-${(index % 4) + 1}`,
  date: dateIn2026(index),
  completed: true,
  exercises: [
    {
      exerciseId: 'squat',
      sets: [
        { reps: 5, weight: 100 + (index % 20), completed: true },
        { reps: 5, weight: 100 + (index % 20), completed: true },
      ],
      name: 'Squat',
    },
  ],
  updatedAt: index,
  revision: 1,
});

const stravaFixture = (index: number): StravaActivity => ({
  id: `strava-${index}`,
  userId: 'scale-user',
  stravaId: index,
  name: `Run ${index}`,
  type: index % 7 === 0 ? 'WeightTraining' : 'Run',
  date: dateIn2026(index),
  distance: 5000 + (index % 1000),
  movingTime: 1800,
  stravaUrl: `https://www.strava.com/activities/${index}`,
  syncedAt: '2026-06-26T00:00:00.000Z',
});

describe('large local fixtures for read-scaling screens', () => {
  it('aggregates 5k workouts and 10k Strava activities without relying on a global listener', () => {
    const workouts = Array.from({ length: 5_000 }, (_, index) => workoutFixture(index));
    const stravaActivities = Array.from({ length: 10_000 }, (_, index) => stravaFixture(index));

    const heatmap = generateHeatmapData(workouts, stravaActivities, 2026);
    const tonnage = calculateTonnage(workouts);

    expect(heatmap).toHaveLength(365);
    expect(heatmap.some(day => day.hasWorkout)).toBe(true);
    expect(heatmap.some(day => day.hasCardio)).toBe(true);
    expect(tonnage).toBeGreaterThan(5_000 * 1_000);
  });
});
