import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { buildLegacyBodyweightHistory } from '@/test/canonical-states';
import { calculateTonnage } from '@/lib/summary-utils';
import { countCompletedWorkouts, selectCompletedWorkouts } from '@/lib/completed-workouts';
import { buildBodyWeightTimeline, normalizeBodyweightLoadedWorkouts } from '@/lib/bodyweight-load';
import { isBodyweightLoadedExercise } from '@/data/exerciseLibrary';
import { createPrefilledSets } from '@/lib/exercise-utils';

// F6: normalizacja legacy przy ODCZYCIE — hook oddaje ekranom dane znormalizowane,
// akcje i ścieżki sync/eksport/naprawa pracują na surowych (zero przepisań).

const history = buildLegacyBodyweightHistory();

const store = vi.hoisted(() => ({
  subscribe: vi.fn((..._args: unknown[]) => () => undefined),
  snapshot: {
    workouts: [] as unknown[],
    measurements: [] as unknown[],
    isLoaded: true,
    error: null,
    measurementError: null,
    workoutsFromCache: false,
    healthDataIncomplete: false,
    healthError: null,
  },
}));

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {} }));
vi.mock('@/hooks/useHealthConsent', () => ({ useActiveHealthGrant: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/workout-read-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/workout-read-store')>()),
  subscribeWorkoutReads: store.subscribe,
  getWorkoutReadSnapshot: () => store.snapshot,
}));

import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';

const pullWeights = (workouts: Array<{ exercises: Array<{ name?: string; sets: Array<{ weight: number }> }> }>) =>
  workouts.flatMap((w) => w.exercises.filter((e) => e.name === 'Podciąganie na drążku').flatMap((e) => e.sets.map((s) => s.weight)));

beforeEach(() => {
  store.subscribe.mockClear();
  store.snapshot = { ...store.snapshot, workouts: history.workouts, measurements: history.measurements };
});

describe('useFirebaseWorkouts — normalizacja bodyweight_loaded przy odczycie', () => {
  it('ekran dostaje podciąganie jako MC (0 kg), tonaż bez masy ciała', () => {
    const { result } = renderHook(() => useFirebaseWorkouts('canonical-user-1', { measurements: 'none' }));
    expect(pullWeights(result.current.workouts)).toEqual(Array(13).fill(0));
    // Reverse Crunch 12,5/15 kg to realne dociążenie; wiosłowanie nietknięte.
    const expected = calculateTonnage(selectCompletedWorkouts(result.current.workouts));
    expect(result.current.getTotalWeight()).toBe(expected);
    expect(result.current.getTotalWeight()).toBe(8 * 12.5 * 2 + 8 * 15 + 8 * (60 + 60 + 62.5 + 62.5 + 65 + 65 + 65 + 65));
    // Tier 'none' ekranu prezentującego dane = sonda pomiarów (masa ciała).
    expect(store.subscribe.mock.calls[0][2]).toBe('latest');
  });

  it('rawWorkouts (sync/import/naprawa): surowe dane i bez sondy pomiarów', () => {
    const { result } = renderHook(() => useFirebaseWorkouts('canonical-user-1', { measurements: 'none', rawWorkouts: true }));
    expect(pullWeights(result.current.workouts)).toEqual([...Array(10).fill(74), 72, 72, 72]);
    expect(result.current.workouts).toBe(history.workouts);
    expect(store.subscribe.mock.calls[0][2]).toBe('none');
  });

  it('brak pomiarów wagi: nie przeliczamy (dane jak w bazie)', () => {
    store.snapshot = { ...store.snapshot, measurements: [] };
    const { result } = renderHook(() => useFirebaseWorkouts('canonical-user-1', { measurements: 'latest' }));
    expect(result.current.workouts).toBe(history.workouts);
  });
});

describe('Niezmiennik historii (zasada 5): normalizacja niczego nie zabiera', () => {
  const normalized = normalizeBodyweightLoadedWorkouts(
    history.workouts, buildBodyWeightTimeline(history.measurements), isBodyweightLoadedExercise,
  );

  it('ta sama liczba sesji, ćwiczeń i serii; zmienia się tylko ciężar podciągania', () => {
    expect(normalized).toHaveLength(history.workouts.length);
    expect(countCompletedWorkouts(normalized)).toBe(countCompletedWorkouts(history.workouts));
    normalized.forEach((workout, i) => {
      const raw = history.workouts[i];
      expect(workout.id).toBe(raw.id);
      expect(workout.exercises.map((e) => [e.exerciseId, e.sets.length, e.sets.map((s) => s.reps)]))
        .toEqual(raw.exercises.map((e) => [e.exerciseId, e.sets.length, e.sets.map((s) => s.reps)]));
    });
  });

  it('tonaż klasyczny: masa ciała z podciągania nie jest tonażem', () => {
    const rawTonnage = calculateTonnage(selectCompletedWorkouts(history.workouts));
    const pullReps = 6 + 4 + 7 + 6 + 5 + 4 + 8 + 6 + 6 + 5;
    expect(rawTonnage - calculateTonnage(selectCompletedWorkouts(normalized))).toBe(pullReps * 74 + (8 + 5 + 5) * 72);
  });
});

describe('Prefill z historii legacy (F6): masa ciała NIE trafia do pola +kg', () => {
  const normalized = normalizeBodyweightLoadedWorkouts(
    history.workouts, buildBodyWeightTimeline(history.measurements), isBodyweightLoadedExercise,
  );

  it('ostatnia sesja podciągania 72 kg (MC 72,5) → prefill dociążenia 0', () => {
    const last = [...normalized].sort((a, b) => b.date.localeCompare(a.date))[0];
    const prevSets = last.exercises.find((e) => e.name === 'Podciąganie na drążku')!.sets;
    // hidesWeight=false: bodyweight_loaded przenosi dociążenie z historii.
    const prefill = createPrefilledSets(4, prevSets, false);
    expect(prefill.map((s) => s.weight)).toEqual([0, 0, 0, 0]);
    expect(prefill.map((s) => s.reps)).toEqual([8, 5, 5, 5]);
  });

  it('realne dociążenie przechodzi do prefill (Reverse Crunch 12,5/15 kg)', () => {
    const prevSets = normalized[0].exercises[0].sets;
    expect(createPrefilledSets(3, prevSets, false).map((s) => s.weight)).toEqual([12.5, 12.5, 15]);
  });
});
