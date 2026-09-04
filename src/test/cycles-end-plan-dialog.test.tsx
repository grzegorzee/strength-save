import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';

// WP-PLANS-1 (X27, Task P2) + X35b (decyzja właściciela pkt 4): sekcja Plan na
// stronie Cykle ma TRZY przyciski, każdy z własnym potwierdzeniem:
// "Zakończ plan" / "Zakończ plan i ułóż nowy" (nawiguje do /new-plan) /
// "Ustaw plan od nowa" (dawny Reset planu z /settings). Edge 4: aktywny
// draft dnia planowego blokuje każdą z akcji komunikatem.

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

const updateDocSpy = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  getDoc: vi.fn(),
  setDoc: vi.fn(async () => {}),
  updateDoc: updateDocSpy,
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
    loadDraftForDay: vi.fn(async () => null),
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

const openAndConfirm = async (testId: string, title: RegExp, confirmLabel: string) => {
  fireEvent.click(screen.getByTestId(testId));
  const dialog = await screen.findByRole('alertdialog');
  expect(within(dialog).getByText(title)).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  navigateSpy.mockClear();
  toastSpy.mockClear();
  setPlanStatusSpy.mockClear();
  archiveSpy.mockClear();
  backfillSpy.mockClear();
  updateDocSpy.mockClear();
  draftFixture.draft = null;
});

describe('X35b: sekcja Plan na stronie Cykle (3 przyciski z potwierdzeniem)', () => {
  it('sekcja pokazuje trzy akcje: zakończ / zakończ i ułóż nowy / onboarding od nowa', () => {
    renderCycles();
    const section = screen.getByTestId('cycles-plan-section');
    expect(within(section).getByTestId('cycles-end-plan').textContent).toContain('Zakończ plan');
    expect(within(section).getByTestId('cycles-end-plan-new').textContent).toContain('Zakończ plan i ułóż nowy');
    expect(within(section).getByTestId('cycles-reset-onboarding').textContent).toContain('Ustaw plan od nowa');
    // Żaden przycisk nie działa bez potwierdzenia.
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('"Zakończ plan" → potwierdzenie → kończy plan i NIE nawiguje do /new-plan', async () => {
    renderCycles();
    await openAndConfirm('cycles-end-plan', /Zakończyć obecny plan\?/, 'Zakończ plan');

    await waitFor(() => expect(setPlanStatusSpy).toHaveBeenCalledWith('ended', expect.objectContaining({ expectedStartDate: expect.any(String) })));
    expect(archiveSpy).toHaveBeenCalled();
    expect(backfillSpy).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalledWith(expect.stringContaining('/new-plan'));
  });

  it('"Zakończ plan i ułóż nowy" → potwierdzenie → kończy plan i nawiguje do /new-plan?fromCycle=…', async () => {
    renderCycles();
    await openAndConfirm('cycles-end-plan-new', /Zakończyć obecny plan\?/, 'Zakończ i wybierz nowy');

    await waitFor(() => expect(setPlanStatusSpy).toHaveBeenCalledWith('ended', expect.objectContaining({ expectedStartDate: expect.any(String) })));
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/new-plan?fromCycle=archived-1'));
  });

  it('"Ustaw plan od nowa" → potwierdzenie → zamyka aktywne cykle i resetuje onboarding (bez endPlan)', async () => {
    renderCycles();
    await openAndConfirm('cycles-reset-onboarding', /Ustawić plan od nowa\?/, 'Ustaw plan od nowa');

    await waitFor(() => expect(updateDocSpy).toHaveBeenCalledWith(
      { col: 'users', id: 'u1' },
      expect.objectContaining({ onboardingCompleted: false, onboarding: expect.objectContaining({ state: 'in_progress', version: 2 }) }),
    ));
    expect(updateDocSpy).toHaveBeenCalledWith(
      { col: 'plan_cycles', id: 'cycle-1' },
      expect.objectContaining({ status: 'completed' }),
    );
    expect(archiveSpy).not.toHaveBeenCalled();
    expect(setPlanStatusSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Onboarding zresetowany' })));
  });

  it('Anuluj w potwierdzeniu = zero mutacji', async () => {
    renderCycles();
    fireEvent.click(screen.getByTestId('cycles-reset-onboarding'));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Anuluj' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(updateDocSpy).not.toHaveBeenCalled();
    expect(archiveSpy).not.toHaveBeenCalled();
  });

  it('Edge 4: aktywny draft dnia planowego blokuje KAŻDĄ z trzech akcji komunikatem', async () => {
    draftFixture.draft = {
      dayId: 'day-1', date: '2026-08-21', completedLocally: false,
      finalSyncPending: false, dirty: true, sessionId: 's1', exerciseSets: {},
    };
    renderCycles();

    for (const id of ['cycles-end-plan', 'cycles-end-plan-new', 'cycles-reset-onboarding']) {
      toastSpy.mockClear();
      fireEvent.click(screen.getByTestId(id));
      await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' }),
      ));
      expect(screen.queryByRole('alertdialog')).toBeNull();
    }
    expect(archiveSpy).not.toHaveBeenCalled();
    expect(setPlanStatusSpy).not.toHaveBeenCalled();
    expect(updateDocSpy).not.toHaveBeenCalled();
  });
});
