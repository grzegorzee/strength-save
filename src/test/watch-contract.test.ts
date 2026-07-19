// Z122: kontrakt telefon<->zegarek — rozszerzenia v1 (cel tygodnia, przypięta
// notatka, deduplikacja zapisu Health przez flagę hkSession w eventach).
import { describe, it, expect } from 'vitest';
import { buildWatchExercises, parseWatchEvent } from '@/lib/watch-bridge';
import type { Exercise } from '@/data/trainingPlan';

const exercises: Exercise[] = [
  { id: 'ex-1', name: 'Wyciskanie hantli (Lekki skos)', sets: '3 x 6-8', instructions: [] },
  { id: 'ex-2', name: 'Plank', sets: '3 x 60s', instructions: [] },
];

describe('buildWatchExercises (Z122)', () => {
  it('dokleja etykietę celu tygodnia i przypiętą notatkę per ćwiczenie', () => {
    const out = buildWatchExercises(exercises, { 'ex-1': [{ reps: 6, weight: 62.5, completed: false }] }, {
      targetLabelByExerciseId: { 'ex-1': 'Cel: 62.5 kg × 6' },
      pinnedNoteByExerciseId: { 'ex-1': 'Siodełko na 4, oparcie na 2' },
    });
    expect(out[0].targetLabel).toBe('Cel: 62.5 kg × 6');
    expect(out[0].pinnedNote).toBe('Siodełko na 4, oparcie na 2');
    expect(out[0].sets).toHaveLength(1);
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
});
