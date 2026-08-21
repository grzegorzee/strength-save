import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';

// WP-PLANS-1 (X27, Task P2): dialog końca planu ma TRZY akcje (zakończ i wybierz
// nowy / zakończ plan / anuluj); wariant "bez nowego" nie nawiguje do /new-plan.
// Edge 4: aktywny draft dnia planowego blokuje operację komunikatem.

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, forEach: () => {} })),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn(),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }) },
  addDoc: vi.fn(async () => ({})),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));

const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false,
    canUseStrava: false, canUseBodyPhotos: false,
  }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: [],
    getTotalWeight: () => 0,
    getCompletedWorkoutsCount: () => 0,
    getLatestMeasurement: () => null,
    isLoaded: true,
    error: null,
    backfillHistoricalWorkouts: backfillSpy,
  }),
}));

const setPlanStatusSpy = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const archiveSpy = vi.hoisted(() => vi.fn(async () => 'archived-1'));
const backfillSpy = vi.hoisted(() => vi.fn(async () => undefined));
const draftFixture = vi.hoisted(() => ({ draft: null as null | Record<string, unknown> }));

vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    plan: [planDay],
    isLoaded: true,
    isCustom: true,
    planStatus: 'active',
    setPlanStatus: setPlanStatusSpy,
    planDurationWeeks: 12,
    planStartDate: '2026-08-03',
    progression: null,
    scheduleOverrides: {},
    skippedDates: [],
    currentWeek: 3,
    isPlanExpired: false,
    weeksRemaining: 9,
    planStarted: true,
    planError: false,
    savePlan: vi.fn(),
  }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({
    cycles: [activeCycle],
    isLoaded: true,
    archiveCurrentPlan: archiveSpy,
    createActiveCycle: vi.fn(),
    deleteCycle: vi.fn(),
  }),
}));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: {
    loadActiveDraft: vi.fn(async () => draftFixture.draft),
    listDrafts: vi.fn(async () => []),
  },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0, list: () => [] },
}));

const planDay: TrainingDay = {
  id: 'day-1',
  dayName: 'Mój dzień A',
  weekday: 'monday',
  focus: 'Push',
  exercises: [{ id: 'ex-1', name: 'Wyciskanie', sets: '3 x 5', instructions: [] }],
};

const activeCycle: PlanCycle = {
  id: 'cycle-1',
  userId: 'u1',
  days: [planDay],
  durationWeeks: 12,
  startDate: '2026-08-03',
  endDate: '',
  status: 'active',
  createdAt: '2026-08-03T08:00:00.000Z',
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
};

import Cycles from '@/pages/Cycles';

const renderCycles = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <Cycles />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

const openDialog = async () => {
  fireEvent.click(screen.getByTestId('cycles-end-plan'));
  await waitFor(() => expect(screen.getByText(/Zakończyć obecny plan\?/)).toBeTruthy());
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  navigateSpy.mockClear();
  toastSpy.mockClear();
  setPlanStatusSpy.mockClear();
  archiveSpy.mockClear();
  backfillSpy.mockClear();
  draftFixture.draft = null;
});

describe('WP-PLANS-1: dialog końca planu (3 opcje)', () => {
  it('dialog pokazuje trzy akcje: anuluj / zakończ plan / zakończ i wybierz nowy', async () => {
    renderCycles();
    await openDialog();

    expect(screen.getByText('Anuluj')).toBeTruthy();
    expect(screen.getByTestId('end-plan-only')).toBeTruthy();
    expect(screen.getByTestId('end-plan-choose-new')).toBeTruthy();
  });

  it('"Zakończ plan" (bez nowego) kończy plan i NIE nawiguje do /new-plan', async () => {
    renderCycles();
    await openDialog();

    fireEvent.click(screen.getByTestId('end-plan-only'));

    await waitFor(() => expect(setPlanStatusSpy).toHaveBeenCalledWith('ended'));
    expect(archiveSpy).toHaveBeenCalled();
    expect(backfillSpy).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalledWith(expect.stringContaining('/new-plan'));
  });

  it('"Zakończ i wybierz nowy" kończy plan i nawiguję do /new-plan?fromCycle=…', async () => {
    renderCycles();
    await openDialog();

    fireEvent.click(screen.getByTestId('end-plan-choose-new'));

    await waitFor(() => expect(setPlanStatusSpy).toHaveBeenCalledWith('ended'));
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/new-plan?fromCycle=archived-1'));
  });

  it('Edge 4: aktywny draft dnia planowego blokuje operację komunikatem', async () => {
    draftFixture.draft = {
      dayId: 'day-1', date: '2026-08-21', completedLocally: false,
      finalSyncPending: false, dirty: true, sessionId: 's1', exerciseSets: {},
    };
    renderCycles();

    fireEvent.click(screen.getByTestId('cycles-end-plan'));

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    ));
    expect(screen.queryByText(/Zakończyć obecny plan\?/)).toBeNull();
    expect(archiveSpy).not.toHaveBeenCalled();
    expect(setPlanStatusSpy).not.toHaveBeenCalled();
  });
});
