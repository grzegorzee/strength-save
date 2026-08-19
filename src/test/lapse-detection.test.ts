import { describe, expect, it } from 'vitest';
import { collectLapsedDates, detectLapse } from '@/lib/lapse-detection';
import { decideNextSet } from '@/lib/progression-engine';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';

// Runna pakiet 1, krok 13 (spec C2): tray zaległości. Trigger: nieukończona
// i nieodpuszczona sesja starsza niż 2 dni ALBO pusty miniony tydzień.
// Świeże zaległości (1-2 dni) zostają w banerze przełożenia. Ton neutralny.

const day = (id: string, weekday: TrainingDay['weekday']): TrainingDay => ({
  id,
  dayName: id,
  weekday,
  focus: '',
  exercises: [],
});

// Plan pon/śr/pt; "dziś" = piątek 2026-08-14 (tydzień planu od 2026-08-10).
const planDays = [day('day-1', 'monday'), day('day-2', 'wednesday'), day('day-3', 'friday')];
const TODAY = '2026-08-14';
const base = { planDays, overrides: {}, workouts: [], todayISO: TODAY };

const completedOn = (dates: string[]) => dates.map((date) => ({ date, completed: true }));

describe('detectLapse', () => {
  it('zaległość 1-2 dni to sprawa banera: tray milczy', () => {
    // Śr 2026-08-12 (2 dni wstecz) zaległa, ale wszystko starsze zrobione.
    const found = detectLapse({
      ...base,
      workouts: completedOn(['2026-08-10', '2026-08-07', '2026-08-05', '2026-08-03', '2026-07-31']),
    });
    expect(found).toBeNull();
  });

  it('sesja starsza niż 2 dni bez wykonania i skipa = stale-session', () => {
    const found = detectLapse({
      ...base,
      workouts: completedOn(['2026-08-12', '2026-08-07', '2026-08-05', '2026-08-03', '2026-07-31']),
    });
    expect(found).toMatchObject({ kind: 'stale-session', dateISO: '2026-08-10', weekPlus: false });
  });

  it('zaległość tygodnia+ podnosi weekPlus (opcja Kontynuuj od dziś)', () => {
    const found = detectLapse({
      ...base,
      workouts: completedOn(['2026-08-12', '2026-08-10']),
    });
    expect(found).toMatchObject({ kind: 'stale-session', dateISO: '2026-08-07', weekPlus: true });
  });

  it('data odpuszczona (skip) albo odrzucona nie triggeruje', () => {
    const workouts = completedOn(['2026-08-12', '2026-08-07', '2026-08-05', '2026-08-03', '2026-07-31']);
    expect(detectLapse({ ...base, workouts, skippedDates: ['2026-08-10'] })).toBeNull();
    expect(detectLapse({ ...base, workouts, dismissed: ['2026-08-10'] })).toBeNull();
  });

  it('pusty miniony tydzień planu = empty-week z własnym kluczem odrzucenia', () => {
    // Wszystkie daty stale-session odrzucone, ale tydzień 08-03..08-09 był z planem i pusty.
    const found = detectLapse({
      ...base,
      workouts: completedOn(['2026-08-12', '2026-08-10']),
      dismissed: ['2026-08-07', '2026-08-05', '2026-08-03', '2026-07-31'],
    });
    expect(found).toMatchObject({
      kind: 'empty-week',
      dateISO: '2026-08-03',
      dismissKey: 'week:2026-08-03',
      weekPlus: true,
    });
  });
});

describe('collectLapsedDates (Kontynuuj od dziś)', () => {
  it('zbiera zaległe zaplanowane daty starsze niż 2 dni z okna 14 dni', () => {
    expect(collectLapsedDates({ ...base, workouts: completedOn(['2026-08-12']) }))
      .toEqual(['2026-07-31', '2026-08-03', '2026-08-05', '2026-08-07', '2026-08-10']);
  });
});

describe('propozycja po przerwie (comeback, zasada "za zgodą")', () => {
  const repRange = { min: 6, max: 8, isMax: false };

  it('decideNextSet z longBreak proponuje -10% (deload.break)', () => {
    const decision = decideNextSet({
      lastWeight: 100, lastReps: 8, repRange, isBodyweight: false, increment: 2.5,
      isPlateau: false, longBreak: true,
    });
    expect(decision.kind).toBe('deload');
    expect(decision.targetWeight).toBe(90);
    expect(decision.reasonKey).toBe('deload.break');
  });

  it('getNextSetAdvice: ostatnia sesja ćwiczenia dokładnie 14 dni temu = lżejsze wejście', () => {
    const workouts: WorkoutSession[] = [{
      id: 'w-old', userId: 'u1', dayId: 'day-1', date: '2026-07-31', completed: true,
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] }],
    }];
    const advice = getNextSetAdvice(workouts, 'ex-1', '3 x 6-8', 0, { todayISO: '2026-08-14' });
    expect(advice?.kind).toBe('deload');
    expect(advice?.targetWeight).toBe(90);
  });

  it('13 dni przerwy = zero zmian (niezmiennik granicy)', () => {
    const workouts: WorkoutSession[] = [{
      id: 'w-new', userId: 'u1', dayId: 'day-1', date: '2026-08-01', completed: true,
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] }],
    }];
    const advice = getNextSetAdvice(workouts, 'ex-1', '3 x 6-8', 0, { todayISO: '2026-08-14' });
    expect(advice?.kind).toBe('progress');
    expect(advice?.targetWeight).toBe(102.5);
  });
});
