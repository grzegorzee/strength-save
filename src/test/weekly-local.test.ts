import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { buildLocalWeeklySummaries } from '@/lib/weekly-summary';

const session = (id: string, date: string, weight: number): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [{
    exerciseId: 'ex-1-1',
    name: 'Wyciskanie sztangi na ławce płaskiej',
    sets: [{ reps: 10, weight, completed: true }],
  }],
});

describe('buildLocalWeeklySummaries (Z78)', () => {
  // now = środa 2026-07-01; tygodnie: 2026-06-29 (bieżący), 2026-06-22, 2026-06-15...
  const now = new Date('2026-07-01T12:00:00');

  it('liczy tygodnie lokalnie z workouts: tonaż, liczba treningów, PR', () => {
    const workouts = [
      session('w1', '2026-06-23', 60),  // tydzień 2026-06-22
      session('w2', '2026-06-25', 60),  // tydzień 2026-06-22
      session('w3', '2026-06-30', 80),  // tydzień 2026-06-29 — nowy PR ciężaru
    ];
    const summaries = buildLocalWeeklySummaries(workouts, [], [], now);

    expect(summaries).toHaveLength(2);
    // Najnowszy tydzień pierwszy.
    expect(summaries[0].weekStart).toBe('2026-06-29');
    expect(summaries[0].stats.workoutCount).toBe(1);
    expect(summaries[0].stats.tonnageKg).toBe(800);
    expect(summaries[0].stats.prs.length).toBeGreaterThan(0);
    expect(summaries[1].weekStart).toBe('2026-06-22');
    expect(summaries[1].stats.workoutCount).toBe(2);
    expect(summaries[1].stats.tonnageKg).toBe(1200);
  });

  it('tygodnie bez danych są pomijane', () => {
    const summaries = buildLocalWeeklySummaries([session('w1', '2026-04-15', 60)], [], [], now, 12);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].weekStart).toBe('2026-04-13');
  });

  it('puste dane → []', () => {
    expect(buildLocalWeeklySummaries([], [], [], now)).toEqual([]);
  });
});
