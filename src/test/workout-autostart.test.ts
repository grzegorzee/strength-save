import { describe, it, expect } from 'vitest';
import { shouldAutostartWorkout, stripAutostartParam } from '@/lib/workout-autostart';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const baseDraft = (overrides: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 'session-1',
  userId: 'user-1',
  dayId: 'day-1',
  date: '2026-07-24',
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: 'session-1',
  exerciseSets: {},
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1000,
  updatedAt: 1000,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 1,
  ...overrides,
});

describe('shouldAutostartWorkout', () => {
  it('autostart=true, brak draftu, brak sesji → start', () => {
    expect(shouldAutostartWorkout({ autostart: true, sessionId: null, draftForPage: null }))
      .toBe('start');
  });

  it('autostart=true, draft z odhaczoną serią → resume (nie start)', () => {
    const draft = baseDraft({
      exerciseSets: { ex1: [{ reps: 8, weight: 60, completed: true }] },
    });
    expect(shouldAutostartWorkout({ autostart: true, sessionId: null, draftForPage: draft }))
      .toBe('resume');
  });

  it('autostart=true, draft z niepustym setem (wartości bez odhaczenia) → resume', () => {
    const draft = baseDraft({
      exerciseSets: { ex1: [{ reps: 8, weight: 60, completed: false }] },
    });
    expect(shouldAutostartWorkout({ autostart: true, sessionId: null, draftForPage: draft }))
      .toBe('resume');
  });

  it('autostart=true, draft z notatką ćwiczenia → resume', () => {
    const draft = baseDraft({ exerciseNotes: { ex1: 'bolało kolano' } });
    expect(shouldAutostartWorkout({ autostart: true, sessionId: null, draftForPage: draft }))
      .toBe('resume');
  });

  it('autostart=true, draft z pominiętym ćwiczeniem → resume', () => {
    const draft = baseDraft({ skippedExercises: ['ex1'] });
    expect(shouldAutostartWorkout({ autostart: true, sessionId: null, draftForPage: draft }))
      .toBe('resume');
  });

  it('autostart=true, draft całkiem pusty (zero setów, zero notatek) → start', () => {
    expect(shouldAutostartWorkout({ autostart: true, sessionId: null, draftForPage: baseDraft() }))
      .toBe('start');
  });

  it('autostart=true, sessionId już ustawione → scroll-only', () => {
    expect(shouldAutostartWorkout({ autostart: true, sessionId: 'session-1', draftForPage: null }))
      .toBe('scroll-only');
  });

  it('sessionId ustawione wygrywa z draftem z treścią (sesja już zhydratowana)', () => {
    const draft = baseDraft({
      exerciseSets: { ex1: [{ reps: 8, weight: 60, completed: true }] },
    });
    expect(shouldAutostartWorkout({ autostart: true, sessionId: 'session-1', draftForPage: draft }))
      .toBe('scroll-only');
  });

  it('autostart=false → none niezależnie od reszty', () => {
    expect(shouldAutostartWorkout({ autostart: false, sessionId: null, draftForPage: null }))
      .toBe('none');
    expect(shouldAutostartWorkout({ autostart: false, sessionId: 's', draftForPage: baseDraft() }))
      .toBe('none');
  });
});

describe('stripAutostartParam', () => {
  it('usuwa autostart, zostawia date i session', () => {
    const params = new URLSearchParams('autostart=true&date=2026-07-24&session=abc');
    const next = stripAutostartParam(params);
    expect(next).not.toBeNull();
    expect(next!.get('autostart')).toBeNull();
    expect(next!.get('date')).toBe('2026-07-24');
    expect(next!.get('session')).toBe('abc');
  });

  it('zwraca null gdy parametru nie ma (brak zbędnego replace w historii)', () => {
    const params = new URLSearchParams('date=2026-07-24');
    expect(stripAutostartParam(params)).toBeNull();
  });
});
