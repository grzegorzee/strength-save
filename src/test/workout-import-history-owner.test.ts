import { beforeEach, describe, expect, it } from 'vitest';
import { addImportHistoryEntry, loadImportHistory, removeImportHistoryEntry, type ImportHistoryEntry } from '@/lib/workout-import/batch';

const entry: ImportHistoryEntry = {
  batchId: 'same-file', fileName: 'private-training-history.csv',
  importedAt: '2026-09-06T10:00:00Z', workoutCount: 2, format: 'strong',
};

beforeEach(() => localStorage.clear());

describe('launch W9: import history has an explicit owner', () => {
  it('A -> B -> A does not expose filenames or let B remove A history', () => {
    addImportHistoryEntry(entry, 'account-a');
    expect(loadImportHistory('account-a')).toEqual([entry]);
    expect(loadImportHistory('account-b')).toEqual([]);
    removeImportHistoryEntry(entry.batchId, 'account-b');
    expect(loadImportHistory('account-a')).toEqual([entry]);
    removeImportHistoryEntry(entry.batchId, 'account-a');
    expect(loadImportHistory('account-a')).toEqual([]);
  });

  it('does not assign ownerless legacy filenames to whoever logs in next', () => {
    const legacy = JSON.stringify([entry]);
    localStorage.setItem('fittracker_import_history_v1', legacy);
    expect(loadImportHistory('account-a')).toEqual([]);
    expect(loadImportHistory('account-b')).toEqual([]);
    expect(localStorage.getItem('fittracker_import_history_v1')).toBe(legacy);
  });

  it('signed-out access cannot create or read any history', () => {
    addImportHistoryEntry(entry, '');
    expect(loadImportHistory('')).toEqual([]);
  });
});
