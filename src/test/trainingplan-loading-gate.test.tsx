// WP-B (X29): gate ładowania zakładki Plan — koniec flasha "100% -> 0%".
// Root cause: TrainingPlan nie pobierał isLoaded z useTrainingPlan, a workouts
// (modułowy store) są dostępne od pierwszego frame'a. Przy planStartDate=null
// completedInPlan łapał WSZYSTKIE ukończone sesje z okna recent, a
// remainingWorkouts=0 (ternary na planStartDate) → pasek i metaProgress
// pokazywały 100%; po snapshotcie planu spadały do prawdy. Wzorzec gate'a:
// Dashboard.tsx (if (!isLoaded || !planIsLoaded) → spinner common.loading).
// Fixtury dokumentów przez canonical-states (zasada 11 CLAUDE.md).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { buildCanonicalState, type CanonicalState } from '@/test/canonical-states';
import { computePlanProgressPercent } from '@/lib/plan-schedule';

const gate = vi.hoisted(() => ({
  state: undefined as unknown as CanonicalState,
  planLoaded: true,
  cyclesLoaded: true,
  planError: false,
  hasTrustedPlan: true,
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
  return { useCurrentUser: () => helpers.buildUseCurrentUserResult(gate.state) };
});
vi.mock('@/hooks/useTrainingPlan', async () => {
  const helpers = await import('@/test/canonical-states');
  return {
    useTrainingPlan: () => {
      const base = helpers.buildUseTrainingPlanResult(gate.state);
      if (gate.planLoaded) return {
        ...base,
        planError: gate.planError,
        isCustom: gate.hasTrustedPlan,
        hasServerSnapshot: gate.hasTrustedPlan,
      };
      // Pierwszy frame przed snapshotem planu = defaulty hooka
      // (useTrainingPlan.ts:39-62): isLoaded=false, planStartDate=null,
      // isCustom=false → planStatus 'none'.
      return { ...base, isLoaded: false, planStartDate: null, isCustom: false, planStatus: 'none' as const };
    },
  };
});
vi.mock('@/hooks/useFirebaseWorkouts', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useFirebaseWorkouts: () => helpers.buildUseFirebaseWorkoutsResult(gate.state) };
});
vi.mock('@/hooks/usePlanCycles', async () => {
  const helpers = await import('@/test/canonical-states');
  return {
    usePlanCycles: () => {
      const base = helpers.buildUsePlanCyclesResult(gate.state);
      return gate.cyclesLoaded ? base : { ...base, cycles: [], isLoaded: false };
    },
  };
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

const LOADER = 'Ładowanie...';

const planTree = () => (
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider>
        <TrainingPlan />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>
);

const renderPlan = () => render(planTree());

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  // Stan z ukończonymi sesjami w oknie recent — dokładnie ten, na którym
  // pierwszy frame bez gate'a pokazywał 100%.
  gate.state = buildCanonicalState('active-plan');
  gate.planLoaded = true;
  gate.cyclesLoaded = true;
  gate.planError = false;
  gate.hasTrustedPlan = true;
});

describe('WP-B (X29) — gate ładowania zakładki Plan (flash 100% -> 0%)', () => {
  it('plan niezaładowany + ukończone sesje w store → loader, zero "100%" i metaProgress', () => {
    gate.planLoaded = false;
    renderPlan();

    expect(screen.getByText(LOADER)).toBeTruthy();
    expect(screen.queryByText(/100%/)).toBeNull();
    expect(screen.queryByText(/zrobione/)).toBeNull();
  });

  it('cykle niezaładowane → też loader (karta decyzji liczy z cykli)', () => {
    gate.cyclesLoaded = false;
    renderPlan();

    expect(screen.getByText(LOADER)).toBeTruthy();
    expect(screen.queryByText(/zrobione/)).toBeNull();
  });

  it('po isLoaded=true render normalny: metaProgress z realnym procentem, bez loadera', () => {
    gate.planLoaded = false;
    const view = renderPlan();
    expect(screen.getByText(LOADER)).toBeTruthy();

    gate.planLoaded = true;
    view.rerender(planTree());

    expect(screen.queryByText(LOADER)).toBeNull();
    // Aktywny cykl w połowie (2 ukończone, reszta przed userem) → linia
    // metaProgress z realnymi liczbami, procent < 100.
    const meta = screen.getByText(/zrobione/);
    expect(meta.textContent).toContain('2 zrobione');
    expect(meta.textContent).not.toContain('100%');
  });

  it('błąd planu bez zaufanego snapshotu nie renderuje defaultPlan i ma retry', () => {
    gate.planError = true;
    gate.hasTrustedPlan = false;
    renderPlan();

    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać planu');
    expect(screen.getByRole('button', { name: 'Spróbuj ponownie' })).toBeInTheDocument();
    expect(screen.queryByText(/zrobione/)).toBeNull();
  });

  it('chwilowy błąd po dobrym snapshotcie nie zasłania planu użytkownika', () => {
    gate.planError = true;
    gate.hasTrustedPlan = true;
    renderPlan();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/zrobione/)).toBeInTheDocument();
  });
});

describe('WP-B (X29) — computePlanProgressPercent: obrona w głębi', () => {
  it('jawnie przekazany planStartDate=null → 0 mimo completed>0 i remaining=0', () => {
    expect(computePlanProgressPercent({
      completedCount: 5,
      remainingCount: 0,
      planStarted: true,
      planStartDate: null,
    })).toBe(0);
  });

  it('jawnie przekazany undefined → 0 (pierwszy frame bez daty startu)', () => {
    expect(computePlanProgressPercent({
      completedCount: 5,
      remainingCount: 0,
      planStarted: true,
      planStartDate: undefined,
    })).toBe(0);
  });

  it('wywołanie bez pola zachowuje się jak dotąd (zasada 5)', () => {
    expect(computePlanProgressPercent({ completedCount: 5, remainingCount: 0, planStarted: true })).toBe(100);
    expect(computePlanProgressPercent({ completedCount: 0, remainingCount: 0, planStarted: true })).toBe(0);
    expect(computePlanProgressPercent({ completedCount: 2, remainingCount: 6, planStarted: false })).toBe(0);
  });

  it('z realną datą startu liczy jak dotąd', () => {
    expect(computePlanProgressPercent({
      completedCount: 2,
      remainingCount: 2,
      planStarted: true,
      planStartDate: '2026-08-03',
    })).toBe(50);
  });
});
