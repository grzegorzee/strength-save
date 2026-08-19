import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { VacationDialog } from '@/components/VacationDialog';

// Runna pakiet 1, krok 15 (spec C4): dialog urlopu — deklaracja z góry,
// anulowanie przed startem i w trakcie, kolizja z trybem C3 (jeden naraz).

const renderDialog = (props: Partial<Parameters<typeof VacationDialog>[0]> = {}) => {
  const onEnable = vi.fn();
  const onCancel = vi.fn();
  render(
    <LanguageProvider>
      <VacationDialog
        open
        onOpenChange={vi.fn()}
        vacation={null}
        reducedModeActive={false}
        todayISO="2026-08-12"
        onEnable={onEnable}
        onCancel={onCancel}
        {...props}
      />
    </LanguageProvider>,
  );
  return { onEnable, onCancel };
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('VacationDialog', () => {
  it('konfiguracja: start + preset długości + aktywność, Dodaj wyjazd przekazuje wszystko', () => {
    const { onEnable } = renderDialog();
    fireEvent.change(screen.getByTestId('vac-start'), { target: { value: '2026-08-17' } });
    fireEvent.click(screen.getByTestId('vac-days-14'));
    fireEvent.click(screen.getByTestId('vac-activity-mains_only'));
    fireEvent.click(screen.getByTestId('vac-enable'));
    expect(onEnable).toHaveBeenCalledWith('2026-08-17', 14, 'mains_only');
  });

  it('C-T1: zakres Od-Do liczy dni włącznie i pokazuje podsumowanie przed zapisem', () => {
    const { onEnable } = renderDialog();
    fireEvent.change(screen.getByTestId('vac-start'), { target: { value: '2026-08-23' } });
    fireEvent.change(screen.getByTestId('vac-end'), { target: { value: '2026-08-31' } });
    // Podsumowanie: 9 dni + wydłużenie o 2 tyg. (ceil(9/7)).
    expect(screen.getByTestId('vac-summary').textContent).toContain('9');
    expect(screen.getByTestId('vac-summary').textContent).toContain('2');
    fireEvent.click(screen.getByTestId('vac-enable'));
    expect(onEnable).toHaveBeenCalledWith('2026-08-23', 9, 'none');
  });

  it('C-T1: preset ustawia Do względem Od (14 dni = start+13)', () => {
    renderDialog();
    fireEvent.change(screen.getByTestId('vac-start'), { target: { value: '2026-12-28' } });
    fireEvent.click(screen.getByTestId('vac-days-14'));
    expect((screen.getByTestId('vac-end') as HTMLInputElement).value).toBe('2027-01-10');
  });

  it('C-T1: koniec przed początkiem blokuje zapis z komunikatem', () => {
    const { onEnable } = renderDialog();
    fireEvent.change(screen.getByTestId('vac-start'), { target: { value: '2026-08-23' } });
    fireEvent.change(screen.getByTestId('vac-end'), { target: { value: '2026-08-20' } });
    expect(screen.getByText(/Koniec przed początkiem/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('vac-enable'));
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('C-T1: zakres poza 3-21 dni blokuje zapis (min i max)', () => {
    const { onEnable } = renderDialog();
    fireEvent.change(screen.getByTestId('vac-start'), { target: { value: '2026-08-23' } });
    fireEvent.change(screen.getByTestId('vac-end'), { target: { value: '2026-09-30' } });
    expect(screen.getByText(/Maksymalnie 21/)).toBeTruthy();
    fireEvent.change(screen.getByTestId('vac-end'), { target: { value: '2026-08-24' } });
    expect(screen.getByText(/Minimum 3/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('vac-enable'));
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('istniejący urlop: stan + [Anuluj urlop] (przed startem i w trakcie)', () => {
    const { onCancel } = renderDialog({
      vacation: { startDate: '2026-08-17', endDate: '2026-08-23', activity: 'none', extendedWeeks: 1 },
    });
    expect(screen.getByText(/17/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('vac-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('kolizja z trybem C3: komunikat zamiast formularza (jeden tryb naraz)', () => {
    renderDialog({ reducedModeActive: true });
    expect(screen.getByText(/Jeden tryb naraz/)).toBeTruthy();
    expect(screen.queryByTestId('vac-enable')).toBeNull();
  });
});
