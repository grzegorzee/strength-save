import { describe, expect, it } from 'vitest';
import { calculateTonnage } from '@/lib/summary-utils';
import type { WorkoutSession } from '@/types';

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

describe('large local fixtures for read-scaling screens', () => {
  // X35a W1: roczna heatmapa (generateHeatmapData, 10k aktywności Strava) usunięta;
  // zostaje agregat tonażu z 5k treningów.
  it('aggregates 5k workouts without relying on a global listener', () => {
    const workouts = Array.from({ length: 5_000 }, (_, index) => workoutFixture(index));

    const tonnage = calculateTonnage(workouts);

    expect(tonnage).toBeGreaterThan(5_000 * 1_000);
  });
});
