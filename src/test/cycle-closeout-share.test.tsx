import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { PlanCycle } from '@/types/cycles';
import type { WorkoutSession } from '@/types';

// WP-PLANS-2 (X27, Task O4): closeout ("Faza ukończona") pokazuje 5. metrykę
// "Czas na siłowni" (suma durationSec ukończonych sesji cyklu) i ma przycisk
// udostępnienia karty podsumowania (mechanizm share wzorem treningu).

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, forEach: () => {} })),
  runTransaction: vi.fn(),
  addDoc: vi.fn(async () => ({})),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/user-events', () => ({ buildPlanEventEmitter: () => vi.fn() }));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    plan: [],
    isLoaded: true,
    isCustom: false,
    planStatus: 'none',
    planName: 'Mój blok FBW',
    planDurationWeeks: 12,
    planStartDate: null,
    savePlan: vi.fn(),
  }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: workoutsFixture.workouts,
    backfillHistoricalWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({
    cycles: [],
    isLoaded: true,
    archiveCurrentPlan: vi.fn(),
    createActiveCycle: vi.fn(),
    getCycleById: vi.fn(async () => cycleFixture.cycle),
  }),
}));

const workoutsFixture = vi.hoisted(() => ({ workouts: [] as unknown[] }));
const cycleFixture = vi.hoisted(() => ({ cycle: null as unknown }));

import NewPlan from '@/pages/NewPlan';
import { computeCycleTimeAtGymSec } from '@/components/CycleShareCard';

const cycle: PlanCycle = {
  id: 'cycle-1',
  userId: 'u1',
  days: [],
  durationWeeks: 12,
  startDate: '2026-05-04',
  endDate: '2026-07-27',
  status: 'completed',
  createdAt: '2026-05-04T08:00:00.000Z',
  stats: { totalWorkouts: 46, totalTonnage: 287300, prs: [], completionRate: 96 },
};

const workout = (id: string, date: string, durationSec: number | undefined, cycleId?: string): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [],
  ...(durationSec !== undefined ? { durationSec } : {}),
  ...(cycleId ? { cycleId } : {}),
});

describe('computeCycleTimeAtGymSec', () => {
  it('sumuje durationSec ukończonych sesji cyklu; brak czasu liczy się jako 0', () => {
    const workouts = [
      workout('w1', '2026-05-05', 3600, 'cycle-1'),
      workout('w2', '2026-05-07', 5400, 'cycle-1'),
      workout('w3', '2026-05-09', undefined, 'cycle-1'),
      // Spoza cyklu (inny cycleId) — nie liczy się.
      workout('w4', '2026-05-11', 999, 'cycle-2'),
      // Bez cycleId, ale w zakresie dat — liczy się (stare sesje sprzed tagowania).
      workout('w5', '2026-05-12', 600),
      // Bez cycleId i poza zakresem — nie liczy się.
      workout('w6', '2026-08-01', 999),
    ];
    expect(computeCycleTimeAtGymSec(workouts, cycle)).toBe(3600 + 5400 + 600);
  });
});

describe('closeout: kafel czasu + share (WP-PLANS-2)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    cycleFixture.cycle = cycle;
    workoutsFixture.workouts = [
      workout('w1', '2026-05-05', 3600, 'cycle-1'),
      workout('w2', '2026-05-07', 5400, 'cycle-1'),
    ];
  });

  it('renderuje "Czas na siłowni" = 2 h 30 min i przycisk udostępnienia', async () => {
    render(
      <MemoryRouter initialEntries={['/new-plan?fromCycle=cycle-1']}>
        <LanguageProvider>
          <UnitProvider>
            <NewPlan />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Faza ukończona')).toBeTruthy());
    expect(screen.getByText('Czas na siłowni')).toBeTruthy();
    expect(screen.getByText('2 h 30 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Udostępnij podsumowanie/ })).toBeTruthy();
  });
});
