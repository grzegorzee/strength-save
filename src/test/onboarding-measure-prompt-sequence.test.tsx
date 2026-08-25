// WP-G (X35a) p.4: test SEKWENCJI (zasada 5 CLAUDE.md) popupu "Zrób pomiary":
// Onboarding krok 1 -> 6/6 -> "Zacznij..." BEZ podglądu -> redirect /?welcome=1
// -> Dashboard bez pomiarów -> ConfirmDialog dash.measurePrompt -> Potwierdź
// -> /measurements. Prawdziwy router (Routes + useNavigate), mocki = unia
// onboarding-skip-preview.test.tsx i dashboard-welcome-measurements.test.tsx.
// Niezmienniki: "Nie teraz" zamyka bez nawigacji; user z pomiarem nie widzi popupu.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { PlanWizardChoice } from '@/components/PlanWizard';
import type { PlanCycleChoice } from '@/types/cycles';

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/components/PlanPreview', () => ({ PlanPreview: () => <div data-testid="plan-preview" /> }));
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
}));
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1',
    profile: { displayName: 'Grzegorz', photoURL: '', consents: { marketingGranted: false, marketingVersion: '1.0' } },
    isAdmin: false,
    canUseStrava: false,
  }),
}));
const measurementFixture = vi.hoisted(() => ({ latest: null as unknown }));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: [],
    getTotalWeight: () => 0,
    getCompletedWorkoutsCount: () => 0,
    getLatestMeasurement: () => measurementFixture.latest,
    isLoaded: true,
    error: null,
    backfillHistoricalWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    plan: [],
    isLoaded: true,
    isCustom: true,
    planDurationWeeks: 12,
    planStartDate: null,
    progression: null,
    skippedDates: [],
    setDaySkipped: vi.fn(async () => ({ success: true })),
    skipPastDates: vi.fn(async () => ({ success: true })),
    reducedMode: null,
    setReducedMode: vi.fn(async () => ({ success: true })),
    vacation: null,
    setVacation: vi.fn(async () => ({ success: true })),
    currentWeek: 0,
    isPlanExpired: false,
    weeksRemaining: 12,
    planStarted: false,
    planError: false,
    savePlan: vi.fn(async () => ({ success: true })),
    saveDeloadDecision: vi.fn(),
    swapExercise: vi.fn(),
    updateExerciseSets: vi.fn(),
    removeExercise: vi.fn(),
    addExercise: vi.fn(),
    moveExercise: vi.fn(),
    resetToDefault: vi.fn(),
  }),
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
    cycles: [],
    isLoaded: true,
    archiveCurrentPlan: vi.fn(),
    createActiveCycle: vi.fn(async () => 'cycle-1'),
  }),
}));
vi.mock('@/hooks/useWatchPlanPreview', () => ({ useWatchPlanPreview: () => {} }));
vi.mock('@/components/ProUpsellBanner', () => ({ ProUpsellBanner: () => null }));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { loadActiveDraft: vi.fn(async () => null), loadDraftForDay: vi.fn(async () => null) },
}));
vi.mock('@/lib/workout-sync-queue', () => ({ workoutSyncQueue: { pendingCount: () => 0 } }));
vi.mock('@/hooks/useSubscription', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useSubscription')>();
  return { ...actual, useRequiresPaywall: () => false };
});
vi.mock('@/lib/consents-api', () => ({ recordConsents: vi.fn(async () => {}) }));
type Deps = { choice?: PlanCycleChoice; markOnboardingComplete: (c: PlanWizardChoice, d: PlanWizardChoice['days'], s: string) => Promise<void> };
const completeOnboardingPlan = vi.hoisted(() => vi.fn(async (choice: PlanWizardChoice, deps: Deps) => {
  await deps.markOnboardingComplete(choice, choice.days, '2026-08-31');
  return { success: true };
}));
vi.mock('@/lib/cycle-actions', () => ({ completeOnboardingPlan }));

import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import { buildCanonicalState } from '@/test/canonical-states';

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <LanguageProvider>
        <UnitProvider>
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/measurements" element={<div data-testid="measurements-page" />} />
          </Routes>
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

// Krok 1 (zgody) -> 2 -> 3 -> 4 -> 5A -> 6/6 -> "Zacznij..." (bez podglądu).
const finishOnboardingWithoutPreview = async () => {
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('consent-health'));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  await screen.findByRole('button', { name: /Następny krok/ });
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(await screen.findByTestId('ob-match-next'));
  await screen.findByTestId('ob-start-cta');
  fireEvent.click(screen.getByTestId('ob-start-cta'));
  await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  measurementFixture.latest = null;
});

describe('SEKWENCJA: onboarding -> /?welcome=1 -> popup pomiarów -> /measurements (WP-G p.4)', () => {
  it('"Zacznij..." bez podglądu -> Dashboard z popupem -> "Tak, dodaj pomiary" -> strona Pomiarów', async () => {
    renderApp();
    await finishOnboardingWithoutPreview();

    // Redirect na Dashboard (bez podglądu planu) i popup pomiarów.
    expect(screen.queryByTestId('plan-preview')).toBeNull();
    await screen.findByTestId('dash-greeting');
    expect(await screen.findByText('Dodać pomiary ciała?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tak, dodaj pomiary' }));
    await screen.findByTestId('measurements-page');
    expect(screen.queryByTestId('dash-greeting')).toBeNull();
  });

  it('"Nie teraz" zamyka popup, user zostaje na Dashboardzie', async () => {
    renderApp();
    await finishOnboardingWithoutPreview();
    expect(await screen.findByText('Dodać pomiary ciała?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nie teraz' }));
    await waitFor(() => expect(screen.queryByText('Dodać pomiary ciała?')).toBeNull());
    expect(screen.getByTestId('dash-greeting')).toBeInTheDocument();
    expect(screen.queryByTestId('measurements-page')).toBeNull();
  });

  it('NIEZMIENNIK: user z pomiarem (kanoniczny kształt) po onboardingu NIE widzi popupu', async () => {
    const numeric = buildCanonicalState('active-plan').measurements.find((m) => m.weight != null);
    expect(numeric).toBeTruthy();
    measurementFixture.latest = numeric;
    renderApp();
    await finishOnboardingWithoutPreview();

    await screen.findByTestId('dash-greeting');
    expect(screen.queryByText('Dodać pomiary ciała?')).toBeNull();
  });
});
