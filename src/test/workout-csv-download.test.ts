// Bug 26 (X30): downloadWorkoutsCsvFile porzucal ShareExportResult (Promise<void>),
// wiec callerzy (ExportWorkoutsDialog, HistoryExportSheet) nie mieli JAK zareagowac
// na 'aborted'/'failed' i pokazywali toast sukcesu bezwarunkowo. Helper musi
// przekazywac wynik shareOrDownloadFile w gore + opcjonalny onShareError (WP-E).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShareExportResult } from '@/lib/share-export';
import type { WorkoutSession } from '@/types';

const shareMock = vi.hoisted(() =>
  vi.fn<(file: File, options?: { onShareError?: (err: unknown) => void }) => Promise<ShareExportResult>>());

vi.mock('@/lib/share-export', () => ({ shareOrDownloadFile: shareMock }));
vi.mock('@/lib/workout-read-store', () => ({ fetchWorkoutHistoryPage: vi.fn() }));

import { downloadWorkoutsCsvFile } from '@/lib/workout-csv-download';

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
