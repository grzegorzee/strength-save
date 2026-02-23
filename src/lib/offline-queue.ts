const QUEUE_KEY = 'fittracker_offline_queue';

export interface QueuedOperation {
  id: string;
  type: 'updateExercise' | 'completeWorkout' | 'createWorkout';
  payload: Record<string, unknown>;
  timestamp: number;
}

export const offlineQueue = {
  add(op: Omit<QueuedOperation, 'id' | 'timestamp'>): void {
    const operations = this.getAll();
    operations.push({
      ...op,
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(operations));
  },

  getAll(): QueuedOperation[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  remove(id: string): void {
    const operations = this.getAll().filter(op => op.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(operations));
  },

  clear(): void {
    localStorage.removeItem(QUEUE_KEY);
  },

  size(): number {
    return this.getAll().length;
  },
};
