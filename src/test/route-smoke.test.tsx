import { Suspense } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  CANONICAL_STATE_IDS,
  buildCanonicalState,
  type CanonicalState,
  type CanonicalStateId,
} from '@/test/canonical-states';

// WP-G Task G2 (zasada 11 CLAUDE.md): route render sweep. Kazda trasa musi sie
// wyrenderowac bez ErrorBoundary na KAZDYM kanonicznym stanie danych (m.in.
// aktywny cykl z endDate '' — klasa E-8UE4S). Nowa trasa lub nowy stan danych
// = dopisz do tabel ponizej.
//
// Scaffolding mocków wg wzorca workout-history-redesign / dashboard-order /
// profile-sections; zwrotki hooków buduje wspolny modul canonical-states.

const smoke = vi.hoisted(() => ({
  state: undefined as unknown as CanonicalState,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  getDocFromServer: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  deleteField: vi.fn(() => '__DELETE_FIELD__'),
  onSnapshot: vi.fn(() => () => {}),
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(async () => ({ empty: true, docs: [], forEach: () => {} })),
  getDocsFromServer: vi.fn(async () => ({ empty: true, docs: [], forEach: () => {} })),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn(async () => {}) })),
  increment: vi.fn(),
  serverTimestamp: vi.fn(() => 0),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }), now: () => ({ toMillis: () => Date.now() }) },
  addDoc: vi.fn(async () => ({})),
}));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(async () => ({})),
  getDownloadURL: vi.fn(async () => 'https://example.invalid/photo.jpg'),
  deleteObject: vi.fn(async () => {}),
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => async () => ({ data: {} })),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/lib/error-telemetry', () => ({
  reportClientError: vi.fn(async () => {}),
  __resetErrorTelemetryForTests: vi.fn(),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/push-notifications', () => ({
  getPushPermission: vi.fn(async () => 'granted'),
  requestPushPermission: vi.fn(async () => 'granted'),
  // X35b: NotificationSettings w Profilu czyta result.status po rejestracji.
  registerPushForUser: vi.fn(async () => ({ status: 'registered' })),
  unregisterPushForUser: vi.fn(async () => {}),
  listenForegroundPush: vi.fn(() => () => {}),
  listenPushTokenRefresh: vi.fn(() => () => {}),
}));
// X35b: GarminSettings w Profilu — callable'e urzadzen bez sieci.
vi.mock('@/lib/garmin-api', () => ({
  listLinkedDevices: vi.fn(async () => []),
  unlinkLinkedDevice: vi.fn(async () => ({ revoked: true })),
  reportAppleWatchStatus: vi.fn(async () => ({ linked: false })),
  startGarminPairing: vi.fn(async () => ({ code: '000000', expiresAt: 0 })),
}));
vi.mock('@/lib/workout-read-store', () => ({
  fetchWorkoutRange: vi.fn(async () => []),
}));
vi.mock('@/lib/workout-delete', () => ({
  deleteWorkoutEverywhere: vi.fn(async () => ({ success: true })),
}));
vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: {
    loadActiveDraft: vi.fn(async () => smoke.state.draft),
    listDrafts: vi.fn(async () => (smoke.state.draft ? [smoke.state.draft] : [])),
    // Bug 4 (X30): wybór draftu per strona (dayId+date) — mock odwzorowuje filtr.
    loadDraftForDay: vi.fn(async (_uid: string, dayId: string, date: string) => (
      smoke.state.draft && smoke.state.draft.dayId === dayId && smoke.state.draft.date === date
        ? smoke.state.draft
        : null
    )),
  },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: () => 0, list: () => [] },
}));
vi.mock('@/contexts/UserContext', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useCurrentUser: () => helpers.buildUseCurrentUserResult(smoke.state) };
});
vi.mock('@/hooks/useTrainingPlan', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useTrainingPlan: () => helpers.buildUseTrainingPlanResult(smoke.state) };
});
vi.mock('@/hooks/useFirebaseWorkouts', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useFirebaseWorkouts: () => helpers.buildUseFirebaseWorkoutsResult(smoke.state) };
});
vi.mock('@/hooks/usePlanCycles', async () => {
  const helpers = await import('@/test/canonical-states');
  return { usePlanCycles: () => helpers.buildUsePlanCyclesResult(smoke.state) };
});
vi.mock('@/hooks/useActivities', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useActivities: () => helpers.buildUseActivitiesResult() };
});
vi.mock('@/hooks/useWorkoutHistoryPage', async () => {
  const helpers = await import('@/test/canonical-states');
  return {
    useWorkoutHistoryPage: () => helpers.buildUseWorkoutHistoryPageResult(smoke.state),
    useWorkoutRange: () => helpers.buildUseWorkoutRangeResult(smoke.state),
  };
});
vi.mock('@/hooks/useSubscription', async () => {
  const helpers = await import('@/test/canonical-states');
  return {
    useSubscription: () => helpers.buildUseSubscriptionResult(),
    useRequiresPaywall: () => false,
    isPaywallPlatform: () => false,
  };
});
vi.mock('@/hooks/useAuth', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useAuth: () => helpers.buildUseAuthResult(smoke.state) };
});
vi.mock('@/hooks/useCustomExercises', async () => {
  const helpers = await import('@/test/canonical-states');
  return { useCustomExercises: () => helpers.buildUseCustomExercisesResult() };
});
vi.mock('@/hooks/useWorkoutAggregate', () => ({ useWorkoutAggregate: () => null }));
vi.mock('@/hooks/useWatchPlanPreview', () => ({ useWatchPlanPreview: () => {} }));
vi.mock('@/hooks/useToday', () => ({
  useToday: () => {
    const [y, m, d] = smoke.state.todayISO.split('-').map(Number);
    return new Date(y, m - 1, d);
  },
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
  toast: vi.fn(),
}));
// Lazy + recharts/canvas w jsdom: wykres pomiarow jak w measurements-photo-only.
vi.mock('@/components/MeasurementTrendChart', () => ({ default: () => null }));

import Dashboard from '@/pages/Dashboard';
import TrainingPlanPage from '@/pages/TrainingPlan';
import WorkoutHistory from '@/pages/WorkoutHistory';
import Achievements from '@/pages/Achievements';
import ExerciseLibrary from '@/pages/ExerciseLibrary';
import Measurements from '@/pages/Measurements';
import Cycles from '@/pages/Cycles';
import Profile from '@/pages/Profile';

const TODAY_ISO = '2026-08-20';

interface SmokeRoute {
  name: string;
  entry: string;
  pattern: string;
  Component: () => JSX.Element;
}

// Trasy z AuthenticatedApp (bez focused-flow /workout/* i /exercise/:slug —
// WorkoutDay ciagnie timery/draft-sync poza tanim scaffoldingiem; odnotowane
// w raporcie WP-G). /exercises dodatkowo w widoku grupy (?group=, WP-E).
const ROUTES: SmokeRoute[] = [
  { name: '/', entry: '/', pattern: '/', Component: Dashboard as () => JSX.Element },
  { name: '/plan', entry: '/plan', pattern: '/plan', Component: TrainingPlanPage as () => JSX.Element },
  { name: '/history', entry: '/history', pattern: '/history', Component: WorkoutHistory as () => JSX.Element },
  // WP-H (X28): pełna płaska lista Historii jako osobna powierzchnia.
  { name: '/history?list=all', entry: '/history?list=all', pattern: '/history', Component: WorkoutHistory as () => JSX.Element },
  // X36: /achievements = Analityka (domyślna), rekordy pod ?view=records.
  { name: '/achievements', entry: '/achievements', pattern: '/achievements', Component: Achievements as () => JSX.Element },
  { name: '/achievements?view=records', entry: '/achievements?view=records', pattern: '/achievements', Component: Achievements as () => JSX.Element },
  { name: '/exercises', entry: '/exercises', pattern: '/exercises', Component: ExerciseLibrary as () => JSX.Element },
  { name: '/exercises?group=chest', entry: '/exercises?group=chest', pattern: '/exercises', Component: ExerciseLibrary as () => JSX.Element },
  { name: '/measurements', entry: '/measurements', pattern: '/measurements', Component: Measurements as () => JSX.Element },
  { name: '/cycles', entry: '/cycles', pattern: '/cycles', Component: Cycles as () => JSX.Element },
  { name: '/profile', entry: '/profile', pattern: '/profile', Component: Profile as () => JSX.Element },
];

// Znane, niekrasowe logi dev-mode (filtr JAWNY — nie wycinamy wszystkiego).
const IGNORED_CONSOLE_ERRORS = [
  /^Warning: /, // React dev warnings (act, keys, deprecations)
  /not wrapped in act/,
  /React Router Future Flag/,
];

let consoleErrors: string[] = [];
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.localStorage.setItem('app-language', 'pl');
  consoleErrors = [];
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(' '));
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

const renderRoute = (route: SmokeRoute) => render(
  <MemoryRouter initialEntries={[route.entry]}>
    <LanguageProvider>
      <UnitProvider>
        <ErrorBoundary
          fallback={(_reset, error, code) => (
            <div data-testid="route-crash">{`${code}: ${error?.message ?? 'unknown'}`}</div>
          )}
        >
          <Suspense fallback={<div data-testid="route-smoke-suspense" />}>
            <Routes>
              <Route path={route.pattern} element={<route.Component />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

describe.each(ROUTES)('route sweep: $name', (route) => {
  it.each(CANONICAL_STATE_IDS)('renderuje sie bez ErrorBoundary na stanie %s', async (stateId: CanonicalStateId) => {
    smoke.state = buildCanonicalState(stateId, TODAY_ISO);

    renderRoute(route);

    // Lazy chunki (Suspense) musza sie domontowac zanim ocenimy crash.
    await waitFor(() => {
      expect(screen.queryByTestId('route-smoke-suspense')).toBeNull();
    }, { timeout: 5000 });

    const crash = screen.queryByTestId('route-crash');
    expect(crash?.textContent ?? null).toBeNull();

    const unexpected = consoleErrors.filter(
      (entry) => !IGNORED_CONSOLE_ERRORS.some((pattern) => pattern.test(entry)),
    );
    expect(unexpected, unexpected.join('\n')).toEqual([]);
  });
});
