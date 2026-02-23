import { describe, it, expect, beforeEach } from 'vitest';
import { offlineQueue } from '@/lib/offline-queue';

describe('offlineQueue', () => {
  beforeEach(() => {
    offlineQueue.clear();
  });

  it('starts empty', () => {
    expect(offlineQueue.size()).toBe(0);
    expect(offlineQueue.getAll()).toEqual([]);
  });

  it('adds operations', () => {
    offlineQueue.add({ type: 'updateExercise', payload: { sessionId: '123' } });
    expect(offlineQueue.size()).toBe(1);
  });

  it('assigns unique ids', () => {
    offlineQueue.add({ type: 'updateExercise', payload: {} });
    offlineQueue.add({ type: 'completeWorkout', payload: {} });
    const ops = offlineQueue.getAll();
    expect(ops[0].id).not.toBe(ops[1].id);
  });

  it('removes by id', () => {
    offlineQueue.add({ type: 'updateExercise', payload: {} });
    offlineQueue.add({ type: 'completeWorkout', payload: {} });
    const ops = offlineQueue.getAll();
    offlineQueue.remove(ops[0].id);
    expect(offlineQueue.size()).toBe(1);
    expect(offlineQueue.getAll()[0].type).toBe('completeWorkout');
  });

  it('clears all', () => {
    offlineQueue.add({ type: 'updateExercise', payload: {} });
    offlineQueue.add({ type: 'completeWorkout', payload: {} });
    offlineQueue.clear();
    expect(offlineQueue.size()).toBe(0);
  });

  it('preserves payload', () => {
    offlineQueue.add({ type: 'updateExercise', payload: { sessionId: 'abc', sets: [1, 2, 3] } });
    const ops = offlineQueue.getAll();
    expect(ops[0].payload.sessionId).toBe('abc');
  });
});
