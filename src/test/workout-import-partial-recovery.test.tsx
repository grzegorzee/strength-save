import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { computeImportBatchId, loadImportHistory } from '@/lib/workout-import/batch';

const state = vi.hoisted(() => ({
  uid: 'account-a',
  importCsvSessions: vi.fn(),
  deleteImportBatch: vi.fn(),
}));
vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({ uid: state.uid }) }));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({ useFirebaseWorkouts: () => state }));
vi.mock('@/hooks/useCustomExercises', () => ({
  useCustomExercises: () => ({ customExercises: [], addCustomExercise: vi.fn() }),
}));

import { WorkoutImportWizard } from '@/components/WorkoutImportWizard';

const csv = [
  'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
  '2026-09-01 17:00:00,First,30m,Bench Press (Barbell),1,60,8,0,0,,,',
  '2026-09-03 17:00:00,Second,30m,Bench Press (Barbell),1,65,8,0,0,,,',
].join('\n');
const batchId = computeImportBatchId(csv);
const renderWizard = () => render(<LanguageProvider><WorkoutImportWizard /></LanguageProvider>);
const deferredImport = () => {
  let settle!: (value: { success: boolean; written: number; error?: string }) => void;
  state.importCsvSessions.mockImplementationOnce(() => new Promise(resolve => { settle = resolve; }));
  return (written = 1) => act(async () => settle({ success: false, written, error: 'Connection lost after first workout' }));
};

const startImport = async () => {
  fireEvent.click(screen.getByTestId('import-wizard-open'));
  const file = new File([csv], 'two-workouts.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByTestId('import-file-input'), { target: { files: [file] } });
  await screen.findByTestId('import-to-confirm');
  fireEvent.click(screen.getByTestId('import-to-confirm'));
  fireEvent.click(screen.getByTestId('import-confirm-checkbox'));
  fireEvent.click(screen.getByTestId('import-write'));
  expect(state.importCsvSessions.mock.calls[0][0]).toHaveLength(2);
  expect(screen.queryByTestId('import-write')).not.toBeInTheDocument();
};

const closeAndReopen = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Zamknij okno' }));
  fireEvent.click(screen.getByTestId('import-wizard-open'));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  state.uid = 'account-a';
  state.importCsvSessions.mockReset();
  state.deleteImportBatch.mockReset().mockResolvedValue({ success: true, deleted: 1 });
});
afterEach(cleanup);

describe('partial CSV import retains owner Undo recovery', () => {
  it('two workouts → one saved + error → close → reopen → Undo removes the partial import', async () => {
    const fail = deferredImport();
    renderWizard();
    await startImport();
    expect(loadImportHistory('account-a')).toEqual([]);
    await fail();
    expect(screen.getByTestId('import-error')).toHaveTextContent('Connection lost after first workout');
    expect(screen.getByTestId('import-confirm-summary')).toBeInTheDocument();
    expect(screen.getByTestId('import-write')).toBeEnabled();
    expect(screen.queryByTestId('import-done')).not.toBeInTheDocument();

    closeAndReopen();
    expect(screen.getByTestId('import-history-entry')).toHaveTextContent('two-workouts.csv');
    expect(loadImportHistory('account-a')).toEqual([
      expect.objectContaining({ batchId, fileName: 'two-workouts.csv', workoutCount: 1, format: 'strong' }),
    ]);
    expect(loadImportHistory('account-b')).toEqual([]);
    fireEvent.click(screen.getByTestId('import-undo'));
    await act(async () => undefined);
    expect(state.deleteImportBatch).toHaveBeenCalledExactlyOnceWith(batchId);
    expect(screen.queryByTestId('import-history-entry')).not.toBeInTheDocument();
    expect(loadImportHistory('account-a')).toEqual([]);
  });

  it('retry keeps the same batch and reports full success only after all workouts are processed', async () => {
    const fail = deferredImport();
    state.importCsvSessions.mockResolvedValueOnce({ success: true, written: 2 });
    renderWizard();
    await startImport();
    await fail();
    expect(loadImportHistory('account-a')[0]?.workoutCount).toBe(1);
    expect(screen.queryByTestId('import-done')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('import-write'));
    await screen.findByTestId('import-done');
    expect(state.importCsvSessions.mock.calls[1][0]).toEqual(state.importCsvSessions.mock.calls[0][0]);
    expect(loadImportHistory('account-a')).toEqual([expect.objectContaining({ batchId, workoutCount: 2 })]);
    expect(screen.queryByTestId('import-error')).not.toBeInTheDocument();
  });

  it('a preflight failure with zero writes does not create an Undo entry', async () => {
    const fail = deferredImport();
    renderWizard();
    await startImport();
    await fail(0);
    expect(screen.getByTestId('import-error')).toBeInTheDocument();
    closeAndReopen();
    expect(screen.queryByTestId('import-history-entry')).not.toBeInTheDocument();
    expect(loadImportHistory('account-a')).toEqual([]);
  });

  it('an account switch still rejects a late partial result before changing history or UI', async () => {
    const fail = deferredImport();
    const view = renderWizard();
    await startImport();
    state.uid = 'account-b';
    view.rerender(<LanguageProvider><WorkoutImportWizard /></LanguageProvider>);
    await fail();
    fireEvent.click(screen.getByTestId('import-wizard-open'));
    expect(screen.queryByTestId('import-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('import-done')).not.toBeInTheDocument();
    expect(screen.queryByTestId('import-history-entry')).not.toBeInTheDocument();
    expect(loadImportHistory('account-a')).toEqual([]);
    expect(loadImportHistory('account-b')).toEqual([]);
  });
});
