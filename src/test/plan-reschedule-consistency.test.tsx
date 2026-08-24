// WP-A (X29): spójność przełożenia treningu w zakładce Plan. Root cause builda
// 116: buildTrainingSchedule liczył timeline i badge NASTĘPNY czystą regułą
// weekday (bez scheduleOverrides), więc po przełożeniu pon->śr Plan dalej
// pokazywał trening w poniedziałek, a Dashboard (resolver z overrides) w środę.
// Fixtury dokumentów przez canonical-states (zasada 11), mapa overrides przez
// produkcyjny builder buildScheduleMove (nie ręczny obiekt).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { ScheduleOverrides } from '@/lib/plan-schedule';
import { buildScheduleMove } from '@/lib/schedule-overrides';
import {
  buildCanonicalState,
  type CanonicalState,
} from '@/test/canonical-states';

const harness = vi.hoisted(() => ({
  state: undefined as unknown as CanonicalState,
  overrides: {} as ScheduleOverrides,
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
      scheduleOverrides: harness.overrides,
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

const NEXT_BADGE = 'Następny';
// Środa 2026-08-19 (jak w week-pagerze): active-plan ma day-a dziś (środa)
// i day-b w piątek 2026-08-21.
const TODAY = '2026-08-19';
const THURSDAY = '2026-08-20';
const FRIDAY = '2026-08-21';

const renderPlan = (overrides: ScheduleOverrides = {}) => {
  harness.state = buildCanonicalState('active-plan');
  harness.overrides = overrides;
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

/** Grupa dnia w timeline (header + karty) po dacie. */
const dayGroup = (dateISO: string) =>
  screen.getByTestId(`plan-day-header-${dateISO}`).closest('.mb-3')!;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 19, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WP-A (X29): zakładka Plan honoruje scheduleOverrides', () => {
  it('po przełożeniu (środa -> czwartek) karta i badge NASTĘPNY siedzą na czwartku, środa bez karty treningu', () => {
    const state = buildCanonicalState('active-plan');
    const move = buildScheduleMove({
      overrides: {},
      planDays: state.plan!.days,
      fromISO: TODAY,
      toISO: THURSDAY,
      todayISO: TODAY,
      planStartDateISO: state.plan!.startDate,
    });
    expect(move.ok).toBe(true);
    renderPlan(move.ok ? move.overrides : {});

    // Czwartek: karta przeniesionego dnia A z badge NASTĘPNY.
    const thursday = dayGroup(THURSDAY);
    expect(thursday.textContent).toContain('Dzień A');
    expect(thursday.textContent).toContain(NEXT_BADGE);
    expect(screen.getAllByText(NEXT_BADGE)).toHaveLength(1);

    // Środa (dzień źródłowy): zero karty treningu.
    expect(screen.queryByTestId(`plan-day-header-${TODAY}`)).toBeNull();

    // Piątek: dzień B nietknięty (przełożenie nie zabiera nic reszcie tygodnia).
    expect(dayGroup(FRIDAY).textContent).toContain('Dzień B');
  });

  it('niezmiennik (zasada 5): bez overrides wszystkie dni tygodnia na swoich miejscach', () => {
    renderPlan({});

    expect(dayGroup(TODAY).textContent).toContain('Dzień A');
    expect(dayGroup(FRIDAY).textContent).toContain('Dzień B');
    // Badge na dzisiejszym (nieukończonym) dniu, dokładnie jeden.
    expect(dayGroup(TODAY).textContent).toContain(NEXT_BADGE);
    expect(screen.getAllByText(NEXT_BADGE)).toHaveLength(1);
  });

  it('ikona kalendarza nie renderuje się dla dat przed startem planu', () => {
    // Dzień B przeniesiony na czwartek, a plan "wystartował" dopiero w piątek:
    // czwartkowa karta jest przed startem planu, więc bez wejścia w przełożenie.
    harness.state = buildCanonicalState('active-plan');
    harness.state = {
      ...harness.state,
      plan: { ...harness.state.plan!, startDate: FRIDAY },
    };
    harness.overrides = { [FRIDAY]: null, [THURSDAY]: 'day-b' };
    render(
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <TrainingPlan />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );

    // Data przed startem nie istnieje w resolverze, więc nie ma karty
    // treningu ani ikony przełożenia (dead-click builda 116).
    expect(screen.queryByTestId(`plan-day-header-${THURSDAY}`)).toBeNull();
    expect(screen.queryByLabelText('Przełóż trening')).toBeNull();
  });
});
