import { describe, expect, it } from 'vitest';
import {
  deriveWorkoutSessionPhase,
  hasRemainingWork,
  isActiveTrainingPhase,
  type WorkoutSessionPhaseInput,
} from '@/lib/workout-session-state';

const base: WorkoutSessionPhaseInput = {
  sessionId: 'workout-1',
  sessionOrigin: 'remote',
  isCompleted: false,
  isEditing: false,
  conflictDialogOpen: false,
  finalSyncPending: false,
  isExplicitSaving: false,
};

describe('deriveWorkoutSessionPhase (Z57)', () => {
  it('brak sesji => idle', () => {
    expect(deriveWorkoutSessionPhase({ ...base, sessionId: null })).toBe('idle');
  });

  it('otwarty dialog konfliktu => conflict', () => {
    expect(deriveWorkoutSessionPhase({ ...base, conflictDialogOpen: true })).toBe('conflict');
  });

  it('tryb edycji => editing', () => {
    expect(deriveWorkoutSessionPhase({ ...base, isEditing: true, isCompleted: true })).toBe('editing');
  });

  it('trwający zapis finalny => completing', () => {
    expect(deriveWorkoutSessionPhase({ ...base, isExplicitSaving: true })).toBe('completing');
  });

  it('zakończony lokalnie, czeka na sync => final-pending', () => {
    expect(deriveWorkoutSessionPhase({ ...base, isCompleted: true, finalSyncPending: true })).toBe('final-pending');
  });

  it('zakończony i zsynchronizowany => completed', () => {
    expect(deriveWorkoutSessionPhase({ ...base, isCompleted: true })).toBe('completed');
  });

  it('aktywna sesja offline => active-provisional', () => {
    expect(deriveWorkoutSessionPhase({ ...base, sessionOrigin: 'provisional' })).toBe('active-provisional');
  });

  it('aktywna sesja z chmury => active-remote', () => {
    expect(deriveWorkoutSessionPhase(base)).toBe('active-remote');
  });

  it('isActiveTrainingPhase: trening w toku dla active-*/completing/conflict, nie dla reszty', () => {
    expect(isActiveTrainingPhase('active-provisional')).toBe(true);
    expect(isActiveTrainingPhase('active-remote')).toBe(true);
    expect(isActiveTrainingPhase('completing')).toBe(true);
    expect(isActiveTrainingPhase('conflict')).toBe(true);
    expect(isActiveTrainingPhase('idle')).toBe(false);
    expect(isActiveTrainingPhase('editing')).toBe(false);
    expect(isActiveTrainingPhase('final-pending')).toBe(false);
    expect(isActiveTrainingPhase('completed')).toBe(false);
  });
});

describe('hasRemainingWork (Z144)', () => {
  const exercises = [{ id: 'ex-a' }, { id: 'ex-b' }];
  const done = { reps: 5, weight: 100, completed: true };
  const open = { reps: 5, weight: 100, completed: false };
  const warmupOpen = { reps: 10, weight: 20, completed: false, isWarmup: true };

  it('ostatnia seria ostatniego niepominiętego ćwiczenia → false', () => {
    expect(hasRemainingWork(
      { 'ex-a': [done, done], 'ex-b': [done] },
      [],
      exercises,
    )).toBe(false);
  });

  it('ostatnia seria ćwiczenia, ale inne ćwiczenie ma nieodhaczone serie → true', () => {
    expect(hasRemainingWork(
      { 'ex-a': [done, done], 'ex-b': [open] },
      [],
      exercises,
    )).toBe(true);
  });

  it('pozostały tylko serie rozgrzewkowe → false (rozgrzewka nie jest pracą do zrobienia)', () => {
    expect(hasRemainingWork(
      { 'ex-a': [warmupOpen, done], 'ex-b': [warmupOpen, done] },
      [],
      exercises,
    )).toBe(false);
  });

  it('pozostałe ćwiczenie jest w skippedExercises → false', () => {
    expect(hasRemainingWork(
      { 'ex-a': [done, done], 'ex-b': [open, open] },
      ['ex-b'],
      exercises,
    )).toBe(false);
  });

  it('ćwiczenie bez stanu serii (dodane w trakcie, nietknięte) → true', () => {
    expect(hasRemainingWork(
      { 'ex-a': [done] },
      [],
      exercises,
    )).toBe(true);
  });
});
