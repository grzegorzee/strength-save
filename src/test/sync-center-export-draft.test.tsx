// Bug 50 (X30): "Eksport JSON" szkicu w Sync Center ignorowal ShareExportResult —
// na native padniety share sheet ('failed') konczyl sie ZEROWYM feedbackiem
// (bez toastu, bez telemetrii), a sukces nie mial potwierdzenia (niespojnosc
// z DataManagement z tego samego commita WP-L). 'aborted' milczy celowo (Z198).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { ShareExportResult } from '@/lib/share-export';

const toastMock = vi.hoisted(() => vi.fn());
const shareMock = vi.hoisted(() => vi.fn<() => Promise<ShareExportResult>>());
const reportErrorMock = vi.hoisted(() => vi.fn());

const draftFixture = {
  sessionId: 's1',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-20',
  cycleId: null,
  sessionOrigin: 'remote' as const,
  remoteSessionId: 's1',
  exerciseSets: { 'ex-1': [{ reps: 5, weight: 80, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1,
  updatedAt: 2,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: true,
  version: 1,
};

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/lib/share-export', () => ({ shareOrDownloadFile: shareMock }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: reportErrorMock }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => ({ isOnline: true }) }));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    createWorkoutSession: vi.fn(),
    batchSaveWorkout: vi.fn(),
    getWorkoutSessionFromServer: vi.fn(),
  }),
}));
vi.mock('@/hooks/useSyncCenterEntries', () => ({
  useSyncCenterEntries: () => ({
    isLoaded: true,
    drafts: [draftFixture],
    queueEntries: [],
    setDrafts: vi.fn(),
    setQueueEntries: vi.fn(),
    listedEntries: [draftFixture],
    reload: vi.fn(async () => {}),
  }),
}));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: {
    loadDraft: vi.fn(async () => draftFixture),
    listDrafts: vi.fn(async () => [draftFixture]),
    markPromotedToRemote: vi.fn(),
    markDraftSynced: vi.fn(),
    setCloudBaseline: vi.fn(),
    setPendingWrite: vi.fn(),
    clearActiveDraftIfVersion: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: {
    list: vi.fn(() => []),
    markRetry: vi.fn(),
    upsertFromDraft: vi.fn(),
    remove: vi.fn(),
  },
}));

import { SyncCenterCard } from '@/components/SyncCenterCard';

const renderCard = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <SyncCenterCard uid="u1" />
      </LanguageProvider>
    </MemoryRouter>,
  );

const clickExportJson = async () => {
  fireEvent.click(await screen.findByText('Eksport JSON'));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  toastMock.mockReset();
  reportErrorMock.mockReset();
  shareMock.mockReset();
});

describe('SyncCenterCard — eksport szkicu konsumuje wynik share', () => {
  it('failed: destructive toast + telemetria draft-export-share', async () => {
    shareMock.mockImplementation(async (_file, options?: { onShareError?: (err: unknown) => void }) => {
      options?.onShareError?.(new Error('share broke'));
      return 'failed';
    });
    renderCard();
    await clickExportJson();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).toMatchObject({ variant: 'destructive' });
    expect(reportErrorMock).toHaveBeenCalledWith('u1', expect.objectContaining({ code: 'draft-export-share' }));
  });

  it('aborted (zamkniety sheet): cisza — zero toastow (Z198)', async () => {
    shareMock.mockResolvedValue('aborted');
    renderCard();
    await clickExportJson();
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('sukces (shared): toast potwierdzenia jak w DataManagement', async () => {
    shareMock.mockResolvedValue('shared');
    renderCard();
    await clickExportJson();
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    expect(toastMock.mock.calls[0][0]).not.toMatchObject({ variant: 'destructive' });
  });
});
