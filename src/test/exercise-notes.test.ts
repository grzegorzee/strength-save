import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { exerciseNoteDocId, getExerciseNoteHistory, sanitizeExerciseNote } from '@/lib/exercise-notes';

const session = (id: string, date: string, completed: boolean, exercises: WorkoutSession['exercises']): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed,
  exercises,
});

const withNote = (exerciseId: string, notes?: string): WorkoutSession['exercises'][number] => ({
  exerciseId,
  sets: [{ reps: 8, weight: 60, completed: true }],
  ...(notes ? { notes } : {}),
});

describe('getExerciseNoteHistory (Z74)', () => {
  it('zwraca notatki ćwiczenia z ukończonych sesji, najnowsze pierwsze', () => {
    const workouts = [
      session('w1', '2026-06-01', true, [withNote('ex-1', 'pas za luźny')]),
      session('w2', '2026-06-15', true, [withNote('ex-1', 'lepszy uchwyt')]),
      session('w3', '2026-06-08', true, [withNote('ex-1', 'boli bark')]),
    ];
    const history = getExerciseNoteHistory(workouts, 'ex-1');
    expect(history.map((h) => h.note)).toEqual(['lepszy uchwyt', 'boli bark', 'pas za luźny']);
    expect(history[0].date).toBe('2026-06-15');
  });

  it('pomija sesje nieukończone i wpisy bez notatki', () => {
    const workouts = [
      session('w1', '2026-06-01', false, [withNote('ex-1', 'szkic')]),
      session('w2', '2026-06-02', true, [withNote('ex-1')]),
      session('w3', '2026-06-03', true, [withNote('ex-1', '  ')]),
      session('w4', '2026-06-04', true, [withNote('ex-2', 'inne ćwiczenie')]),
      session('w5', '2026-06-05', true, [withNote('ex-1', 'jedyna prawdziwa')]),
    ];
    const history = getExerciseNoteHistory(workouts, 'ex-1');
    expect(history).toEqual([{ date: '2026-06-05', note: 'jedyna prawdziwa' }]);
  });

  it('respektuje limit (domyślnie 5)', () => {
    const workouts = Array.from({ length: 8 }, (_, i) =>
      session(`w${i}`, `2026-06-0${i + 1}`, true, [withNote('ex-1', `notatka ${i + 1}`)]));
    expect(getExerciseNoteHistory(workouts, 'ex-1')).toHaveLength(5);
    expect(getExerciseNoteHistory(workouts, 'ex-1', 2)).toHaveLength(2);
    expect(getExerciseNoteHistory(workouts, 'ex-1', 2)[0].note).toBe('notatka 8');
  });

  it('pusta historia → []', () => {
    expect(getExerciseNoteHistory([], 'ex-1')).toEqual([]);
  });
});

describe('exerciseNoteDocId (Z103)', () => {
  it('jest deterministyczny: ta sama para (user, nazwa) daje ten sam id', () => {
    expect(exerciseNoteDocId('u1', 'Przysiad ze sztangą (Low Bar)'))
      .toBe(exerciseNoteDocId('u1', 'Przysiad ze sztangą (Low Bar)'));
  });

  it('normalizuje polskie znaki, wielkość liter i spacje', () => {
    expect(exerciseNoteDocId('u1', 'Przysiad ze sztangą')).toBe('u1_przysiad-ze-sztanga');
    expect(exerciseNoteDocId('u1', '  WYCISKANIE   Żołnierskie  ')).toBe('u1_wyciskanie-zolnierskie');
  });

  it('rozróżnia userów i ćwiczenia', () => {
    expect(exerciseNoteDocId('u1', 'Przysiad')).not.toBe(exerciseNoteDocId('u2', 'Przysiad'));
    expect(exerciseNoteDocId('u1', 'Przysiad')).not.toBe(exerciseNoteDocId('u1', 'Martwy ciąg'));
  });

  it('ogranicza długość id (slug obcięty do 150 znaków)', () => {
    const longName = 'a'.repeat(400);
    const id = exerciseNoteDocId('u1', longName);
    expect(id.length).toBeLessThanOrEqual('u1_'.length + 150);
  });
});

describe('sanitizeExerciseNote (Z103)', () => {
  it('trimuje note i machineSettings', () => {
    expect(sanitizeExerciseNote({ note: '  pas na 3 dziurkę  ', machineSettings: ' siedzisko 4 ' }))
      .toEqual({ note: 'pas na 3 dziurkę', machineSettings: 'siedzisko 4' });
  });

  it('obcina note do 500 i machineSettings do 200 znaków', () => {
    const out = sanitizeExerciseNote({ note: 'x'.repeat(600), machineSettings: 'y'.repeat(300) });
    expect(out.note).toHaveLength(500);
    expect(out.machineSettings).toHaveLength(200);
  });

  it('puste machineSettings pomija (bez undefined w obiekcie dla Firestore)', () => {
    const out = sanitizeExerciseNote({ note: 'tylko notatka', machineSettings: '   ' });
    expect(out).toEqual({ note: 'tylko notatka' });
    expect(Object.keys(out)).not.toContain('machineSettings');
    expect(Object.values(out).every((v) => v !== undefined)).toBe(true);
  });

  it('brak note → pusty string (nie undefined)', () => {
    expect(sanitizeExerciseNote({})).toEqual({ note: '' });
  });
});
