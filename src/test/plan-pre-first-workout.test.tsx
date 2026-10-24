// 2026-10-24 (konto realnej testerki): kreator z pierwszym treningiem w środku
// tygodnia wpisuje wcześniejsze dni treningowe tygodnia startu do skippedDates.
// Zakładka Plan pokazywała je jako "Odpuszczone" (z "Przywróć trening"), choć to
// dni PRZED startem planu. Niezmiennik: ręczne odpuszczenie po pierwszym
// treningu nadal jest "Odpuszczone". skippedDates z produkcyjnego buildera.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { buildFirstWorkoutSchedule } from '@/lib/first-workout-schedule';
import {
  buildCanonicalState,
  type CanonicalState,
} from '@/test/canonical-states';

const harness = vi.hoisted(() => ({
  state: undefined as unknown as CanonicalState,
  skippedDates: [] as string[],
  planStartDate: '' as string,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  getDocFromServer: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, docs: [], forEach: () => {} })),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn(async () => {}) })),
  increment: vi.fn(),
  serverTimestamp: vi.fn(() => 0),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }), now: () => ({ toMillis: () => Date.now() }) },
  addDoc: vi.fn(async () => ({})),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn(async () => {}) }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/contexts/UserContext', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useCurrentUser: () => helpers.buildUseCurrentUserResult(harness.state) };
});
vi.mock('@/hooks/useTrainingPlan', async () => {
  const helpers = await import('@/test/canonical-states');
  return {
    useTrainingPlan: () => ({
      ...helpers.buildUseTrainingPlanResult(harness.state),
      skippedDates: harness.skippedDates,
      planStartDate: harness.planStartDate,
    }),
  };
});
vi.mock('@/hooks/useFirebaseWorkouts', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useFirebaseWorkouts: () => helpers.buildUseFirebaseWorkoutsResult(harness.state) };
});
vi.mock('@/hooks/usePlanCycles', async () => {
  const helpers = await import('@/test/canonical-states');
  return { usePlanCycles: () => helpers.buildUsePlanCyclesResult(harness.state) };
});
vi.mock('@/hooks/useActivities', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useActivities: () => helpers.buildUseActivitiesResult() };
});
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
  toast: vi.fn(),
}));

import TrainingPlan from '@/pages/TrainingPlan';

// Środa 2026-08-19: stan active-plan ma dzień A w środy i dzień B w piątki.
// Kreator: start w tym tygodniu (pon 17.08), pierwszy trening piątek 21.08.
const TODAY = '2026-08-19';
const FRIDAY = '2026-08-21';

const renderPlan = (skippedDates: string[]) => {
  harness.state = buildCanonicalState('active-plan', TODAY);
  harness.planStartDate = '2026-08-17';
  harness.skippedDates = skippedDates;
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <TrainingPlan />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 19, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Plan: dni sprzed pierwszego treningu to nie odpuszczone treningi', () => {
  it('dzień przed pierwszym treningiem: bez karty i bez "Odpuszczone"; pierwszy trening = Następny', () => {
    const schedule = buildFirstWorkoutSchedule(FRIDAY, ['wednesday', 'friday'], TODAY);
    expect(schedule).toEqual({ startDate: '2026-08-17', skippedDates: [TODAY] });
    renderPlan(schedule.skippedDates);

    expect(screen.queryByTestId(`plan-day-header-${TODAY}`)).toBeNull();
    expect(screen.queryByText('Odpuszczone')).toBeNull();
    const friday = screen.getByTestId(`plan-day-header-${FRIDAY}`).closest('.mb-3')!;
    expect(within(friday as HTMLElement).getByText('Następny')).toBeTruthy();
  });

  it('NIEZMIENNIK: ręczne odpuszczenie po pierwszym treningu dalej pokazuje "Odpuszczone"', () => {
    renderPlan([FRIDAY]);
    const friday = screen.getByTestId(`plan-day-header-${FRIDAY}`).closest('.mb-3')!;
    expect(within(friday as HTMLElement).getByText('Odpuszczone')).toBeTruthy();
  });
});
