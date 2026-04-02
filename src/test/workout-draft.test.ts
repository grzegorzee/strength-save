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
});
