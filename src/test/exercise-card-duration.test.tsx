import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import { playTimerSound } from '@/lib/timer-sound';
import { hapticRestEnd } from '@/lib/haptics';
import { armSetCountdownNotification, cancelSetCountdownNotification } from '@/lib/rest-notification';

// WP-C (X37): odliczanie serii na czas w wierszu serii tracking === 'duration'.
// Play -> odliczanie w dol od celu -> zero: durationSec = cel, completed = true
// TA SAMA sciezka co reczne odhaczenie (przerwa startuje, sygnaly). Stop w
// trakcie -> zapis uplynietego czasu bez odhaczenia.

const userProfile = vi.hoisted(() => ({
  current: null as null | { trainingProfile?: { level?: string } },
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'test-uid', profile: userProfile.current }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/timer-sound', () => ({ playTimerSound: vi.fn(), unlockTimerSound: vi.fn() }));
vi.mock('@/lib/haptics', () => ({
  hapticImpactLight: vi.fn(),
  hapticSuccess: vi.fn(),
  hapticRestEnd: vi.fn(),
}));
vi.mock('@/lib/rest-notification', () => ({
  armRestEndNotification: vi.fn(),
  cancelRestEndNotification: vi.fn().mockResolvedValue(undefined),
  armSetCountdownNotification: vi.fn(),
  cancelSetCountdownNotification: vi.fn().mockResolvedValue(undefined),
}));

const plank = (over: Partial<Exercise> = {}): Exercise => ({
  id: 'ex-plank',
  name: 'Plank',
  sets: '3 x MAX',
  instructions: [],
  ...over,
});

const emptySets = (): SetData[] => [
  { reps: 0, weight: 0, completed: false, isWarmup: true },
  { reps: 0, weight: 0, completed: false },
  { reps: 0, weight: 0, completed: false },
  { reps: 0, weight: 0, completed: false },
];

const renderPlank = (props: Partial<Parameters<typeof ExerciseCard>[0]> = {}) => {
  const onSetsChange = vi.fn();
  const onRestStart = vi.fn();
  const view = render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <ExerciseCard
            exercise={plank()}
            index={1}
            isBodyweight
            trackingType="duration"
            savedSets={emptySets()}
            onSetsChange={onSetsChange}
            onRestStart={onRestStart}
            {...props}
          />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
  const card = view.container.querySelector('.exercise-card') as HTMLElement;
  return { ...view, card, onSetsChange, onRestStart };
};

const timeInput = (card: HTMLElement, set: number): HTMLInputElement =>
  within(card).getByLabelText(new RegExp(`Plank, Set ${set}, Czas`)) as HTMLInputElement;

const startButton = (card: HTMLElement, set: number): HTMLButtonElement =>
  within(card).getByRole('button', { name: new RegExp(`Start odliczania: Set ${set}`) }) as HTMLButtonElement;

const lastSets = (onSetsChange: ReturnType<typeof vi.fn>): SetData[] =>
  onSetsChange.mock.calls[onSetsChange.mock.calls.length - 1][1] as SetData[];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  userProfile.current = null;
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-26T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ExerciseCard duration: cel odliczania jako placeholder pola czasu', () => {
  it('bez historii i planu: cel wg poziomu (beginner 0:30, advanced 1:00, brak profilu 0:45)', () => {
    userProfile.current = { trainingProfile: { level: 'beginner' } };
    let { card, unmount } = renderPlank();
    expect(timeInput(card, 1).placeholder).toBe('0:30');
    unmount();

    userProfile.current = { trainingProfile: { level: 'advanced' } };
    ({ card, unmount } = renderPlank());
    expect(timeInput(card, 1).placeholder).toBe('1:00');
    unmount();

    userProfile.current = null;
    ({ card } = renderPlank());
    expect(timeInput(card, 1).placeholder).toBe('0:45');
  });

  it('sekundy z planu ("3 x 45s") wygrywaja z poziomem', () => {
    userProfile.current = { trainingProfile: { level: 'beginner' } };
    const { card } = renderPlank({ exercise: plank({ sets: '3 x 45s' }) });
    expect(timeInput(card, 1).placeholder).toBe('0:45');
  });

  it('ostatni wynik serii roboczej wygrywa z planem', () => {
    const previous: SetData[] = [
      { reps: 0, weight: 0, completed: true, isWarmup: true, durationSec: 20 },
      { reps: 0, weight: 0, completed: true, durationSec: 40 },
      { reps: 0, weight: 0, completed: true, durationSec: 35 },
    ];
    const { card } = renderPlank({ exercise: plank({ sets: '3 x 45s' }), previousSets: previous });
    expect(timeInput(card, 1).placeholder).toBe('0:40');
    expect(timeInput(card, 2).placeholder).toBe('0:35');
  });

  it('przycisk startu ma 44 px i mowi, do jakiego celu odlicza', () => {
    userProfile.current = { trainingProfile: { level: 'beginner' } };
    const { card } = renderPlank();
    const button = startButton(card, 1);
    expect(button.getAttribute('aria-label')).toContain('0:30');
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('w-11');
  });
});

describe('ExerciseCard duration: odliczanie w dol i auto-odhaczenie', () => {
  it('play -> odliczanie z deadline -> zero: durationSec = cel, completed, przerwa, sygnaly', () => {
    userProfile.current = { trainingProfile: { level: 'beginner' } };
    const { card, onSetsChange, onRestStart } = renderPlank();

    fireEvent.click(startButton(card, 1));
    // Notyfikacja systemowa uzbrojona na deadline (schedule dopiero w tle).
    expect(armSetCountdownNotification).toHaveBeenCalledTimes(1);
    expect((armSetCountdownNotification as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(Date.now() + 30_000);
    expect(within(card).getByRole('timer').textContent).toBe('0:30');

    act(() => { vi.advanceTimersByTime(10_000); });
    expect(within(card).getByRole('timer').textContent).toBe('0:20');
    // W trakcie: brak zapisu, brak przerwy.
    expect(onRestStart).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(20_250); });
    const sets = lastSets(onSetsChange);
    expect(sets[1]).toMatchObject({ completed: true, durationSec: 30 });
    expect(onRestStart).toHaveBeenCalledTimes(1);
    expect(playTimerSound).toHaveBeenCalledWith('finish');
    expect(hapticRestEnd).toHaveBeenCalledTimes(1);
    expect(cancelSetCountdownNotification).toHaveBeenCalled();
    // Odliczanie zniknelo, pole pokazuje zapisany czas.
    expect(within(card).queryByRole('timer')).toBeNull();
    expect(timeInput(card, 1).value).toBe('0:30');
  });

  it('stop w trakcie = zapis uplynietego czasu bez odhaczenia i bez przerwy', () => {
    userProfile.current = { trainingProfile: { level: 'beginner' } };
    const { card, onSetsChange, onRestStart } = renderPlank();

    fireEvent.click(startButton(card, 1));
    act(() => { vi.advanceTimersByTime(12_000); });
    fireEvent.click(within(card).getByRole('button', { name: /Stop odliczania: Set 1/ }));

    const sets = lastSets(onSetsChange);
    expect(sets[1]).toMatchObject({ completed: false, durationSec: 12 });
    expect(onRestStart).not.toHaveBeenCalled();
    expect(cancelSetCountdownNotification).toHaveBeenCalled();
    expect(timeInput(card, 1).value).toBe('0:12');
  });

  it('cel = wartosc w polu, gdy seria ma juz czas (prefill z poprzedniej sesji)', () => {
    const sets = emptySets();
    sets[1].durationSec = 50;
    const { card, onSetsChange } = renderPlank({ savedSets: sets });

    fireEvent.click(startButton(card, 1));
    expect(within(card).getByRole('timer').textContent).toBe('0:50');
    act(() => { vi.advanceTimersByTime(50_250); });
    expect(lastSets(onSetsChange)[1]).toMatchObject({ completed: true, durationSec: 50 });
  });

  it('jedno odliczanie naraz w karcie: pozostale przyciski startu wylaczone', () => {
    const { card } = renderPlank();
    fireEvent.click(startButton(card, 1));
    expect(startButton(card, 2).disabled).toBe(true);
    expect(startButton(card, 3).disabled).toBe(true);
    // Stop zawsze dostepny (zasada #6: kazdy stan ma wyjscie).
    expect((within(card).getByRole('button', { name: /Stop odliczania: Set 1/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('powrot z tla po deadline: seria odhaczona z celem, bez powtorki dzwieku/haptyki', () => {
    userProfile.current = { trainingProfile: { level: 'beginner' } };
    const { card, onSetsChange, onRestStart } = renderPlank();

    fireEvent.click(startButton(card, 1));
    // iOS wstrzymal JS: zegar skoczyl o 5 minut bez ani jednego tiku.
    vi.setSystemTime(Date.now() + 5 * 60_000);
    act(() => { vi.advanceTimersByTime(250); });

    expect(lastSets(onSetsChange)[1]).toMatchObject({ completed: true, durationSec: 30 });
    expect(onRestStart).toHaveBeenCalledTimes(1);
    expect(playTimerSound).not.toHaveBeenCalledWith('finish');
    expect(hapticRestEnd).not.toHaveBeenCalled();
    expect(within(card).queryByRole('timer')).toBeNull();
  });

  it('reczne odhaczenie bez wyniku nie kończy odliczania i wskazuje bezpieczne wyjście', () => {
    const { card, onSetsChange, onRestStart } = renderPlank();
    fireEvent.click(startButton(card, 1));
    act(() => { vi.advanceTimersByTime(5_000); });
    fireEvent.click(within(card).getAllByRole('button', { name: /Zaznacz serię jako zrobioną/ })[1]);

    expect(within(card).getByRole('timer')).toBeTruthy();
    expect(onSetsChange).not.toHaveBeenCalled();
    expect(within(card).getByRole('alert')).toHaveTextContent('Wpisz czas serii albo uruchom odliczanie.');
    expect(onRestStart).not.toHaveBeenCalled();
    expect(within(card).getByRole('button', { name: /Stop odliczania: Set 1/ })).toBeTruthy();
  });

  it('reczne odhaczenie pustej serii czasowej nie tworzy ukończonego pustego wyniku', () => {
    const { card, onSetsChange, onRestStart } = renderPlank();
    fireEvent.click(within(card).getAllByRole('button', { name: /Zaznacz serię jako zrobioną/ })[1]);
    expect(onSetsChange).not.toHaveBeenCalled();
    expect(within(card).getByRole('alert')).toHaveTextContent('Wpisz czas serii albo uruchom odliczanie.');
    expect(onRestStart).not.toHaveBeenCalled();
  });
});

describe('ExerciseCard weight_distance_duration: odliczanie jako pasek pod aktywna seria', () => {
  it('pasek odliczania tylko pod aktywna seria, bez dodatkowej kolumny w siatce', () => {
    const { card, onSetsChange } = renderPlank({
      exercise: plank({ id: 'ex-farmer', name: "Spacer farmera (Farmer's Walk)", sets: '3 x 30s' }),
      isBodyweight: false,
      trackingType: 'weight_distance_duration',
    });
    expect(within(card).getAllByTestId('set-countdown-strip')).toHaveLength(1);
    fireEvent.click(within(card).getByRole('button', { name: /Start odliczania: Set 1/ }));
    act(() => { vi.advanceTimersByTime(30_250); });
    expect(lastSets(onSetsChange)[1]).toMatchObject({ completed: true, durationSec: 30 });
  });
});
