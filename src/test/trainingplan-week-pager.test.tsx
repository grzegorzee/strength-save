// WP-C (X28): pager tygodni zakładki Plan.
// (a) Link "Wróć do bieżącego tygodnia" renderuje się TYLKO gdy plan wystartował
//     i user ogląda inny tydzień niż bieżący; przy planie niewystartowanym
//     tydzień 1 pokazuje neutralne "Start planu: {data}" zamiast linku.
// (b) Badge NASTĘPNY liczony GLOBALNIE z pełnego harmonogramu (dokładnie jedna
//     data w całym planie), nie per widoczny tydzień (bug builda 114: każdy
//     przyszły tydzień miał "następny" na pierwszym dniu).
// Fixtury dokumentów przez canonical-states (zasada 11 CLAUDE.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import {
  buildCanonicalState,
  type CanonicalState,
  type CanonicalStateId,
} from '@/test/canonical-states';

const pager = vi.hoisted(() => ({
  state: undefined as unknown as CanonicalState,
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
  return { useCurrentUser: () => helpers.buildUseCurrentUserResult(pager.state) };
});
vi.mock('@/hooks/useTrainingPlan', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useTrainingPlan: () => helpers.buildUseTrainingPlanResult(pager.state) };
});
vi.mock('@/hooks/useFirebaseWorkouts', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useFirebaseWorkouts: () => helpers.buildUseFirebaseWorkoutsResult(pager.state) };
});
vi.mock('@/hooks/usePlanCycles', async () => {
  const helpers = await import('@/test/canonical-states');
  return { usePlanCycles: () => helpers.buildUsePlanCyclesResult(pager.state) };
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

const OLD_BACK_COPY = '← Bieżący tydzień';
const BACK_COPY = 'Wróć do bieżącego tygodnia';
const NEXT_BADGE = 'Następny';

const renderPlan = (stateId: CanonicalStateId) => {
  pager.state = buildCanonicalState(stateId);
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

const goNextWeek = () => fireEvent.click(screen.getByLabelText('Następny tydzień'));

const expectNoBackLink = () => {
  expect(screen.queryByText(OLD_BACK_COPY)).toBeNull();
  expect(screen.queryByText(BACK_COPY)).toBeNull();
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  // Środa 2026-08-19: dni kanonicznych stanów wypadają deterministycznie
  // (plan-midweek-done-wpc wymaga todayISO środa-niedziela).
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 19, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WP-C (X28) — pager tygodni zakładki Plan', () => {
  it('Edge 1: plan niewystartowany — zero linku powrotu, "Start planu" na tygodniu 1, NASTĘPNY tylko na pierwszym dniu od startu', () => {
    renderPlan('plan-future-start-wpc');

    // Widok domyślny (tydzień sprzed startu): bez linku, bez badge.
    expectNoBackLink();
    expect(screen.queryAllByText(NEXT_BADGE)).toHaveLength(0);

    // Start = poniedziałek 2 tygodnie w przód → 2 kliki do tygodnia 1.
    goNextWeek();
    goNextWeek();
    expect(screen.getByText(/Start planu/)).toBeTruthy();
    expectNoBackLink();
    expect(screen.getAllByText(NEXT_BADGE)).toHaveLength(1);

    // Tydzień 2: bez "Start planu", bez linku, bez badge (next jest w tygodniu 1).
    goNextWeek();
    expect(screen.queryByText(/Start planu/)).toBeNull();
    expectNoBackLink();
    expect(screen.queryAllByText(NEXT_BADGE)).toHaveLength(0);
  });

  it('Edge 2: plan wystartowany — link powrotu tylko poza bieżącym tygodniem, NASTĘPNY tylko na realnie następnym dniu', () => {
    renderPlan('active-plan');

    // Bieżący tydzień: bez linku, badge na dzisiejszym (nieukończonym) dniu.
    expectNoBackLink();
    expect(screen.getAllByText(NEXT_BADGE)).toHaveLength(1);

    // Tydzień przyszły: link powrotu widoczny, ŻADNEGO badge (next jest dziś).
    goNextWeek();
    expect(screen.getByText(BACK_COPY)).toBeTruthy();
    expect(screen.queryByText(OLD_BACK_COPY)).toBeNull();
    expect(screen.queryAllByText(NEXT_BADGE)).toHaveLength(0);

    // Klik linku wraca do bieżącego tygodnia: link znika, badge wraca.
    fireEvent.click(screen.getByText(BACK_COPY));
    expectNoBackLink();
    expect(screen.getAllByText(NEXT_BADGE)).toHaveLength(1);
  });

  it('Edge 3: bieżący tydzień w całości ukończony — NASTĘPNY w kolejnym tygodniu i tylko tam', () => {
    renderPlan('plan-midweek-done-wpc');

    // Bieżący tydzień (2): wszystko zrobione, zero badge.
    expect(screen.queryAllByText(NEXT_BADGE)).toHaveLength(0);

    // Tydzień 3: dokładnie jeden badge (pierwszy dzień tygodnia 3).
    goNextWeek();
    expect(screen.getAllByText(NEXT_BADGE)).toHaveLength(1);

    // Tydzień 4: zero badge (next został w tygodniu 3).
    goNextWeek();
    expect(screen.queryAllByText(NEXT_BADGE)).toHaveLength(0);
  });

  it('Edge 4: nagłówek dzisiejszego dnia wyróżniony (Dziś + text-primary), pozostałe dni bez wyróżnienia', () => {
    renderPlan('active-plan');

    // active-plan: day-a wypada dziś (środa 2026-08-19), day-b za 2 dni (piątek).
    const todayHeader = screen.getByTestId('plan-day-header-2026-08-19');
    expect(todayHeader.textContent).toContain('Dziś');
    expect(todayHeader.className).toContain('text-primary');

    const otherHeader = screen.getByTestId('plan-day-header-2026-08-21');
    expect(otherHeader.textContent).not.toContain('Dziś');
    expect(otherHeader.className).not.toContain('text-primary');
  });
});
