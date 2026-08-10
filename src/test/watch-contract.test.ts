// Z122: kontrakt telefon<->zegarek — rozszerzenia v1 (cel tygodnia, przypięta
// notatka, deduplikacja zapisu Health przez flagę hkSession w eventach).
import { beforeEach, describe, it, expect } from 'vitest';
import {
  buildWatchExercises,
  getOrCreateWatchPhoneDeviceId,
  getRestSettingsForWatch,
} from '@/lib/watch-bridge';
import { buildRecentWatchExercises } from '@/lib/watch-recent';
import { parseWatchEvent } from '@/lib/watch-event-parser';
import type { Exercise } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';

const exercises: Exercise[] = [
  { id: 'ex-1', name: 'Wyciskanie hantli (Lekki skos)', sets: '3 x 6-8', instructions: [] },
  { id: 'ex-2', name: 'Plank', sets: '3 x 60s', instructions: [] },
];

describe('buildWatchExercises (Z122)', () => {
  it('dokleja etykietę celu tygodnia i przypiętą notatkę per ćwiczenie', () => {
    const out = buildWatchExercises(exercises, { 'ex-1': [{ reps: 6, weight: 62.5, completed: false }] }, {
      targetLabelByExerciseId: { 'ex-1': 'Cel: 62.5 kg × 6' },
      pinnedNoteByExerciseId: { 'ex-1': 'Siodełko na 4, oparcie na 2' },
      trackingByExerciseId: { 'ex-1': 'weight_reps', 'ex-2': 'duration' },
    });
    expect(out[0].targetLabel).toBe('Cel: 62.5 kg × 6');
    expect(out[0].pinnedNote).toBe('Siodełko na 4, oparcie na 2');
    expect(out[0].sets).toHaveLength(1);
    expect(out[0].trackingType).toBe('weight_reps');
    expect(out[1].trackingType).toBe('duration');
    // Brak extras dla ex-2: pola nieobecne (zwarty payload, limit application context).
    expect(out[1].targetLabel).toBeUndefined();
    expect(out[1].pinnedNote).toBeUndefined();
  });

  it('przycina długą notatkę do 140 znaków (ekran zegarka + rozmiar kontekstu)', () => {
    const out = buildWatchExercises(exercises, {}, {
      pinnedNoteByExerciseId: { 'ex-1': 'x'.repeat(500) },
    });
    expect(out[0].pinnedNote).toHaveLength(140);
  });

  it('bez extras zachowuje dotychczasowy kształt payloadu', () => {
    const out = buildWatchExercises(exercises, { 'ex-2': [{ reps: 0, weight: 0, completed: true }] });
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ id: 'ex-2', name: 'Plank', setsLabel: '3 x 60s', sets: [{ reps: 0, weight: 0, completed: true }] });
  });
});

describe('parseWatchEvent — hkSession (Z122)', () => {
  it('zachowuje flagę hkSession w setLogged i workoutFinished', () => {
    const logged = parseWatchEvent(JSON.stringify({
      id: 'e1', type: 'setLogged', date: '2026-07-20', dayId: 'day-1',
      exerciseId: 'ex-1', setIndex: 0, reps: 6, weight: 62.5, completed: true, at: 1, hkSession: true,
    }));
    expect(logged?.type).toBe('setLogged');
    expect(logged && 'hkSession' in logged && logged.hkSession).toBe(true);

    const finished = parseWatchEvent(JSON.stringify({
      id: 'e2', type: 'workoutFinished', date: '2026-07-20', dayId: 'day-1', at: 2, hkSession: true,
    }));
    expect(finished && 'hkSession' in finished && finished.hkSession).toBe(true);
  });

  it('stare eventy bez hkSession dalej się parsują (kompatybilność wstecz)', () => {
    const legacy = parseWatchEvent(JSON.stringify({
      type: 'setLogged', date: '2026-07-20', dayId: 'day-1',
      exerciseId: 'ex-1', setIndex: 0, reps: 6, weight: 62.5, completed: true, at: 1,
    }));
    expect(legacy?.type).toBe('setLogged');
  });

  it('odrzuca nieobsługiwaną wersję i niepełny event zamiast ACK błędnych danych', () => {
    expect(parseWatchEvent(JSON.stringify({
      protocolVersion: 999,
      id: 'e1', type: 'setLogged', date: '2026-07-20', dayId: 'day-1',
      exerciseId: 'ex-1', setIndex: 0, reps: 6, weight: 62.5, completed: true, at: 1,
    }))).toBeNull();
    expect(parseWatchEvent(JSON.stringify({
      id: 'e2', type: 'setLogged', date: '2026-07-20', dayId: 'day-1', at: 2,
    }))).toBeNull();
  });

  it('zachowuje pełne pola czterech typów serii w evencie Watch', () => {
    const parsed = parseWatchEvent(JSON.stringify({
      protocolVersion: 1, id: 'typed-1', type: 'setLogged', canonicalType: 'set_updated',
      date: '2026-08-10', dayId: 'day-1', exerciseId: 'carry', setIndex: 0,
      reps: 0, weight: 24, completed: true, at: 10,
      trackingType: 'weight_distance_duration', durationSec: 60, distanceM: 40,
    }));
    expect(parsed).toMatchObject({
      trackingType: 'weight_distance_duration', durationSec: 60, distanceM: 40, weight: 24,
    });
  });
});

describe('Watch protocol metadata (X25/Z224)', () => {
  beforeEach(() => localStorage.clear());

  it('utrzymuje stabilny, niebędący uid identyfikator telefonu', () => {
    const first = getOrCreateWatchPhoneDeviceId();
    expect(first).toMatch(/^phone-/);
    expect(getOrCreateWatchPhoneDeviceId()).toBe(first);
  });

  it('wysyła oba ustawienia przerw 90/150 z jednego źródła prawdy', () => {
    expect(getRestSettingsForWatch()).toEqual({
      betweenSetsSeconds: 90,
      betweenExercisesSeconds: 150,
    });
    localStorage.setItem('fittracker_rest_settings_v1', JSON.stringify({
      workingSeconds: 120,
      warmupSeconds: 45,
      betweenExercisesSeconds: 180,
      perExercise: {},
    }));
    expect(getRestSettingsForWatch()).toEqual({
      betweenSetsSeconds: 120,
      betweenExercisesSeconds: 180,
    });
  });
});

describe('Apple Watch parity (X25/Z225)', () => {
  it('buduje małą, bezpieczną listę ostatnich klasycznych ćwiczeń bez duplikatów', () => {
    const workouts: WorkoutSession[] = [
      {
        id: 'w-new', userId: 'u1', dayId: 'day-2', date: '2026-08-10', completed: true,
        exercises: [
          { exerciseId: 'bench-new', name: '  Wyciskanie   ', sets: [
            { reps: 8, weight: 70, completed: true },
            { reps: 7, weight: 72.5, completed: true },
          ] },
          // Typ czasowy nie może trafić do edytora reps/kg na Watch.
          { exerciseId: 'plank', name: 'Plank', sets: [{ reps: 0, weight: 0, durationSec: 60, completed: true }] },
        ],
      },
      {
        id: 'w-old', userId: 'u1', dayId: 'day-1', date: '2026-08-01', completed: true,
        exercises: [
          { exerciseId: 'bench-old', name: 'Wyciskanie', sets: [{ reps: 6, weight: 60, completed: true }] },
          { exerciseId: 'row', name: 'Wiosłowanie', sets: [{ reps: 10, weight: 40, completed: true }] },
        ],
      },
    ];

    const recent = buildRecentWatchExercises(workouts, 8);
    expect(recent).toHaveLength(2);
    expect(recent[0]).toMatchObject({ id: 'bench-new', reps: 7, weight: 72.5, setCount: 2 });
    expect(recent[0].name).toBe('Wyciskanie');
    expect(recent[1]).toMatchObject({ id: 'row', name: 'Wiosłowanie', reps: 10, weight: 40 });
  });

  it('waliduje quick-start i discard, a nieznany lub niebezpieczny event odrzuca', () => {
    const quick = parseWatchEvent(JSON.stringify({
      protocolVersion: 1, id: 'quick-1', type: 'startQuickWorkout',
      date: '2026-08-10', dayId: 'adhoc-2026-08-10-1786359000000', at: 1786359000000,
      exerciseId: 'bench', exerciseName: 'Wyciskanie', setCount: 3, reps: 8, weight: 70,
    }));
    expect(quick).toMatchObject({ type: 'startQuickWorkout', exerciseName: 'Wyciskanie', setCount: 3 });

    expect(parseWatchEvent(JSON.stringify({
      protocolVersion: 1, id: 'discard-1', type: 'workoutDiscarded',
      date: '2026-08-10', dayId: 'day-1', at: 1786359001000, hkSession: true,
    }))).toMatchObject({ type: 'workoutDiscarded', hkSession: true });

    expect(parseWatchEvent(JSON.stringify({
      protocolVersion: 1, id: 'bad', type: 'startQuickWorkout',
      date: '2026-08-10', dayId: '../other-user', at: 1,
      exerciseId: 'x', exerciseName: 'x', setCount: 999, reps: 8, weight: 70,
    }))).toBeNull();
  });
});
