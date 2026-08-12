import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ReducedModeDialog } from '@/components/ReducedModeDialog';

// Runna pakiet 1, krok 14 (spec C3): dialog trybu "nie na 100%" — konfiguracja
// (poziom + okres 3/7/14) i stan aktywny z wyłącznikiem (reguła #6).

const renderDialog = (mode: Parameters<typeof ReducedModeDialog>[0]['mode']) => {
  const onEnable = vi.fn();
  const onDisable = vi.fn();
  render(
    <LanguageProvider>
      <ReducedModeDialog
        open
        onOpenChange={vi.fn()}
        mode={mode}
        todayISO="2026-08-12"
        onEnable={onEnable}
        onDisable={onDisable}
      />
    </LanguageProvider>,
  );
  return { onEnable, onDisable };
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('ReducedModeDialog', () => {
  it('konfiguracja: wybór poziomu i okresu, Włącz przekazuje oba', () => {
    const { onEnable } = renderDialog(null);
    fireEvent.click(screen.getByTestId('rmode-level-pause'));
    fireEvent.click(screen.getByTestId('rmode-days-7'));
    fireEvent.click(screen.getByTestId('rmode-enable'));
    expect(onEnable).toHaveBeenCalledWith('pause', 7);
  });

  it('domyślnie: lżej (-20%) na 7 dni', () => {
    const { onEnable } = renderDialog(null);
    fireEvent.click(screen.getByTestId('rmode-enable'));
    expect(onEnable).toHaveBeenCalledWith('lighter', 7);
  });

  it('tryb aktywny: stan + wyłącznik (stan ma wyjście)', () => {
    const { onDisable } = renderDialog({ startDate: '2026-08-10', endDate: '2026-08-16', level: 'lighter' });
    expect(screen.getByText(/Aktywny do/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('rmode-disable'));
    expect(onDisable).toHaveBeenCalledTimes(1);
  });
});
