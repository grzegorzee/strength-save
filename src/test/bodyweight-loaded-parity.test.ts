import { describe, expect, it } from 'vitest';
import { exerciseLibrary, findLibraryExercise } from '@/data/exerciseLibrary';
import * as client from '@/lib/bodyweight-load';
import * as server from '../../functions/src/bodyweight-loaded';

// F6: agregat all-time i Garmin (functions) normalizują legacy tą samą regułą
// i tą samą listą nazw co klient. Rozjazd = Dashboard/zegarek liczą inny tonaż
// niż Historia.
describe('bodyweight_loaded — parytet src vs functions', () => {
  it('lista nazw = biblioteka (tracking bodyweight_loaded) + aliasy', () => {
    const library = exerciseLibrary.filter((e) => e.tracking === 'bodyweight_loaded').map((e) => e.name);
    const serverNames = [...server.BODYWEIGHT_LOADED_EXERCISE_NAMES];
    expect(serverNames.filter((name) => exerciseLibrary.some((e) => e.name === name)).sort()).toEqual([...library].sort());
    // Każdy alias po stronie serwera rozwiązuje się w kliencie do ćwiczenia bodyweight_loaded.
    serverNames.filter((name) => !exerciseLibrary.some((e) => e.name === name)).forEach((alias) => {
      expect(findLibraryExercise(alias)?.tracking, alias).toBe('bodyweight_loaded');
    });
  });

  it('ta sama tolerancja i ten sam wynik normalizacji', () => {
    expect(server.BODYWEIGHT_MATCH_TOLERANCE_KG).toBe(client.BODYWEIGHT_MATCH_TOLERANCE_KG);
    const cases: Array<[number, number | null]> = [[74, 74.6], [77, 74], [77.5, 74], [12.5, 74.6], [0, 74], [74, null]];
    cases.forEach(([weight, bw]) => {
      expect(server.normalizeBodyweightLoad(weight, bw)).toBe(client.normalizeBodyweightLoad(weight, bw));
    });
    const measurements = [{ date: '2026-09-20', weight: 72.5 }, { date: '2026-08-21' }, { date: '2026-04-08', weight: 74.6 }];
    const ct = client.buildBodyWeightTimeline(measurements);
    const st = server.buildBodyWeightTimeline(measurements);
    ['2026-01-01', '2026-06-04', '2026-09-28'].forEach((date) => {
      expect(server.bodyWeightForDate(st, date)).toBe(client.bodyWeightForDate(ct, date));
    });
  });
});
