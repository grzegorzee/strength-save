// X17C Z136: pasek przerwy inline w karcie ćwiczenia (wzorzec Strong — odliczanie
// w kontekście, nie modal kradnący ekran). Pasek tyka SAM, żeby karta nie
// re-renderowała się cztery razy na sekundę (kontrakt memo() z X17A).
// Z188: RestBar jest czysto prezentacyjny — deadline przychodzi propsem od
// właściciela stanu (kontroler w WorkoutDay), ±15 idzie w górę przez onAdjust.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RestBar } from '@/components/RestBar';
import { scheduleRestEndNotification, cancelRestEndNotification } from '@/lib/rest-notification';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@capacitor/haptics', () => ({ Haptics: { notification: vi.fn() }, NotificationType: { Success: 'SUCCESS' } }));
vi.mock('@/lib/timer-sound', () => ({ playTimerSound: vi.fn(), unlockTimerSound: vi.fn() }));
vi.mock('@/lib/rest-notification', () => ({
  scheduleRestEndNotification: vi.fn().mockResolvedValue(undefined),
  cancelRestEndNotification: vi.fn().mockResolvedValue(undefined),
}));
// Z189: raport wyjątku sygnału — moduł ciągnie Firestore, więc mock.
vi.mock('@/lib/global-error-telemetry', () => ({
  reportClientErrorWithCurrentUid: vi.fn(),
}));

// Harness = właściciel stanu (jak kontroler w WorkoutDay po Z188): trzyma deadline,
// obsługuje onAdjust dokładnie tak jak useRestTimerController.adjustRest.
const OwnerHarness = ({
  seconds = 90,
  runId = 1,
  onSkip = vi.fn(),
  onFinished,
}: { seconds?: number; runId?: number; onSkip?: () => void; onFinished?: () => void }) => {
  const [state, setState] = useState(() => ({
    deadlineAt: Date.now() + seconds * 1000,
    totalSeconds: seconds,
  }));
  return (
    <RestBar
      deadlineAt={state.deadlineAt}
      totalSeconds={state.totalSeconds}
      runId={runId}
      exerciseLabel="Przysiad"
      onSkip={onSkip}
      onAdjust={(delta) => setState((current) => ({
        deadlineAt: Math.max(Date.now(), current.deadlineAt + delta * 1000),
        totalSeconds: Math.max(1, current.totalSeconds + delta),
      }))}
      onFinished={onFinished}
    />
  );
};

const renderBar = (props: Parameters<typeof OwnerHarness>[0] = {}) => {
  const onSkip = vi.fn();
  render(
    <LanguageProvider>
      <OwnerHarness onSkip={onSkip} {...props} />
    </LanguageProvider>,
  );
  return { onSkip };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-20T10:00:00.000Z'));
  localStorage.setItem('app-language', 'pl');
  vi.mocked(scheduleRestEndNotification).mockClear();
  vi.mocked(cancelRestEndNotification).mockClear();
});
afterEach(() => vi.useRealTimers());

describe('RestBar (Z136)', () => {
  it('pokazuje odliczanie i skraca je z upływem czasu', () => {
    renderBar({ seconds: 90 });
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:30');
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:20');
  });

  it('+15 wydłuża przerwę, −15 skraca (przez onAdjust u właściciela)', () => {
    renderBar({ seconds: 60 });
    fireEvent.click(screen.getByRole('button', { name: '+15' }));
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:15');
    fireEvent.click(screen.getByRole('button', { name: '-15' }));
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:00');
  });

  it('„Pomiń" kończy przerwę i woła rodzica', () => {
    const { onSkip } = renderBar({ seconds: 90 });
    fireEvent.click(screen.getByRole('button', { name: /Pomiń/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('start PLANUJE powiadomienie systemowe na deadline', () => {
    renderBar({ seconds: 90 });
    expect(scheduleRestEndNotification).toHaveBeenCalled();
    const [seconds] = vi.mocked(scheduleRestEndNotification).mock.calls[0];
    expect(seconds).toBeGreaterThanOrEqual(90);
  });

  it('pominięcie ANULUJE zaplanowane powiadomienie (inaczej sygnał przyjdzie do nieistniejącej przerwy)', () => {
    renderBar({ seconds: 90 });
    vi.mocked(cancelRestEndNotification).mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Pomiń/i }));
    expect(cancelRestEndNotification).toHaveBeenCalled();
  });

  it('zmiana czasu PRZEPLANOWUJE powiadomienie na nowy deadline', () => {
    renderBar({ seconds: 60 });
    vi.mocked(scheduleRestEndNotification).mockClear();
    fireEvent.click(screen.getByRole('button', { name: '+15' }));
    expect(scheduleRestEndNotification).toHaveBeenCalled();
    const [seconds] = vi.mocked(scheduleRestEndNotification).mock.calls.at(-1)!;
    expect(seconds).toBeGreaterThanOrEqual(75);
  });

  it('powrót z tła po dłuższej nieobecności pokazuje koniec, nie zamrożony czas', () => {
    renderBar({ seconds: 90 });
    // Skok zegara jak po wyjęciu telefonu z kieszeni: JS był wstrzymany.
    act(() => { vi.setSystemTime(new Date('2026-07-20T10:05:00.000Z')); vi.advanceTimersByTime(250); });
    expect(screen.getByTestId('rest-bar')).toHaveTextContent(/Koniec|0:00/);
  });

  it('nowy runId startuje przerwę od nowa', () => {
    const { rerender } = render(
      <LanguageProvider>
        <RestBar
          deadlineAt={Date.now() + 90_000}
          totalSeconds={90}
          runId={1}
          exerciseLabel="Przysiad"
          onSkip={vi.fn()}
          onAdjust={vi.fn()}
        />
      </LanguageProvider>,
    );
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:00');

    rerender(
      <LanguageProvider>
        <RestBar
          deadlineAt={Date.now() + 90_000}
          totalSeconds={90}
          runId={2}
          exerciseLabel="Przysiad"
          onSkip={vi.fn()}
          onAdjust={vi.fn()}
        />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:30');
  });

  it('Z188: zmiana exerciseLabel NIE restartuje przerwy ani nie przeplanowuje notyfikacji', () => {
    const props = {
      deadlineAt: Date.now() + 90_000,
      totalSeconds: 90,
      runId: 1,
      onSkip: vi.fn(),
      onAdjust: vi.fn(),
    };
    const { rerender } = render(
      <LanguageProvider>
        <RestBar {...props} exerciseLabel="Przysiad" />
      </LanguageProvider>,
    );
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:00');
    vi.mocked(scheduleRestEndNotification).mockClear();

    rerender(
      <LanguageProvider>
        <RestBar {...props} exerciseLabel="Przysiad ze sztangą" />
      </LanguageProvider>,
    );
    // Ten sam runId i deadline: czas biegnie dalej, zero nowych notyfikacji.
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:00');
    expect(scheduleRestEndNotification).not.toHaveBeenCalled();
  });

  it('tap na pasek rozwija widok pełnoekranowy', () => {
    renderBar({ seconds: 90 });
    expect(screen.queryByTestId('rest-fullscreen')).toBeNull();
    fireEvent.click(screen.getByTestId('rest-bar-expand'));
    expect(screen.getByTestId('rest-fullscreen')).toBeTruthy();
  });

  it('Z189: wyjątek sygnału końca NIE blokuje onFinished (stan zawsze posprzątany)', async () => {
    const { playTimerSound } = await import('@/lib/timer-sound');
    vi.mocked(playTimerSound).mockImplementation(() => {
      throw new Error('AudioContext closed');
    });
    try {
      const onFinished = vi.fn();
      renderBar({ seconds: 5, onFinished });

      act(() => { vi.advanceTimersByTime(6_000); });

      expect(onFinished).toHaveBeenCalledTimes(1);
    } finally {
      vi.mocked(playTimerSound).mockReset();
    }
  });
});
