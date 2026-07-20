// X17C Z136: pasek przerwy inline w karcie ćwiczenia (wzorzec Strong — odliczanie
// w kontekście, nie modal kradnący ekran). Pasek tyka SAM, żeby karta nie
// re-renderowała się cztery razy na sekundę (kontrakt memo() z X17A).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const renderBar = (props: Partial<Parameters<typeof RestBar>[0]> = {}) => {
  const onSkip = vi.fn();
  render(
    <LanguageProvider>
      <RestBar seconds={90} runId={1} exerciseLabel="Przysiad" onSkip={onSkip} {...props} />
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

  it('+15 wydłuża przerwę, −15 skraca', () => {
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
        <RestBar seconds={90} runId={1} exerciseLabel="Przysiad" onSkip={vi.fn()} />
      </LanguageProvider>,
    );
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:00');

    rerender(
      <LanguageProvider>
        <RestBar seconds={90} runId={2} exerciseLabel="Przysiad" onSkip={vi.fn()} />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('rest-bar')).toHaveTextContent('1:30');
  });

  it('tap na pasek rozwija widok pełnoekranowy', () => {
    renderBar({ seconds: 90 });
    expect(screen.queryByTestId('rest-fullscreen')).toBeNull();
    fireEvent.click(screen.getByTestId('rest-bar-expand'));
    expect(screen.getByTestId('rest-fullscreen')).toBeTruthy();
  });
});
