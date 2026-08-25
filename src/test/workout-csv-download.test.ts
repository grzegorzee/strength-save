// Bug 26 (X30): downloadWorkoutsCsvFile porzucal ShareExportResult (Promise<void>),
// wiec callerzy (ExportWorkoutsDialog, HistoryExportSheet) nie mieli JAK zareagowac
// na 'aborted'/'failed' i pokazywali toast sukcesu bezwarunkowo. Helper musi
// przekazywac wynik shareOrDownloadFile w gore + opcjonalny onShareError (WP-E).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShareExportResult } from '@/lib/share-export';
import type { WorkoutSession } from '@/types';

const shareMock = vi.hoisted(() =>
  vi.fn<(file: File, options?: { onShareError?: (err: unknown) => void }) => Promise<ShareExportResult>>());

const fetchPageMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/share-export', () => ({ shareOrDownloadFile: shareMock }));
vi.mock('@/lib/workout-read-store', () => ({ fetchWorkoutHistoryPage: fetchPageMock }));

import { downloadWorkoutsCsvFile, fetchWorkoutsForBounds } from '@/lib/workout-csv-download';

const workout: WorkoutSession = {
  id: 'w1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-20',
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 5, weight: 80, completed: true }] }],
};

beforeEach(() => {
  shareMock.mockReset();
});

describe('downloadWorkoutsCsvFile — wynik share idzie w gore', () => {
  it.each(['shared', 'downloaded', 'aborted', 'failed'] as const)('zwraca %s z shareOrDownloadFile', async (result) => {
    shareMock.mockResolvedValue(result);
    await expect(downloadWorkoutsCsvFile([workout])).resolves.toBe(result);
  });

  it('przekazuje onShareError do shareOrDownloadFile (telemetria WP-E)', async () => {
    shareMock.mockResolvedValue('failed');
    const onShareError = vi.fn();
    await downloadWorkoutsCsvFile([workout], { onShareError });
    expect(shareMock.mock.calls[0][1]).toMatchObject({ onShareError });
  });
});

// WP-D (X35a): tryb 'cycle' = zapytanie po datach cyklu + filtr po cycleId.
// Sesja ad hoc z INNEGO cyklu w tych samych datach NIE wchodzi; sesja bez
// cycleId (legacy) w zakresie dat wchodzi; tryb 'dates' bez filtra jak dotąd.
describe('fetchWorkoutsForBounds — tryb cycle (WP-D)', () => {
  const inCycle: WorkoutSession = { ...workout, id: 'in', cycleId: 'cycle-A' };
  const adhocOtherCycle: WorkoutSession = { ...workout, id: 'adhoc', dayId: 'adhoc-1', cycleId: 'cycle-B' };
  const legacyNoCycle: WorkoutSession = { ...workout, id: 'legacy' };

  beforeEach(() => {
    fetchPageMock.mockReset().mockResolvedValue({
      workouts: [inCycle, adhocOtherCycle, legacyNoCycle],
      nextCursor: null,
    });
  });

  it('zapytanie idzie po datach cyklu (completed), wynik tylko cycleId cyklu + legacy bez cycleId', async () => {
    const result = await fetchWorkoutsForBounds('u1', {
      mode: 'cycle', cycleId: 'cycle-A', fromDate: '2026-08-01', toDate: '2026-08-31',
    });
    expect(fetchPageMock).toHaveBeenCalledWith('u1', expect.objectContaining({
      fromDate: '2026-08-01', toDate: '2026-08-31', completed: true,
    }));
    expect(result.map((w) => w.id)).toEqual(['in', 'legacy']);
  });

  it('niezmiennik: tryb dates zwraca wszystko z zakresu bez filtra cycleId', async () => {
    const result = await fetchWorkoutsForBounds('u1', { mode: 'dates', fromDate: '2026-08-01', toDate: '2026-08-31' });
    expect(result.map((w) => w.id)).toEqual(['in', 'adhoc', 'legacy']);
  });
});
