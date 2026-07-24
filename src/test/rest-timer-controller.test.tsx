import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { useRestTimerController } from '@/hooks/useRestTimerController';
import { ExerciseCard } from '@/components/ExerciseCard';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';

// Z143 (X18B): jeden timer przerwy na sesję — właścicielem stanu jest rodzic
// (WorkoutDay), karta tylko zgłasza start i renderuje pasek, gdy przerwa jest jej.

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'test-uid' }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/timer-sound', () => ({
  playTimerSound: vi.fn(),
  unlockTimerSound: vi.fn(),
  previewRestSound: vi.fn(),
}));
vi.mock('@/lib/haptics', () => ({
  hapticImpactLight: vi.fn(),
  hapticRestEnd: vi.fn(),
  exerciseCompleteHaptic: vi.fn(),
}));
// Flaga timerów ON w testach (na webie domyślnie OFF do czasu testu na iPhone).
vi.mock('@/lib/feature-flags', () => ({ FEATURE_FLAGS: { workoutTimers: true } }));

// Mock natywnych notyfikacji z KSIĘGOWANIEM stanu: schedule wpisuje, cancel czyści.
// Po sekwencji zdarzeń liczba wpisów = liczba realnie zaplanowanych sygnałów.
const pendingNotifications = new Map<number, { body: string; at: Date }>();
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn(async () => ({ display: 'granted' })),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    schedule: vi.fn(async ({ notifications }: { notifications: Array<{ id: number; body: string; schedule: { at: Date } }> }) => {
      notifications.forEach((n) => pendingNotifications.set(n.id, { body: n.body, at: n.schedule.at }));
    }),
    cancel: vi.fn(async ({ notifications }: { notifications: Array<{ id: number }> }) => {
      notifications.forEach((n) => pendingNotifications.delete(n.id));
    }),
  },
}));

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
  pendingNotifications.clear();
});

const flushNotificationChain = async () => {
  // operationChain w rest-notification serializuje async operacje — dwa ticki wystarczą.
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('useRestTimerController (Z143)', () => {
  it('start przerwy dla A → stan wskazuje A', () => {
    const { result } = renderHook(() => useRestTimerController());
    act(() => result.current.startRest('ex-a', 90));
    expect(result.current.restState).toEqual({ exerciseId: 'ex-a', seconds: 90, runId: 1 });
  });

  it('start dla B przy biegnącej przerwie A → stan wskazuje B, runId rośnie', () => {
    const { result } = renderHook(() => useRestTimerController());
    act(() => result.current.startRest('ex-a', 90));
    act(() => result.current.startRest('ex-b', 150));
    expect(result.current.restState).toEqual({ exerciseId: 'ex-b', seconds: 150, runId: 2 });
  });

  it('stop (Pomiń / koniec w foregroundzie) → stan null; kolejny start ma NOWY runId', () => {
    const { result } = renderHook(() => useRestTimerController());
    act(() => result.current.startRest('ex-a', 90));
    act(() => result.current.stopRest());
    expect(result.current.restState).toBeNull();
    act(() => result.current.startRest('ex-a', 90));
    expect(result.current.restState?.runId).toBe(2);
  });
});

// ── Harness: dwie karty + wspólny właściciel stanu (jak WorkoutDay po Z143) ──

const exerciseA: Exercise = { id: 'ex-a', name: 'Przysiad ze sztangą (High Bar)', sets: '3 x 5', instructions: [] };
const exerciseB: Exercise = { id: 'ex-b', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 5', instructions: [] };

const twoSets = (): SetData[] => [
  { reps: 5, weight: 100, completed: false },
  { reps: 5, weight: 100, completed: false },
];

const TwoCardsHarness = () => {
  const { restState, startRest, stopRest } = useRestTimerController();
  const cardProps = (exercise: Exercise) => ({
    exercise,
    index: 1,
    savedSets: twoSets(),
    isEditable: true,
    restRun: restState && restState.exerciseId === exercise.id ? restState : null,
    onRestStart: startRest,
    onRestStop: stopRest,
  });
  return (
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <div data-testid="card-a"><ExerciseCard {...cardProps(exerciseA)} /></div>
          <div data-testid="card-b"><ExerciseCard {...cardProps(exerciseB)} /></div>
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

const checkFirstOpenSet = (container: HTMLElement) => {
  // sanitizeSets dokłada wiersz rozgrzewki: [0]=W (nie startuje przerwy), [1]=Set 1.
  fireEvent.click(within(container).getAllByRole('button', { name: 'Zaznacz serię jako zrobioną' })[1]);
};

describe('jeden RestBar na sesję (Z143)', () => {
  it('seria w A, potem seria w B przy biegnącej przerwie A → dokładnie jeden RestBar (w B) i jedna notyfikacja z czasem B', async () => {
    const view = render(<TwoCardsHarness />);
    const cardA = view.getByTestId('card-a');
    const cardB = view.getByTestId('card-b');

    checkFirstOpenSet(cardA);
    await flushNotificationChain();
    expect(view.getAllByTestId('rest-bar')).toHaveLength(1);
    expect(within(cardA).getAllByTestId('rest-bar')).toHaveLength(1);
    expect(pendingNotifications.size).toBe(1);

    checkFirstOpenSet(cardB);
    await flushNotificationChain();

    // Dokładnie JEDEN pasek w drzewie — w karcie B; pasek A zniknął.
    expect(view.getAllByTestId('rest-bar')).toHaveLength(1);
    expect(within(cardB).getAllByTestId('rest-bar')).toHaveLength(1);
    expect(within(cardA).queryByTestId('rest-bar')).toBeNull();

    // Dokładnie JEDNA zaplanowana notyfikacja — dla ćwiczenia B.
    expect(pendingNotifications.size).toBe(1);
    const [pending] = Array.from(pendingNotifications.values());
    expect(pending.body).toContain('Wyciskanie sztangi');
  });

  it('niezmienniki starych przepływów: odhaczenie startuje timer, ±15 przeplanowuje, Pomiń anuluje', async () => {
    const view = render(<TwoCardsHarness />);
    const cardA = view.getByTestId('card-a');

    // Odhaczenie serii → timer startuje jak dotąd.
    checkFirstOpenSet(cardA);
    await flushNotificationChain();
    const bar = within(cardA).getByTestId('rest-bar');
    expect(bar).toBeTruthy();
    expect(pendingNotifications.size).toBe(1);
    const before = Array.from(pendingNotifications.values())[0].at.getTime();

    // +15 przeplanowuje notyfikację na późniejszy moment.
    fireEvent.click(within(cardA).getByRole('button', { name: '+15' }));
    await flushNotificationChain();
    expect(pendingNotifications.size).toBe(1);
    const after = Array.from(pendingNotifications.values())[0].at.getTime();
    expect(after).toBeGreaterThan(before);

    // Pomiń → pasek znika, zero zaplanowanych notyfikacji.
    fireEvent.click(within(cardA).getByRole('button', { name: 'Pomiń' }));
    await flushNotificationChain();
    expect(view.queryByTestId('rest-bar')).toBeNull();
    expect(pendingNotifications.size).toBe(0);
  });
});
