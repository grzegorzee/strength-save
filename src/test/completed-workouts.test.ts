import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import {
  countCompletedWorkouts,
  selectCompletedWorkouts,
} from '@/lib/completed-workouts';

const workout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'workout-u1-day-1-2026-09-03',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-09-03',
  completed: true,
  exercises: [{
    exerciseId: 'squat',
    sets: [{ reps: 5, weight: 100, completed: true }],
  }],
  ...over,
});

describe('kanoniczna semantyka ukończonego treningu', () => {
  it('liczy zwykły trening z ukończoną serią roboczą', () => {
    expect(countCompletedWorkouts([workout()])).toBe(1);
  });

  it('liczy każdy prawidłowy szybki trening osobno, także tego samego dnia', () => {
    const first = workout({
      id: 'workout-u1-adhoc-2026-09-03-1000-2026-09-03',
      dayId: 'adhoc-2026-09-03-1000',
    });
    const second = workout({
      id: 'workout-u1-adhoc-2026-09-03-2000-2026-09-03',
      dayId: 'adhoc-2026-09-03-2000',
    });
    expect(countCompletedWorkouts([first, second])).toBe(2);
  });

  it('deduplikuje wyłącznie provisional i jego deterministyczny odpowiednik remote', () => {
    const remote = workout();
    const provisional = workout({ id: `local-${remote.id}` });
    expect(selectCompletedWorkouts([provisional, remote])).toEqual([remote]);
  });

  it('kolejność snapshotu nie ma znaczenia: remote przed provisional też daje jeden wpis remote', () => {
    const remote = workout();
    const provisional = workout({ id: `local-${remote.id}` });
    expect(selectCompletedWorkouts([remote, provisional])).toEqual([remote]);
  });

  it('provisional bez wypromowanego remote liczy się raz (trening offline nie znika z licznika)', () => {
    const provisional = workout({ id: 'local-workout-u1-day-1-2026-09-03' });
    expect(selectCompletedWorkouts([provisional])).toEqual([provisional]);
  });

  it('nie liczy przerwanego draftu, warmup-only ani pustego completed', () => {
    const interrupted = workout({ id: 'draft', completed: false });
    const warmupOnly = workout({
      id: 'warmup',
      exercises: [{ exerciseId: 'squat', sets: [{ reps: 10, weight: 20, completed: true, isWarmup: true }] }],
    });
    const emptyCompleted = workout({ id: 'empty', exercises: [] });
    expect(countCompletedWorkouts([interrupted, warmupOnly, emptyCompleted])).toBe(0);
  });

  it('ręczne cardio jest osobną aktywnością i nie zwiększa licznika treningów siłowych', () => {
    const manualCardio = {
      id: 'manual-cardio-1', userId: 'u1', date: '2026-09-03',
      type: 'Swim', durationMinutes: 30,
    } as unknown as WorkoutSession;
    expect(countCompletedWorkouts([workout(), manualCardio])).toBe(1);
  });
});
