// Bug 26 (X30): oba wejscia eksportu CSV (dialog Ustawien + sheet Historii)
// pokazywaly toast 'Wyeksportowano' BEZWARUNKOWO — takze gdy user zamknal share
// sheet ('aborted') albo navigator.share padl ('failed'). Falszywy sukces
// naruszal wzorzec Z198 ustanowiony w tym samym commicie WP-L.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { ShareExportResult } from '@/lib/share-export';
import type { WorkoutSession } from '@/types';

const toastMock = vi.hoisted(() => vi.fn());
const downloadCsvMock = vi.hoisted(() => vi.fn<() => Promise<ShareExportResult>>());
const fetchBoundsMock = vi.hoisted(() => vi.fn<() => Promise<WorkoutSession[]>>());
const reportErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-toast', () => ({ toast: toastMock, useToast: () => ({ toast: toastMock }) }));
vi.mock('@/lib/workout-csv-download', () => ({
  downloadWorkoutsCsvFile: downloadCsvMock,
  fetchWorkoutsForBounds: fetchBoundsMock,
}));
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: reportErrorMock }));
vi.mock('@/lib/pdf-report', () => ({
  buildTrainingReportModel: vi.fn(),
  generateTrainingReportPdf: vi.fn(),
}));

import { ExportWorkoutsDialog } from '@/components/ExportWorkoutsDialog';
import { HistoryExportSheet } from '@/components/history/HistoryExportSheet';

const workout: WorkoutSession = {
  id: 'w1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-20',
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 5, weight: 80, completed: true }] }],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  toastMock.mockReset();
  reportErrorMock.mockReset();
  downloadCsvMock.mockReset();
  fetchBoundsMock.mockReset().mockResolvedValue([workout]);
});

describe('ExportWorkoutsDialog — toast bramkowany wynikiem share', () => {
  const onOpenChange = vi.fn();

  const renderDialog = () =>
    render(
      <LanguageProvider>
        <ExportWorkoutsDialog open onOpenChange={onOpenChange} uid="u1" cycles={[]} workouts={[]} />
      </LanguageProvider>,
    );

  const submitExport = async () => {
    const button = await screen.findByTestId('export-submit');
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
  };

  beforeEach(() => {
    onOpenChange.mockReset();
  });

  it('aborted: zero toastu, dialog zostaje otwarty', async () => {
    downloadCsvMock.mockResolvedValue('aborted');
    renderDialog();
    await submitExport();
    await waitFor(() => expect(downloadCsvMock).toHaveBeenCalledTimes(1));
    expect(toastMock).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('failed: destructive toast, dialog zostaje otwarty', async () => {
    downloadCsvMock.mockResolvedValue('failed');
    renderDialog();
    await submitExport();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).toMatchObject({ variant: 'destructive' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('niezmiennik: shared = toast sukcesu + zamkniecie dialogu', async () => {
    downloadCsvMock.mockResolvedValue('shared');
    renderDialog();
    await submitExport();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).not.toMatchObject({ variant: 'destructive' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('HistoryExportSheet — galaz CSV bramkowana wynikiem share', () => {
  const onOpenChange = vi.fn();

  const renderSheet = () =>
    render(
      <LanguageProvider>
        <UnitProvider>
          <HistoryExportSheet
            open
            onOpenChange={onOpenChange}
            uid="u1"
            displayName="QA"
            period={null}
            periodLabel={null}
            cycles={[]}
            workouts={[]}
            onSendToCoach={vi.fn()}
          />
        </UnitProvider>
      </LanguageProvider>,
    );

  const tapCsv = async () => {
    fireEvent.click(await screen.findByTestId('export-format-csv'));
  };

  beforeEach(() => {
    onOpenChange.mockReset();
  });

  it('aborted: zero toastu, sheet zostaje otwarty', async () => {
    downloadCsvMock.mockResolvedValue('aborted');
    renderSheet();
    await tapCsv();
    await waitFor(() => expect(downloadCsvMock).toHaveBeenCalledTimes(1));
    expect(toastMock).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('failed: destructive toast, sheet zostaje otwarty', async () => {
    downloadCsvMock.mockResolvedValue('failed');
    renderSheet();
    await tapCsv();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).toMatchObject({ variant: 'destructive' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('niezmiennik: downloaded = toast sukcesu + zamkniecie sheeta', async () => {
    downloadCsvMock.mockResolvedValue('downloaded');
    renderSheet();
    await tapCsv();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).not.toMatchObject({ variant: 'destructive' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
