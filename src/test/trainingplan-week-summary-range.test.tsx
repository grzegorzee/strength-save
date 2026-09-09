import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  fetchWeek: vi.fn(),
  activities: [] as import('@/types/strava').UnifiedActivity[],
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
  return { useActivities: () => ({ ...helpers.buildUseActivitiesResult(), activities: pager.activities }) };
});
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
  toast: vi.fn(),
}));

vi.mock('@/lib/activity-read-store', () => ({ fetchWeekActivityHistory: pager.fetchWeek }));

import TrainingPlan from '@/pages/TrainingPlan';


const renderPlan = () => render(<MemoryRouter><LanguageProvider><UnitProvider><TrainingPlan /></UnitProvider></LanguageProvider></MemoryRouter>);
const completed = (date: string, id: string) => ({
  id, userId: 'canonical-user-1', dayId: 'old-day', date, completed: true,
  exercises: [{ exerciseId: 'squat', sets: [{ weight: 80, reps: 5, completed: true }] }],
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 19, 12));
  pager.state = buildCanonicalState('active-plan');
  pager.state.workouts = Array.from({ length: 120 }, (_, i) => completed('2026-08-19', `recent-${i}`));
  pager.activities = Array.from({ length: 500 }, (_, i) => ({
    id: `recent-cardio-${i}`, userId: 'canonical-user-1', type: 'Swim', source: 'manual',
    date: '2026-08-19', name: 'Swim', movingTime: 60,
  } as import('@/types/strava').UnifiedActivity));
  pager.fetchWeek.mockReset().mockImplementation(async (_uid: string, options: { fromDate: string }) => ({
    workouts: [completed(options.fromDate, 'outside-recent-window')],
    activities: [{ id: 'outside-cardio-window', userId: 'canonical-user-1', type: 'Swim', source: 'manual', movingTime: 2400 }],
  }));
});
afterEach(() => vi.useRealTimers());

it('reads the selected historical week outside 120/500 listener windows and preserves separate strength/cardio counts', async () => {
  renderPlan();
  // Five weeks back, before this plan and outside the supplied recent windows.
  for (let i = 0; i < 5; i += 1) fireEvent.click(screen.getByLabelText('Poprzedni tydzień'));
  await waitFor(() => expect(screen.getByTestId('plan-activity-summary')).toHaveTextContent('Aktywności: 2'));
  expect(screen.getByTestId('plan-activity-summary')).toHaveTextContent('Siłowe: 1');
  expect(screen.getByTestId('plan-activity-summary')).toHaveTextContent('Cardio: 1 · 40 min');
  expect(pager.fetchWeek).toHaveBeenLastCalledWith('canonical-user-1', expect.objectContaining({
    fromDate: '2026-07-13', toDate: '2026-07-19', includeStrava: false,
  }));
});

it('never claims zero while loading or after an incomplete read; retry recovers', async () => {
  let reject!: (error: Error) => void;
  pager.fetchWeek.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  renderPlan();
  expect(screen.getByTestId('plan-activity-summary')).not.toHaveTextContent(/Aktywności: \d/);
  await act(async () => { reject(new Error('offline')); });
  expect(screen.getByTestId('plan-activity-summary')).not.toHaveTextContent(/Aktywności: \d/);
  fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
  await waitFor(() => expect(screen.getByTestId('plan-activity-summary')).toHaveTextContent('Aktywności: 2'));
});
