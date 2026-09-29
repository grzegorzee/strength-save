import { describe, expect, it } from 'vitest';
import {
  TRACKING_TYPES,
  formatHistorySetLabel,
  hasCompleteSetData,
  isTrackingType,
  resolveCompletionTracking,
  visibleSetFields,
} from '@/lib/set-tracking';
import {
  BODYWEIGHT_MATCH_TOLERANCE_KG,
  bodyWeightForDate,
  buildBodyWeightTimeline,
  formatBodyweightLoadLabel,
  normalizeBodyweightLoad,
  normalizeBodyweightLoadedWorkouts,
} from '@/lib/bodyweight-load';
import type { WorkoutSession } from '@/types';

// F6 (2026-09-29): ćwiczenia z masą ciała i opcjonalnym dociążeniem.
// weight przechowuje WYŁĄCZNIE dociążenie; legacy (masa ciała wpisana jako kg)
// normalizujemy przy odczycie, bez zapisów do Firestore.

describe('bodyweight_loaded w kontrakcie serii', () => {
  it('jest pełnoprawnym typem śledzenia', () => {
    expect(TRACKING_TYPES).toContain('bodyweight_loaded');
    expect(isTrackingType('bodyweight_loaded')).toBe(true);
  });

  it('seria bez kg jest zaliczona (sama masa ciała), bez powtórzeń nie', () => {
    expect(hasCompleteSetData({ reps: 8, weight: 0 }, 'bodyweight_loaded')).toBe(true);
    expect(hasCompleteSetData({ reps: 6, weight: 10 }, 'bodyweight_loaded')).toBe(true);
    expect(hasCompleteSetData({ reps: 0, weight: 10 }, 'bodyweight_loaded')).toBe(false);
  });

  it('karta pokazuje opcjonalne +kg i powtórzenia', () => {
    expect(visibleSetFields('bodyweight_loaded')).toEqual(['weight', 'reps']);
  });

  it('resolveCompletionTracking nie zmienia jawnego typu', () => {
    expect(resolveCompletionTracking('bodyweight_loaded', true, false)).toBe('bodyweight_loaded');
  });

  it('etykieta historii: MC i MC +10 kg dla serii z dociążeniem', () => {
    const fmt = (kg: number) => `${kg} kg`;
    expect(formatHistorySetLabel({ reps: 8, weight: 0 }, fmt, 'BW', 'MC')).toBe('8×MC');
    expect(formatHistorySetLabel({ reps: 6, weight: 10 }, fmt, 'BW', 'MC')).toBe('6×MC +10 kg');
    // Bez etykiety dociążenia (zwykłe ćwiczenia) format bez zmian.
    expect(formatHistorySetLabel({ reps: 6, weight: 10 }, fmt, 'BW')).toBe('6×10 kg');
  });
});

describe('formatBodyweightLoadLabel', () => {
  const fmt = (kg: number) => `${kg} kg`;
  it('MC bez dociążenia, MC +x z dociążeniem', () => {
    expect(formatBodyweightLoadLabel(0, fmt, 'MC')).toBe('MC');
    expect(formatBodyweightLoadLabel(12.5, fmt, 'MC')).toBe('MC +12.5 kg');
    expect(formatBodyweightLoadLabel(10, fmt, 'BW')).toBe('BW +10 kg');
  });
});

describe('normalizeBodyweightLoad — legacy przy odczycie', () => {
  it('74 kg przy masie ciała 74,6 = sama masa ciała (dociążenie 0)', () => {
    expect(normalizeBodyweightLoad(74, 74.6)).toBe(0);
  });

  it('granica tolerancji ±3 kg jest włączna', () => {
    expect(BODYWEIGHT_MATCH_TOLERANCE_KG).toBe(3);
    expect(normalizeBodyweightLoad(77, 74)).toBe(0);
    expect(normalizeBodyweightLoad(71, 74)).toBe(0);
    expect(normalizeBodyweightLoad(77.5, 74)).toBe(77.5);
  });

  it('12,5 kg to realne dociążenie', () => {
    expect(normalizeBodyweightLoad(12.5, 74.6)).toBe(12.5);
  });

  it('0 kg = sama masa ciała', () => {
    expect(normalizeBodyweightLoad(0, 74.6)).toBe(0);
    expect(normalizeBodyweightLoad(0, null)).toBe(0);
  });

  it('brak jakiejkolwiek masy ciała: nie przeliczamy', () => {
    expect(normalizeBodyweightLoad(74, null)).toBe(74);
  });
});

describe('bodyWeightForDate — pomiar najbliższy dacie treningu', () => {
  const timeline = buildBodyWeightTimeline([
    { date: '2026-09-20', weight: 72.5 },
    { date: '2026-08-21' }, // pomiar bez wagi (realny kształt z produkcji)
    { date: '2026-04-08', weight: 74.6 },
    { date: '2026-06-10', weight: 74 },
  ]);

  it('oś jest rosnąca i bez pomiarów bez wagi', () => {
    expect(timeline).toEqual([
      { date: '2026-04-08', weightKg: 74.6 },
      { date: '2026-06-10', weightKg: 74 },
      { date: '2026-09-20', weightKg: 72.5 },
    ]);
  });

  it('wcześniejszy albo ten sam dzień', () => {
    expect(bodyWeightForDate(timeline, '2026-06-04')).toBe(74.6);
    expect(bodyWeightForDate(timeline, '2026-06-10')).toBe(74);
    expect(bodyWeightForDate(timeline, '2026-09-28')).toBe(72.5);
  });

  it('brak pomiaru przed treningiem: aktualna (najnowsza) masa', () => {
    expect(bodyWeightForDate(timeline, '2026-01-01')).toBe(72.5);
  });

  it('pusta oś: null', () => {
    expect(bodyWeightForDate([], '2026-06-04')).toBeNull();
  });
});

const workout = (id: string, date: string, exercises: WorkoutSession['exercises']): WorkoutSession => ({
  id, userId: 'u1', dayId: 'day-1', date, completed: true, exercises,
});

describe('normalizeBodyweightLoadedWorkouts', () => {
  const isLoaded = (name: string) => name === 'Podciąganie na drążku' || name === 'Reverse Crunch na ławce';
  const timeline = buildBodyWeightTimeline([{ date: '2026-04-08', weight: 74.6 }, { date: '2026-09-20', weight: 72.5 }]);

  it('przelicza tylko ćwiczenia bodyweight_loaded, zachowuje resztę kształtu', () => {
    const input = [
      workout('w1', '2026-06-04', [
        { exerciseId: 'ex-1', name: 'Podciąganie na drążku', sets: [
          { reps: 6, weight: 74, completed: true },
          { reps: 4, weight: 74, completed: true, isWarmup: true },
        ] },
        { exerciseId: 'ex-2', name: 'Wiosłowanie sztangą', sets: [{ reps: 8, weight: 74, completed: true }] },
      ]),
      workout('w2', '2026-03-09', [
        { exerciseId: 'ex-3', name: 'Reverse Crunch na ławce', sets: [{ reps: 8, weight: 12.5, completed: true }] },
      ]),
      workout('w3', '2026-09-28', [
        { exerciseId: 'ex-1', name: 'Podciąganie na drążku', sets: [{ reps: 8, weight: 72, completed: true }] },
      ]),
    ];
    const out = normalizeBodyweightLoadedWorkouts(input, timeline, isLoaded);
    expect(out).toHaveLength(3);
    expect(out[0].exercises[0].sets.map((s) => s.weight)).toEqual([0, 0]);
    expect(out[0].exercises[0].sets[1].isWarmup).toBe(true);
    expect(out[0].exercises[1].sets[0].weight).toBe(74); // zwykłe ćwiczenie nietknięte
    expect(out[1]).toBe(input[1]); // 12,5 kg = dociążenie, obiekt bez zmian
    expect(out[2].exercises[0].sets[0].weight).toBe(0);
    // Wejście nie jest mutowane (dane z listenera Firestore).
    expect(input[0].exercises[0].sets[0].weight).toBe(74);
  });

  it('brak masy ciała albo brak zmian: ta sama referencja tablicy', () => {
    const input = [workout('w1', '2026-06-04', [
      { exerciseId: 'ex-1', name: 'Podciąganie na drążku', sets: [{ reps: 6, weight: 74, completed: true }] },
    ])];
    expect(normalizeBodyweightLoadedWorkouts(input, [], isLoaded)).toBe(input);
    const clean = [workout('w1', '2026-06-04', [
      { exerciseId: 'ex-1', name: 'Podciąganie na drążku', sets: [{ reps: 6, weight: 0, completed: true }] },
    ])];
    expect(normalizeBodyweightLoadedWorkouts(clean, timeline, isLoaded)).toBe(clean);
  });

  it('odporna na legacy kształty (brak exercises / sets)', () => {
    const broken = [{ id: 'x', userId: 'u1', dayId: 'd', date: '2026-06-04', completed: true } as unknown as WorkoutSession];
    expect(normalizeBodyweightLoadedWorkouts(broken, timeline, isLoaded)).toBe(broken);
  });
});
