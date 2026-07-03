import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import { buildHistoryRowMeta, formatDurationCompact } from '@/lib/history-stats';

const session = (id: string, date: string, weight: number, durationSec?: number): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  ...(durationSec !== undefined ? { durationSec } : {}),
  exercises: [{
    exerciseId: 'ex-1-1',
    name: 'Wyciskanie sztangi na ławce płaskiej',
    sets: [{ reps: 10, weight, completed: true }],
  }],
});

describe('formatDurationCompact (Z80)', () => {
  it('formatuje sekundy do postaci 1h 12m / 43m', () => {
    expect(formatDurationCompact(4320)).toBe('1h 12m');
    expect(formatDurationCompact(2580)).toBe('43m');
    expect(formatDurationCompact(59)).toBe('1m');
  });
});

describe('buildHistoryRowMeta (Z80)', () => {
  it('liczy PR per sesja raz dla całej listy (chronologicznie)', () => {
    const meta = buildHistoryRowMeta([
      session('w2', '2026-06-15', 80, 4320),
      session('w1', '2026-06-01', 60, 3600),
    ]);
    // Semantyka detectNewPRs: pierwsza sesja nie ma czego pobić (0 PR); cięższa druga = PR.
    expect(meta.get('w1')?.prCount).toBe(0);
    expect(meta.get('w2')?.prCount).toBeGreaterThan(0);
    expect(meta.get('w2')?.durationLabel).toBe('1h 12m');
  });

  it('lżejsza sesja po cięższej nie ma PR', () => {
    const meta = buildHistoryRowMeta([
      session('w1', '2026-06-01', 100),
      session('w2', '2026-06-15', 60),
    ]);
    expect(meta.get('w2')?.prCount).toBe(0);
  });

  it('sesja bez durationSec nie crashuje (durationLabel null)', () => {
    const meta = buildHistoryRowMeta([session('w1', '2026-06-01', 60)]);
    expect(meta.get('w1')?.durationLabel).toBeNull();
  });

  it('puste dane → pusta mapa', () => {
    expect(buildHistoryRowMeta([]).size).toBe(0);
  });
});
