import { describe, expect, it } from 'vitest';
import {
  buildReducedMode,
  isDateInReducedMode,
  isReducedModeActive,
  reducedModeAdviceFactor,
  sanitizeReducedMode,
} from '@/lib/reduced-mode';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import { detectLapse } from '@/lib/lapse-detection';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';

// Runna pakiet 1, krok 14 (spec C3): tryb "nie na 100%" — okres 3-14 dni,
// w oknie propozycje -20%, po końcu rampa 85% → 92% → 100% (kolejne sesje
// ćwiczenia zamiast skoku). Tryb WYGRYWA z deloadem cyklu (nie dubluje się).

const MODE = { startDate: '2026-08-10', endDate: '2026-08-12', level: 'lighter' as const };

const session = (id: string, date: string, weight = 100): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight, completed: true }] }],
});

describe('sanitizeReducedMode / buildReducedMode', () => {
  it('przepuszcza poprawny tryb, odrzuca śmieci', () => {
    expect(sanitizeReducedMode(MODE)).toEqual(MODE);
    expect(sanitizeReducedMode({ ...MODE, level: 'hard' })).toBeNull();
    expect(sanitizeReducedMode({ ...MODE, endDate: '2026-08-01' })).toBeNull();
    expect(sanitizeReducedMode(null)).toBeNull();
  });

  it('buildReducedMode: start dziś, koniec po N dniach (3-14, clamp)', () => {
    expect(buildReducedMode('pause', 7, '2026-08-12'))
      .toEqual({ startDate: '2026-08-12', endDate: '2026-08-18', level: 'pause' });
    expect(buildReducedMode('lighter', 99, '2026-08-12').endDate).toBe('2026-08-25');
  });
});

describe('okno trybu', () => {
  it('isReducedModeActive i isDateInReducedMode pilnują granic włącznie', () => {
    expect(isReducedModeActive(MODE, '2026-08-10')).toBe(true);
    expect(isReducedModeActive(MODE, '2026-08-12')).toBe(true);
    expect(isReducedModeActive(MODE, '2026-08-13')).toBe(false);
    expect(isDateInReducedMode(MODE, '2026-08-11')).toBe(true);
    expect(isDateInReducedMode(MODE, '2026-08-09')).toBe(false);
  });
});

describe('reducedModeAdviceFactor: -20% w oknie, rampa po końcu', () => {
  it('w oknie trybu: 0.8 (każdy poziom)', () => {
    expect(reducedModeAdviceFactor({ mode: MODE, todayISO: '2026-08-11', workouts: [], exerciseId: 'ex-1' }))
      .toEqual({ factor: 0.8, phase: 'active' });
    expect(reducedModeAdviceFactor({
      mode: { ...MODE, level: 'pause' }, todayISO: '2026-08-11', workouts: [], exerciseId: 'ex-1',
    })).toEqual({ factor: 0.8, phase: 'active' });
  });

  it('rampa: 0 sesji po trybie = 0.85, 1 = 0.92, 2+ = koniec rampy (null)', () => {
    const base = { mode: MODE, todayISO: '2026-08-14', exerciseId: 'ex-1' };
    expect(reducedModeAdviceFactor({ ...base, workouts: [] })).toEqual({ factor: 0.85, phase: 'ramp' });
    expect(reducedModeAdviceFactor({ ...base, workouts: [session('w1', '2026-08-13')] }))
      .toEqual({ factor: 0.92, phase: 'ramp' });
    expect(reducedModeAdviceFactor({
      ...base,
      workouts: [session('w1', '2026-08-13'), session('w2', '2026-08-14')],
    })).toBeNull();
  });

  it('brak trybu = null (niezmiennik)', () => {
    expect(reducedModeAdviceFactor({ mode: null, todayISO: '2026-08-11', workouts: [], exerciseId: 'ex-1' })).toBeNull();
  });
});

describe('propozycja silnika w trybie (pełny cykl życia, spec C3)', () => {
  const history = [session('w0', '2026-08-08')];

  it('sesja w oknie: -20% od ostatniego ciężaru; tryb wygrywa z deloadem plateau', () => {
    const advice = getNextSetAdvice(history, 'ex-1', '3 x 6-8', 0, {
      todayISO: '2026-08-11', reducedMode: MODE,
    });
    expect(advice?.kind).toBe('deload');
    expect(advice?.targetWeight).toBe(80);
  });

  it('po końcu trybu rampa 85% → 92% → powrót do bazy', () => {
    const after0 = getNextSetAdvice(history, 'ex-1', '3 x 6-8', 0, {
      todayISO: '2026-08-13', reducedMode: MODE,
    });
    expect(after0?.targetWeight).toBe(85);

    const after1 = getNextSetAdvice([...history, session('w1', '2026-08-13', 85)], 'ex-1', '3 x 6-8', 0, {
      todayISO: '2026-08-14', reducedMode: MODE,
    });
    expect(after1?.targetWeight).toBe(92);

    const after2 = getNextSetAdvice(
      [...history, session('w1', '2026-08-13', 85), session('w2', '2026-08-14', 92)],
      'ex-1', '3 x 6-8', 0,
      { todayISO: '2026-08-15', reducedMode: MODE },
    );
    expect(after2?.kind).toBe('progress');
  });
});

describe('tryb wycisza zaległości w swoim oknie', () => {
  const day = (id: string, weekday: TrainingDay['weekday']): TrainingDay => ({
    id, dayName: id, weekday, focus: '', exercises: [],
  });
  const planDays = [day('day-1', 'monday'), day('day-2', 'wednesday')];

  it('zaplanowany dzień w oknie trybu nie jest zaległością', () => {
    // Pon 2026-08-10 i śr 2026-08-12 w oknie trybu; dziś piątek 2026-08-14.
    const found = detectLapse({
      planDays,
      overrides: {},
      workouts: [{ date: '2026-08-05', completed: true }, { date: '2026-08-03', completed: true }],
      todayISO: '2026-08-14',
      reducedMode: MODE,
      dismissed: ['week:2026-08-03'],
    });
    expect(found).toBeNull();
  });
});
