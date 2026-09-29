import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import {
  buildCanonicalState,
  buildUseTrainingPlanResult,
  type CanonicalState,
} from '@/test/canonical-states';
import { addCalendarDays, parseLocalDate } from '@/lib/utils';

// F2 (2026-09-29): urlop 22-27.09 u właściciela, a Dashboard pokazywał hero
// "Rozpocznij trening" w dniach urlopu (todayTraining i getNextScheduledTraining
// ignorowały vacation; urlop był tylko badge'em przykrywanym przez lapse).
// Niezmiennik: dzień w [vacation.startDate, vacation.endDate] nie jest dniem
// treningowym na hero, w "następnej sesji" ani w karcie tygodnia.

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocFromServer: vi.fn(),
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

const fixture = vi.hoisted(() => ({ state: null as unknown }));
const currentState = () => fixture.state as CanonicalState;

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Grzegorz' }, isAdmin: false, canUseStrava: false }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: currentState().workouts,
    getLatestMeasurement: () => null,
    isLoaded: true,
    error: null,
    backfillHistoricalWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => buildUseTrainingPlanResult(currentState()),
}));
vi.mock('@/hooks/useActivities', () => ({
  useActivities: () => ({
    activities: [],
    stravaActivities: [],
    connection: { connected: false },
    addActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
  }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({
    cycles: currentState().cycles,
    isLoaded: true,
    hasServerSnapshot: true,
    archiveCurrentPlan: vi.fn(),
    createActiveCycle: vi.fn(),
  }),
}));
vi.mock('@/hooks/useWatchPlanPreview', () => ({ useWatchPlanPreview: () => {} }));
vi.mock('@/hooks/useWorkoutAggregate', () => ({ useWorkoutAggregate: () => null }));
vi.mock('@/components/ProUpsellBanner', () => ({ ProUpsellBanner: () => null }));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => null), listDrafts: vi.fn(async () => []), loadDraftForDay: vi.fn(async () => null) },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0, list: () => [] },
}));
vi.mock('@/hooks/useToday', () => ({
  useToday: () => parseLocalDate(currentState().todayISO),
}));

import Dashboard from '@/pages/Dashboard';

// Czwartek w środku urlopu właściciela: stan kanoniczny daje urlop 22-27.09.
const TODAY = '2026-09-24';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <Dashboard />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  navigateSpy.mockClear();
});

describe('Dashboard w trakcie urlopu (F2)', () => {
  it('stan kanoniczny odwzorowuje urlop właściciela 22-27.09', () => {
    const state = buildCanonicalState('vacation-active', TODAY);
    expect(state.plan?.vacation).toEqual({ startDate: '2026-09-22', endDate: '2026-09-27', activity: 'none', extendedWeeks: 1 });
  });

  it('hero = karta przerwy "Przerwa do 27 września", bez CTA treningu', async () => {
    fixture.state = buildCanonicalState('vacation-active', TODAY);
    renderDashboard();

    const card = await screen.findByTestId('break-hero');
    expect(card.textContent).toContain('Przerwa do 27 września');
    expect(screen.queryByTestId('dashboard-primary-action')).toBeNull();
    expect(screen.queryByText('Rozpocznij trening')).toBeNull();
  });

  it('"następny trening" = pierwszy dzień planu PO końcu urlopu (czw 1.10), nie sobota 26.09 w urlopie', async () => {
    fixture.state = buildCanonicalState('vacation-active', TODAY);
    renderDashboard();

    const card = await screen.findByTestId('break-hero');
    expect(within(card).getByTestId('break-next').textContent).toContain('czwartek, 1 października');
    expect(card.textContent).not.toContain('26 września');
  });

  it('karta przerwy ma wyjście: otwiera dialog urlopu (zmiana / anulowanie)', async () => {
    fixture.state = buildCanonicalState('vacation-active', TODAY);
    renderDashboard();

    fireEvent.click(await screen.findByTestId('break-manage'));
    await waitFor(() => expect(screen.getByText('Anuluj urlop', { selector: 'button' })).toBeTruthy());
  });

  it('karta tygodnia: dni planu w urlopie są wolne i nie liczą się do sesji', async () => {
    fixture.state = buildCanonicalState('vacation-active', TODAY);
    renderDashboard();

    const week = await screen.findByTestId('week-card');
    // Dziś (czw) i sobota to dni planu, ale w urlopie: status "wolne".
    expect(within(week).getByTestId(`week-day-${TODAY}`).getAttribute('aria-label')).toContain('wolne');
    expect(within(week).getByTestId(`week-day-${addCalendarDays(TODAY, 2)}`).getAttribute('aria-label')).toContain('wolne');
    expect(week.textContent).not.toContain('0 z 2 sesji');
  });

  it('dzień po urlopie: hero treningu wraca (niezmiennik: urlop jedynym powodem przerwy)', async () => {
    // vacation-just-ended: urlop skończył się wczoraj, dziś dzień planu.
    fixture.state = buildCanonicalState('vacation-just-ended', '2026-09-28');
    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('dashboard-primary-action').textContent).toContain('Rozpocznij trening'));
    expect(screen.queryByTestId('break-hero')).toBeNull();
  });

  it("urlop 'Tylko główne boje' (mains_only): dzień planu zostaje treningiem, bez karty przerwy", async () => {
    const state = buildCanonicalState('vacation-active', TODAY);
    state.plan = { ...state.plan!, vacation: { ...state.plan!.vacation!, activity: 'mains_only' } };
    fixture.state = state;
    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('dashboard-primary-action').textContent).toContain('Rozpocznij trening'));
    expect(screen.queryByTestId('break-hero')).toBeNull();
    const week = screen.getByTestId('week-card');
    expect(within(week).getByTestId(`week-day-${TODAY}`).getAttribute('aria-label')).toContain('zaplanowane');
  });

  it('aktywny plan bez urlopu: hero treningu bez zmian (niezmiennik)', async () => {
    fixture.state = buildCanonicalState('empty-history', TODAY);
    renderDashboard();

    await waitFor(() => expect(screen.getByTestId('dashboard-primary-action').textContent).toContain('Rozpocznij trening'));
    expect(screen.queryByTestId('break-hero')).toBeNull();
  });
});
