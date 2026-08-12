import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LapseTray } from '@/components/LapseTray';
import type { Lapse } from '@/lib/lapse-detection';

// Runna pakiet 1, krok 13 (spec C2): tray zaległości — każda opcja jednym
// tapem, ton neutralny, rodzic zamyka sheet PRZED mutacją (lekcja b.92).

const staleLapse = (weekPlus: boolean): Lapse => ({
  kind: 'stale-session',
  dateISO: '2026-08-07',
  dismissKey: '2026-08-07',
  day: { id: 'day-3', dayName: 'Push', weekday: 'friday', focus: 'Push', exercises: [] },
  weekPlus,
});

const emptyWeekLapse: Lapse = {
  kind: 'empty-week',
  dateISO: '2026-08-03',
  dismissKey: 'week:2026-08-03',
  day: null,
  weekPlus: true,
};

const renderTray = (lapse: Lapse) => {
  const handlers = {
    onOpenChange: vi.fn(),
    onSkip: vi.fn(),
    onMove: vi.fn(),
    onContinueToday: vi.fn(),
  };
  render(
    <LanguageProvider>
      <LapseTray open lapse={lapse} {...handlers} />
    </LanguageProvider>,
  );
  return handlers;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('LapseTray', () => {
  it('krótka zaległość: [Odpuść] i [Przełóż], bez Kontynuuj od dziś', () => {
    const h = renderTray(staleLapse(false));
    fireEvent.click(screen.getByTestId('lapse-skip'));
    expect(h.onSkip).toHaveBeenCalledWith('2026-08-07');
    fireEvent.click(screen.getByTestId('lapse-move'));
    expect(h.onMove).toHaveBeenCalledWith('2026-08-07');
    expect(screen.queryByTestId('lapse-continue')).toBeNull();
  });

  it('zaległość tygodnia+: dochodzi [Kontynuuj od dziś]', () => {
    const h = renderTray(staleLapse(true));
    fireEvent.click(screen.getByTestId('lapse-continue'));
    expect(h.onContinueToday).toHaveBeenCalledTimes(1);
  });

  it('pusty tydzień: [Kontynuuj od dziś] bez opcji per sesja', () => {
    const h = renderTray(emptyWeekLapse);
    expect(screen.queryByTestId('lapse-skip')).toBeNull();
    expect(screen.queryByTestId('lapse-move')).toBeNull();
    fireEvent.click(screen.getByTestId('lapse-continue'));
    expect(h.onContinueToday).toHaveBeenCalledTimes(1);
  });

  it('ton neutralny: tytuł bez pretensji', () => {
    renderTray(staleLapse(false));
    expect(screen.getByText('Wróćmy do planu')).toBeTruthy();
  });
});
