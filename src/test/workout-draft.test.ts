import { describe, it, expect, beforeEach } from 'vitest';
import { workoutDraft, type WorkoutDraft } from '@/lib/workout-draft';

const mockDraft: WorkoutDraft = {
  sessionId: 'workout-123',
  dayId: 'day-1',
  date: '2024-04-02',
  exerciseSets: {
    'ex-1': [
      { reps: 10, weight: 50, completed: true },
      { reps: 8, weight: 50, completed: true },
    ],
  },
  exerciseNotes: { 'ex-1': 'Feels good' },
  dayNotes: 'Great workout',
  skippedExercises: [],
  savedAt: Date.now(),
};

describe('workoutDraft', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('save and load roundtrip', () => {
    workoutDraft.save(mockDraft);
    const loaded = workoutDraft.load();
    expect(loaded).toEqual(mockDraft);
  });

  it('returns null when no draft', () => {
    expect(workoutDraft.load()).toBeNull();
  });

  it('clear removes data', () => {
    workoutDraft.save(mockDraft);
    expect(workoutDraft.exists()).toBe(true);
    workoutDraft.clear();
    expect(workoutDraft.exists()).toBe(false);
    expect(workoutDraft.load()).toBeNull();
  });

  it('exists returns correct boolean', () => {
    expect(workoutDraft.exists()).toBe(false);
    workoutDraft.save(mockDraft);
    expect(workoutDraft.exists()).toBe(true);
  });

  it('handles corrupt localStorage data gracefully', () => {
    localStorage.setItem('fittracker_workout_draft', 'not-json');
    const loaded = workoutDraft.load();
    expect(loaded).toBeNull();
    // Should have cleared the corrupt data
    expect(localStorage.getItem('fittracker_workout_draft')).toBeNull();
  });

  it('returns null for valid JSON but missing required fields', () => {
    localStorage.setItem('fittracker_workout_draft', JSON.stringify({ foo: 'bar' }));
    const loaded = workoutDraft.load();
    expect(loaded).toBeNull();
  });

  it('v2 journal przechowuje niezależnie wiele sesji jednego użytkownika', () => {
    workoutDraft.save(mockDraft, 'user-1');
    workoutDraft.save({
      ...mockDraft,
      sessionId: 'workout-456',
      dayId: 'adhoc-1',
      savedAt: mockDraft.savedAt + 1,
    }, 'user-1');

    expect(workoutDraft.loadAll('user-1').map(draft => draft.sessionId).sort()).toEqual([
      'workout-123',
      'workout-456',
    ]);
    expect(workoutDraft.loadSession('workout-123', 'user-1')?.dayId).toBe('day-1');
    expect(workoutDraft.loadSession('workout-456', 'user-1')?.dayId).toBe('adhoc-1');
  });

  it('clearSession usuwa tylko wskazaną sesję z journalu', () => {
    workoutDraft.save(mockDraft, 'user-1');
    workoutDraft.save({ ...mockDraft, sessionId: 'workout-456' }, 'user-1');

    expect(workoutDraft.clearSession('workout-123', 'user-1')).toBe(true);

    expect(workoutDraft.loadSession('workout-123', 'user-1')).toBeNull();
    expect(workoutDraft.loadSession('workout-456', 'user-1')).not.toBeNull();
  });

  it('loadAll zachowuje kompatybilność z pojedynczym legacy fallbackiem', () => {
    localStorage.setItem('fittracker_workout_draft:user-1', JSON.stringify(mockDraft));

    expect(workoutDraft.loadAll('user-1')).toEqual([mockDraft]);
  });
});
