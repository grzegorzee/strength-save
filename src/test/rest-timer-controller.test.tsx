import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { act, renderHook } from '@testing-library/react';
import { fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { useRestTimerController } from '@/hooks/useRestTimerController';
import { hasRemainingWork, shouldStartRest } from '@/lib/workout-session-state';
import { cancelRestEndNotification } from '@/lib/rest-notification';
import { ExerciseCard } from '@/components/ExerciseCard';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';

// Z143 (X18B): jeden timer przerwy na sesję — właścicielem stanu jest rodzic
// (WorkoutDay), karta tylko zgłasza start i renderuje pasek, gdy przerwa jest jej.

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'test-uid' }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
// ExerciseCard -> error-telemetry -> firebase: bez mocka realny init Firebase
// wywala caly plik na CI (runner nie ma .env, auth/invalid-api-key).
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
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
    expect(result.current.restState).toMatchObject({ exerciseId: 'ex-a', totalSeconds: 90, runId: 1 });
  });

  it('start dla B przy biegnącej przerwie A → stan wskazuje B, runId rośnie', () => {
    const { result } = renderHook(() => useRestTimerController());
    act(() => result.current.startRest('ex-a', 90));
    act(() => result.current.startRest('ex-b', 150));
    expect(result.current.restState).toMatchObject({ exerciseId: 'ex-b', totalSeconds: 150, runId: 2 });
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

// ── Z188: deadline u właściciela + persystencja przez kill ──

describe('useRestTimerController — deadline i persystencja (Z188)', () => {
  const KEY = 'fittracker_rest_state_v1';

  beforeEach(() => {
    localStorage.removeItem(KEY);
  });

  it('startRest ustawia deadlineAt ≈ now + seconds i zapisuje stan w localStorage', () => {
    const { result } = renderHook(() => useRestTimerController());
    const before = Date.now();
    act(() => result.current.startRest('ex-a', 90));

    const state = result.current.restState;
    expect(state?.deadlineAt).toBeGreaterThanOrEqual(before + 90_000);
    expect(state?.deadlineAt).toBeLessThanOrEqual(Date.now() + 90_000);
    expect(state?.totalSeconds).toBe(90);

    const persisted = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    expect(persisted).toEqual({
      exerciseId: 'ex-a',
      deadlineAt: state?.deadlineAt,
      totalSeconds: 90,
    });
  });

  it('adjustRest przesuwa deadline i totalSeconds, persystuje; skrócenie nie schodzi poniżej teraz', () => {
    const { result } = renderHook(() => useRestTimerController());
    act(() => result.current.startRest('ex-a', 90));
    const deadlineBefore = result.current.restState!.deadlineAt;

    act(() => result.current.adjustRest(15));
    expect(result.current.restState?.deadlineAt).toBe(deadlineBefore + 15_000);
    expect(result.current.restState?.totalSeconds).toBe(105);
    const persisted = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    expect(persisted?.deadlineAt).toBe(deadlineBefore + 15_000);

    // Skrócenie o więcej niż zostało: deadline ląduje na "teraz", nie w przeszłości.
    act(() => result.current.adjustRest(-3600));
    expect(result.current.restState?.deadlineAt).toBeGreaterThanOrEqual(Date.now() - 1000);
    expect(result.current.restState?.deadlineAt).toBeLessThanOrEqual(Date.now() + 100);
  });

  it('stopRest czyści wpis w localStorage', () => {
    const { result } = renderHook(() => useRestTimerController());
    act(() => result.current.startRest('ex-a', 90));
    expect(localStorage.getItem(KEY)).not.toBeNull();
    act(() => result.current.stopRest());
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('resumeFromStorage z deadlinem w przyszłości odtwarza przerwę (runId rośnie)', () => {
    localStorage.setItem(KEY, JSON.stringify({
      exerciseId: 'ex-a',
      deadlineAt: Date.now() + 42_000,
      totalSeconds: 90,
    }));
    const { result } = renderHook(() => useRestTimerController());
    act(() => result.current.resumeFromStorage());

    expect(result.current.restState).toMatchObject({ exerciseId: 'ex-a', totalSeconds: 90 });
    expect(result.current.restState!.runId).toBeGreaterThan(0);
    expect(result.current.restState!.deadlineAt).toBeGreaterThan(Date.now());
  });

  it('resumeFromStorage z deadlinem w przeszłości czyści wpis i anuluje notyfikację', async () => {
    localStorage.setItem(KEY, JSON.stringify({
      exerciseId: 'ex-a',
      deadlineAt: Date.now() - 5_000,
      totalSeconds: 90,
    }));
    const { result } = renderHook(() => useRestTimerController());
    act(() => result.current.resumeFromStorage());
    await flushNotificationChain();

    expect(result.current.restState).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('resumeFromStorage odrzuca wpis bez exerciseId (walidacja kształtu)', () => {
    localStorage.setItem(KEY, JSON.stringify({ deadlineAt: Date.now() + 42_000, totalSeconds: 90 }));
    const { result } = renderHook(() => useRestTimerController());
    act(() => result.current.resumeFromStorage());

    expect(result.current.restState).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('Z189: watchdog gasi wiszący stan po >3 s od deadline (RestBar odmontowany przez błąd)', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useRestTimerController());
      act(() => result.current.startRest('ex-a', 2));
      expect(result.current.restState).not.toBeNull();

      // 2 s przerwy + 3 s tolerancji + zapas na ticki watchdoga (1000 ms).
      act(() => { vi.advanceTimersByTime(2_000 + 3_000 + 2_000); });

      expect(result.current.restState).toBeNull();
      expect(localStorage.getItem(KEY)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── Z190: bramka sekwencji timera — rozgrzewka → robocza → przejęcie → koniec ──

describe('Z190: sekwencja timera w jednym przebiegu', () => {
  // A: rozgrzewka + 2 robocze; B: jedna robocza. Sekwencja domyka trening
  // ostatnią serią w A (krok 4), a B przejmuje przerwę w kroku 3.
  const warmupPlusTwo: SetData[] = [
    { reps: 10, weight: 20, completed: false, isWarmup: true },
    { reps: 5, weight: 100, completed: false },
    { reps: 5, weight: 100, completed: false },
  ];
  const oneSet: SetData[] = [{ reps: 5, weight: 60, completed: false }];

  const SequenceHarness = () => {
    const { restState, startRest, stopRest } = useRestTimerController();
    const setsRef = useRef<Record<string, SetData[]>>({});
    const handleSetsChange = (exerciseId: string, sets: SetData[]) => {
      setsRef.current = { ...setsRef.current, [exerciseId]: sets };
    };
    // Dokładnie logika handleRestStart z WorkoutDay po Z189 (shouldStartRest).
    const handleRestStart = (exerciseId: string, seconds: number) => {
      if (!shouldStartRest(setsRef.current, [], [exerciseA, exerciseB])) {
        stopRest();
        void cancelRestEndNotification();
        return;
      }
      startRest(exerciseId, seconds);
    };
    const cardProps = (exercise: Exercise, savedSets: SetData[]) => ({
      exercise,
      index: 1,
      savedSets,
      isEditable: true,
      onSetsChange: handleSetsChange,
      restRun: restState && restState.exerciseId === exercise.id ? restState : null,
      onRestStart: handleRestStart,
      onRestStop: stopRest,
    });
    return (
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <span data-testid="run-id">{restState?.runId ?? 0}</span>
            <div data-testid="card-a"><ExerciseCard {...cardProps(exerciseA, warmupPlusTwo)} /></div>
            <div data-testid="card-b"><ExerciseCard {...cardProps(exerciseB, oneSet)} /></div>
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    localStorage.removeItem('fittracker_rest_settings_v1');
    localStorage.removeItem('fittracker_rest_state_v1');
  });

  it('rozgrzewka 45 s → robocza restartuje na 90 s → B przejmuje → ostatnia seria gasi wszystko', async () => {
    const view = render(<SequenceHarness />);
    const cardA = view.getByTestId('card-a');
    const cardB = view.getByTestId('card-b');
    const runId = () => Number(view.getByTestId('run-id').textContent);

    // 1. Odhacz W w A → pasek 45 s w A (martwa gałąź warmupSeconds ożyła, Z187).
    fireEvent.click(within(cardA).getAllByRole('button', { name: 'Zaznacz serię jako zrobioną' })[0]);
    await flushNotificationChain();
    expect(within(cardA).getByTestId('rest-bar')).toHaveTextContent('0:45');
    expect(runId()).toBe(1);

    // 2. Odhacz pierwszą roboczą w A → pasek restartuje na 90 s (runId rośnie;
    //    w A zostaje jeszcze jedna otwarta robocza, więc to NIE koniec ćwiczenia).
    fireEvent.click(within(cardA).getAllByRole('button', { name: 'Zaznacz serię jako zrobioną' })[0]);
    await flushNotificationChain();
    expect(within(cardA).getByTestId('rest-bar')).toHaveTextContent('1:30');
    expect(runId()).toBe(2);

    // 3. Odhacz jedyną serię w B → przerwa przechodzi do B (koniec ćwiczenia B =
    //    2:30 przejścia), JEDNA notyfikacja z czasem B.
    fireEvent.click(within(cardB).getAllByRole('button', { name: 'Zaznacz serię jako zrobioną' })[0]);
    await flushNotificationChain();
    expect(view.getAllByTestId('rest-bar')).toHaveLength(1);
    expect(within(cardB).getByTestId('rest-bar')).toHaveTextContent('2:30');
    expect(runId()).toBe(3);
    expect(pendingNotifications.size).toBe(1);
    expect(Array.from(pendingNotifications.values())[0].body).toContain('Wyciskanie sztangi');
    // Persystencja Z188: localStorage niesie biegnącą przerwę.
    expect(JSON.parse(localStorage.getItem('fittracker_rest_state_v1') ?? 'null')?.exerciseId).toBe('ex-b');

    // 4. OSTATNIA seria treningu (druga robocza w A) → stan null, zero pasków,
    //    zero notyfikacji, localStorage wyczyszczony.
    fireEvent.click(within(cardA).getAllByRole('button', { name: 'Zaznacz serię jako zrobioną' })[0]);
    await flushNotificationChain();
    expect(view.queryByTestId('rest-bar')).toBeNull();
    expect(runId()).toBe(0);
    expect(pendingNotifications.size).toBe(0);
    expect(localStorage.getItem('fittracker_rest_state_v1')).toBeNull();
  });

  it('kill w środku przerwy: nowy mount kontrolera + resumeFromStorage wraca z realnym czasem', () => {
    // Pierwszy "mount": przerwa 90 s startuje i persystuje.
    const first = renderHook(() => useRestTimerController());
    act(() => first.result.current.startRest('ex-b', 90));
    const persistedDeadline = first.result.current.restState!.deadlineAt;
    first.unmount();

    // Kill = nowy mount, stan Reacta pusty; resume czyta localStorage.
    const second = renderHook(() => useRestTimerController());
    expect(second.result.current.restState).toBeNull();
    act(() => second.result.current.resumeFromStorage());

    expect(second.result.current.restState).toMatchObject({ exerciseId: 'ex-b', totalSeconds: 90 });
    // Realny czas: TEN SAM deadline co przed killem, nie odliczanie od nowa.
    expect(second.result.current.restState!.deadlineAt).toBe(persistedDeadline);
  });
});

// ── Harness: dwie karty + wspólny właściciel stanu (jak WorkoutDay po Z143) ──

const exerciseA: Exercise = { id: 'ex-a', name: 'Przysiad ze sztangą (High Bar)', sets: '3 x 5', instructions: [] };
const exerciseB: Exercise = { id: 'ex-b', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 5', instructions: [] };

const twoSets = (): SetData[] => [
  { reps: 5, weight: 100, completed: false },
  { reps: 5, weight: 100, completed: false },
];

// ── Z187: przerwa startuje też po serii ROZGRZEWKOWEJ (martwa gałąź warmupSeconds) ──

describe('Z187: przerwa po serii rozgrzewkowej', () => {
  const renderCardWithWarmup = (onRestStart: (exerciseId: string, seconds: number) => void) => {
    const sets: SetData[] = [
      { reps: 10, weight: 20, completed: false, isWarmup: true },
      { reps: 5, weight: 100, completed: false },
      { reps: 5, weight: 100, completed: false },
    ];
    return render(
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <ExerciseCard
              exercise={exerciseA}
              index={1}
              savedSets={sets}
              isEditable
              onRestStart={onRestStart}
            />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    localStorage.removeItem('fittracker_rest_settings_v1');
  });

  it('odhaczenie serii W woła onRestStart z czasem warmupSeconds (45 s), bez dźwięku complete', async () => {
    const onRestStart = vi.fn();
    const { playTimerSound } = await import('@/lib/timer-sound');
    vi.mocked(playTimerSound).mockClear();

    const view = renderCardWithWarmup(onRestStart);
    // Wiersz W jest pierwszy w tabeli — pierwszy przycisk "Zaznacz".
    fireEvent.click(view.getAllByRole('button', { name: 'Zaznacz serię jako zrobioną' })[0]);

    expect(onRestStart).toHaveBeenCalledWith('ex-a', 45);
    // Rozgrzewka nie jest pracą: zero dźwięku "complete" i zero allDone.
    expect(vi.mocked(playTimerSound)).not.toHaveBeenCalledWith('complete');
  });

  it('niezmiennik: seria robocza dalej dostaje workingSeconds (90 s)', () => {
    const onRestStart = vi.fn();
    const view = renderCardWithWarmup(onRestStart);
    // Drugi przycisk = pierwsza seria robocza.
    fireEvent.click(view.getAllByRole('button', { name: 'Zaznacz serię jako zrobioną' })[1]);

    expect(onRestStart).toHaveBeenCalledWith('ex-a', 90);
  });
});

const TwoCardsHarness = () => {
  const { restState, startRest, adjustRest, stopRest } = useRestTimerController();
  const cardProps = (exercise: Exercise) => ({
    exercise,
    index: 1,
    savedSets: twoSets(),
    isEditable: true,
    restRun: restState && restState.exerciseId === exercise.id ? restState : null,
    onRestStart: startRest,
    onRestAdjust: adjustRest,
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
  // Z184: sanitizeSets niczego nie fabrykuje — savedSets bez W renderuje same serie
  // robocze, więc pierwsza otwarta seria jest pod indeksem [0].
  fireEvent.click(within(container).getAllByRole('button', { name: 'Zaznacz serię jako zrobioną' })[0]);
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

  it('sekwencja Z144: przedostatnia seria startuje timer, ostatnia seria treningu gasi wszystko', async () => {
    // Harness z bramką hasRemainingWork — dokładnie logika handleRestStart z WorkoutDay
    // (onSetsChange aktualizuje ref synchronicznie PRZED decyzją o przerwie).
    const GatedHarness = () => {
      const { restState, startRest, stopRest } = useRestTimerController();
      const setsRef = useRef<Record<string, SetData[]>>({});
      const handleSetsChange = (exerciseId: string, sets: SetData[]) => {
        setsRef.current = { ...setsRef.current, [exerciseId]: sets };
      };
      const handleRestStart = (exerciseId: string, seconds: number) => {
        if (!hasRemainingWork(setsRef.current, [], [exerciseA, exerciseB])) {
          stopRest();
          void cancelRestEndNotification();
          return;
        }
        startRest(exerciseId, seconds);
      };
      const cardProps = (exercise: Exercise) => ({
        exercise,
        index: 1,
        savedSets: twoSets(),
        isEditable: true,
        onSetsChange: handleSetsChange,
        restRun: restState && restState.exerciseId === exercise.id ? restState : null,
        onRestStart: handleRestStart,
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

    const view = render(<GatedHarness />);
    const cardA = view.getByTestId('card-a');
    const cardB = view.getByTestId('card-b');

    // A: seria 1 i 2 — po każdej timer biegnie (w B wciąż jest praca).
    checkFirstOpenSet(cardA);
    await flushNotificationChain();
    checkFirstOpenSet(cardA);
    await flushNotificationChain();
    expect(within(cardA).getAllByTestId('rest-bar')).toHaveLength(1);

    // B: przedostatnia seria treningu → timer startuje (przejęty przez B).
    checkFirstOpenSet(cardB);
    await flushNotificationChain();
    expect(within(cardB).getAllByTestId('rest-bar')).toHaveLength(1);
    expect(pendingNotifications.size).toBe(1);

    // B: OSTATNIA seria ostatniego ćwiczenia → zero pasków, biegnąca przerwa
    // anulowana, zero zaplanowanych notyfikacji.
    checkFirstOpenSet(cardB);
    await flushNotificationChain();
    expect(view.queryByTestId('rest-bar')).toBeNull();
    expect(pendingNotifications.size).toBe(0);
  });

  it('Z145: ukończona karta z aktywną przerwą NIE jest przygaszona; bez przerwy — jest', () => {
    const doneSets: SetData[] = [
      { reps: 5, weight: 100, completed: true },
      { reps: 5, weight: 100, completed: true },
    ];
    const renderDone = (restRun: { deadlineAt: number; totalSeconds: number; runId: number } | null) => render(
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <ExerciseCard
              exercise={exerciseA}
              index={1}
              savedSets={doneSets}
              isEditable={true}
              restRun={restRun}
              onRestStop={() => {}}
            />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );

    // Aktywna przerwa (odliczanie przejścia do następnego ćwiczenia) → karta
    // pełną jasnością, pasek widoczny.
    const withRest = renderDone({ deadlineAt: Date.now() + 150_000, totalSeconds: 150, runId: 1 });
    const cardWithRest = withRest.container.querySelector('.exercise-card') as HTMLElement;
    expect(cardWithRest.className).not.toContain('opacity-50');
    expect(within(cardWithRest).getByTestId('rest-bar')).toBeTruthy();
    withRest.unmount();

    // Bez przerwy → przygaszenie jak dotąd.
    const withoutRest = renderDone(null);
    const cardIdle = withoutRest.container.querySelector('.exercise-card') as HTMLElement;
    expect(cardIdle.className).toContain('opacity-50');
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
