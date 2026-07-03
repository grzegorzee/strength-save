import { describe, expect, it } from 'vitest';
import {
  deriveWorkoutSessionPhase,
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
