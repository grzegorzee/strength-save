import { describe, expect, it } from 'vitest';
import { weeklyStravaKm, currentWeekCardio } from '@/lib/activity-window';
import type { StravaActivity, UnifiedActivity } from '@/types/strava';

// Z214: Dashboard pobiera tylko ostatnie okno aktywności (bieżący tydzień planu).
// Fixture >500 rekordów: wyniki kart liczone na pełnej historii i na oknie
// muszą być identyczne — okno server-side jest szersze lub równe filtrom kart.

const WEEK_START = '2026-08-03'; // poniedziałek
const WEEK_END = '2026-08-09';

const strava = (id: string, date: string, type: string, distance: number): StravaActivity => ({
  id, userId: 'u', date, type, distance, name: id,
} as unknown as StravaActivity);

const unified = (id: string, date: string, source: 'strava' | 'manual', type = 'Run'): UnifiedActivity => ({
  id, userId: 'u', date, source, type, name: id,
} as unknown as UnifiedActivity);

// 600 starych rekordów + wpisy w bieżącym tygodniu (w tym typy wykluczane).
const oldStrava = Array.from({ length: 600 }, (_, i) => strava(`old-${i}`, '2025-01-01', 'Run', 5000));
const weekStrava = [
  strava('run-1', '2026-08-04', 'Run', 10_000),
  strava('ride-1', '2026-08-06', 'Ride', 20_000),
  strava('wt-1', '2026-08-05', 'WeightTraining', 1000), // wykluczony z km
  strava('cf-1', '2026-08-07', 'Crossfit', 500), // wykluczony z km
];
const fullStrava = [...weekStrava, ...oldStrava];
const windowedStrava = fullStrava.filter(a => a.date >= WEEK_START);

describe('Z214 — weeklyStravaKm', () => {
  it('okno tygodnia daje ten sam wynik co pełna historia >500 rekordów', () => {
    const full = weeklyStravaKm(fullStrava, true, WEEK_START, WEEK_END);
    const windowed = weeklyStravaKm(windowedStrava, true, WEEK_START, WEEK_END);
    expect(full).toBe(30); // 10 km + 20 km, bez WeightTraining/Crossfit
    expect(windowed).toBe(full);
  });

  it('bez połączenia Strava licznik jest zerowy', () => {
    expect(weeklyStravaKm(fullStrava, false, WEEK_START, WEEK_END)).toBe(0);
  });
});

describe('Z214 — currentWeekCardio', () => {
  const oldUnified = Array.from({ length: 550 }, (_, i) => unified(`old-${i}`, '2025-02-01', 'strava'));
  const weekUnified = [
    unified('m-1', '2026-08-04', 'manual'),
    unified('s-1', '2026-08-05', 'strava'),
    unified('s-wt', '2026-08-06', 'strava', 'WeightTraining'), // wykluczony
  ];
  const fullList = [...weekUnified, ...oldUnified];
  const windowedList = fullList.filter(a => a.date >= WEEK_START);

  it('okno tygodnia daje te same wpisy co pełna historia', () => {
    const full = currentWeekCardio(fullList, true, WEEK_START, WEEK_END);
    const windowed = currentWeekCardio(windowedList, true, WEEK_START, WEEK_END);
    expect(full.map(a => a.id)).toEqual(['m-1', 's-1']);
    expect(windowed.map(a => a.id)).toEqual(full.map(a => a.id));
  });

  it('bez połączenia Strava zostają tylko wpisy manualne', () => {
    const result = currentWeekCardio(fullList, false, WEEK_START, WEEK_END);
    expect(result.map(a => a.id)).toEqual(['m-1']);
  });
});
