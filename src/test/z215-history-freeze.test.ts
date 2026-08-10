import { describe, expect, it } from 'vitest';
import { buildAllTimeStats } from '@/lib/all-time-stats';
import { calculateTonnage } from '@/lib/summary-utils';
import type { WorkoutSession } from '@/types';

// Z215: zamrożenie OBECNYCH wyników obliczeń all-time na deterministycznym
// fixture >500 treningów. Z216 (recent+pagination) i Z217 (agregaty) mają
// obowiązek dawać dokładnie te wartości (test równoważności agregatu liczy
// przeciw tym samym golden values). Fixture bez losowości — pełna powtarzalność.

const dateFor = (i: number): string => {
  // Kolejne dni wstecz od 2026-08-01 (deterministycznie, bez Date.now()).
  const d = new Date(Date.UTC(2026, 7, 1));
  d.setUTCDate(d.getUTCDate() - i);
  return d.toISOString().slice(0, 10);
};

const buildFixture = (): WorkoutSession[] => {
  const workouts: WorkoutSession[] = [];
  for (let i = 0; i < 600; i += 1) {
    const weight = 40 + (i % 5) * 10; // 40..80, deterministycznie
    const reps = 5 + (i % 3); // 5..7
    workouts.push({
      id: `w-${i}`,
      userId: 'u',
      dayId: `day-${i % 3}`,
      date: dateFor(i),
      completed: i % 10 !== 9, // co dziesiąty nieukończony
      startedAt: 1700000000000 + i,
      updatedAt: 1700000000000 + i,
      durationSec: 3600,
      exercises: [
        {
          exerciseId: `ex-${i % 4}`,
          sets: [
            { reps, weight, completed: true },
            { reps, weight, completed: true },
            { reps: 10, weight: 20, completed: true, isWarmup: true }, // rozgrzewka poza tonażem
          ],
        },
      ],
    } as WorkoutSession);
  }
  return workouts;
};

describe('Z215 — golden values na fixture 600 treningów', () => {
  const fixture = buildFixture();

  it('fixture jest deterministyczny (sanity)', () => {
    expect(fixture).toHaveLength(600);
    expect(fixture.filter(w => w.completed)).toHaveLength(540);
    expect(fixture[0].date).toBe('2026-08-01');
    expect(fixture[599].date).toBe('2024-12-10');
  });

  it('tonaż all-time (bez rozgrzewki, tylko ukończone) — golden value', () => {
    const tonnage = calculateTonnage(fixture.filter(w => w.completed));
    // 540 ukończonych x 2 serie robocze x (reps x weight); rozgrzewka wykluczona.
    expect(tonnage).toBe(374400);
  });

  it('buildAllTimeStats — golden values (licznik, serie, czas, ulubione, pierwsza data)', () => {
    const stats = buildAllTimeStats(fixture);
    expect(stats.workoutCount).toBe(540);
    expect(stats.totalSets).toBe(1080); // 2 robocze na trening
    expect(stats.totalTonnageKg).toBe(374400);
    expect(stats.workoutsWithDuration).toBe(540);
    expect(stats.totalDurationSec).toBe(540 * 3600);
    // Najstarszy wpis (i=599, 2024-12-10) jest nieukończony — pierwszy UKOŃCZONY to 2024-12-11.
    expect(stats.firstWorkoutDate).toBe('2024-12-11');
    // ex-0 wypada w i%4==0 (150 wpisów); żaden nie koliduje z i%10==9, więc wszystkie ukończone.
    expect(stats.favoriteExercise?.sessions).toBe(150);
    // Longest streak: golden z OBECNEJ implementacji (liczy TYGODNIE z treningiem;
    // dziura co 10 dni nie przerywa tygodnia). Current streak liczy od realnego
    // "dziś", więc jego wartość na stałym fixture dryfuje w czasie — nie zamrażamy.
    expect(stats.longestStreak).toBe(86);
    expect(stats.currentStreak).toBeGreaterThanOrEqual(0);
  });
});
