import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { VacationDialog } from '@/components/VacationDialog';

// Runna pakiet 1, krok 15 (spec C4): dialog urlopu — deklaracja z góry,
// anulowanie przed startem i w trakcie, kolizja z trybem C3 (jeden naraz).

// T20.3: wybór zakresu klikami w kalendarz (booking-style) zamiast inputów date.
const day = (iso: string): HTMLButtonElement => {
  const el = document.querySelector<HTMLButtonElement>(`[data-day='${iso}']`);
  if (!el) throw new Error(`Brak dnia ${iso} w siatce`);
  return el;
};

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
    // Klik przy pełnym zakresie domyślnym (dziś + 6) restartuje początek.
    fireEvent.click(day('2026-08-17'));
    fireEvent.click(screen.getByTestId('vac-days-14'));
    fireEvent.click(screen.getByTestId('vac-activity-mains_only'));
    fireEvent.click(screen.getByTestId('vac-enable'));
    expect(onEnable).toHaveBeenCalledWith('2026-08-17', 14, 'mains_only');
  });

  it('C-T1: zakres Od-Do liczy dni włącznie i pokazuje podsumowanie przed zapisem', () => {
    const { onEnable } = renderDialog();
    fireEvent.click(day('2026-08-23'));
    fireEvent.click(day('2026-08-31'));
    // Podsumowanie: 9 dni + wydłużenie o 2 tyg. (ceil(9/7)).
    expect(screen.getByTestId('vac-summary').textContent).toContain('9');
    expect(screen.getByTestId('vac-summary').textContent).toContain('2');
    fireEvent.click(screen.getByTestId('vac-enable'));
    expect(onEnable).toHaveBeenCalledWith('2026-08-23', 9, 'none');
  });

  it('C-T1: preset ustawia Do względem Od (14 dni = start+13, przełom roku)', () => {
    renderDialog();
    // Nawigacja sierpień -> grudzień (4 x następny miesiąc), start 2026-12-28.
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByTestId('vac-calendar-next'));
    fireEvent.click(day('2026-12-28'));
    fireEvent.click(screen.getByTestId('vac-days-14'));
    // Koniec 2027-01-10 poza widocznym miesiącem — grudniowa końcówka w zakresie.
    expect(day('2026-12-28').dataset.selected).toBe('true');
    expect(day('2026-12-31').dataset.inRange).toBe('true');
    expect(screen.getByTestId('vac-summary').textContent).toContain('14');
    expect(screen.getByTestId('vac-summary').textContent).toContain('10 stycznia');
  });

  it('T20.3: klik dnia przed startem restartuje początek (bez błędu od>do)', () => {
    const { onEnable } = renderDialog();
    fireEvent.click(day('2026-08-23'));
    fireEvent.click(day('2026-08-20'));
    // Zakres zrestartowany: nowy początek 20.08, koniec do wybrania (hint, zapis zablokowany).
    expect(day('2026-08-20').dataset.selected).toBe('true');
    expect(day('2026-08-23').dataset.selected).toBeUndefined();
    expect(screen.getByTestId('vac-range-hint')).toBeTruthy();
    fireEvent.click(screen.getByTestId('vac-enable'));
    expect(onEnable).not.toHaveBeenCalled();
    // Dokończenie wyboru działa normalnie: 20-25.08 = 6 dni.
    fireEvent.click(day('2026-08-25'));
    expect(screen.getByTestId('vac-summary').textContent).toContain('6');
  });

  it('C-T1: zakres powyżej 21 dni blokuje zapis (max)', () => {
    const { onEnable } = renderDialog();
    fireEvent.click(day('2026-08-23'));
    fireEvent.click(screen.getByTestId('vac-calendar-next'));
    fireEvent.click(day('2026-09-30'));
    expect(screen.getByText(/Maksymalnie 21/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('vac-enable'));
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('C-T1: zakres poniżej 3 dni blokuje zapis (min)', () => {
    const { onEnable } = renderDialog();
    fireEvent.click(day('2026-08-23'));
    fireEvent.click(day('2026-08-24'));
    expect(screen.getByText(/Minimum 3/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('vac-enable'));
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('T20.3: dni przed dziś (todayISO) są wyłączone', () => {
    renderDialog();
    expect(day('2026-08-11').disabled).toBe(true);
    expect(day('2026-08-12').disabled).toBe(false);
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
