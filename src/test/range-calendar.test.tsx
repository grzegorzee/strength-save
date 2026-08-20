import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { RangeCalendar } from '@/components/ui/range-calendar';
import type { DateRangeValue } from '@/lib/date-range-select';

// T20.1: kalendarz zakresów booking-style. Asercje po atrybutach data-*
// (nie po klasach CSS). Nagłówek miesiąca w języku APKI (pułapka T18).

interface HarnessProps {
  initial?: DateRangeValue;
  onChange?: (value: DateRangeValue) => void;
  minDate?: string;
  maxDate?: string;
  initialMonth?: string;
}

const Harness = ({ initial = { from: null, to: null }, onChange, ...props }: HarnessProps) => {
  const [value, setValue] = useState<DateRangeValue>(initial);
  return (
    <RangeCalendar
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      {...props}
    />
  );
};

const renderCalendar = (props: HarnessProps = {}) => {
  const onChange = vi.fn();
  render(
    <LanguageProvider>
      <Harness onChange={onChange} {...props} />
    </LanguageProvider>,
  );
  return { onChange };
};

const day = (iso: string): HTMLButtonElement => {
  const el = document.querySelector<HTMLButtonElement>(`[data-day='${iso}']`);
  if (!el) throw new Error(`Brak dnia ${iso} w siatce`);
  return el;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('RangeCalendar', () => {
  it('renderuje siatkę miesiąca z initialMonth, tydzień od poniedziałku', () => {
    renderCalendar({ initialMonth: '2026-08-15' });
    expect(screen.getByTestId('range-calendar-month').textContent).toContain('sierpień');
    // Sierpień 2026 zaczyna się w sobotę — 1. dzień w 6. kolumnie, 31 dni obecnych.
    expect(day('2026-08-01')).toBeTruthy();
    expect(day('2026-08-31')).toBeTruthy();
    expect(document.querySelector("[data-day='2026-07-31']")).toBeNull();
  });

  it('dwa kliki budują zakres: krańce data-selected, dni pomiędzy data-in-range', () => {
    const { onChange } = renderCalendar({ initialMonth: '2026-08-15' });
    fireEvent.click(day('2026-08-23'));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-08-23', to: null });
    fireEvent.click(day('2026-08-31'));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-08-23', to: '2026-08-31' });
    expect(day('2026-08-23').dataset.selected).toBe('true');
    expect(day('2026-08-31').dataset.selected).toBe('true');
    for (const d of ['2026-08-24', '2026-08-27', '2026-08-30']) {
      expect(day(d).dataset.inRange).toBe('true');
    }
    expect(day('2026-08-22').dataset.inRange).toBeUndefined();
  });

  it('klik przed początkiem restartuje wybór (nowy from, bez błędu)', () => {
    const { onChange } = renderCalendar({ initialMonth: '2026-08-15' });
    fireEvent.click(day('2026-08-23'));
    fireEvent.click(day('2026-08-20'));
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-08-20', to: null });
    expect(day('2026-08-20').dataset.selected).toBe('true');
    expect(day('2026-08-23').dataset.selected).toBeUndefined();
  });

  it('dni przed minDate i po maxDate są disabled', () => {
    renderCalendar({ initialMonth: '2026-08-15', minDate: '2026-08-10', maxDate: '2026-08-20' });
    expect(day('2026-08-09').disabled).toBe(true);
    expect(day('2026-08-10').disabled).toBe(false);
    expect(day('2026-08-20').disabled).toBe(false);
    expect(day('2026-08-21').disabled).toBe(true);
  });

  it('nawigacja miesiąca zmienia nagłówek i siatkę (przełom roku)', () => {
    renderCalendar({ initialMonth: '2026-12-05' });
    expect(screen.getByTestId('range-calendar-month').textContent).toContain('grudzień');
    fireEvent.click(screen.getByTestId('range-calendar-next'));
    expect(screen.getByTestId('range-calendar-month').textContent).toContain('styczeń');
    expect(screen.getByTestId('range-calendar-month').textContent).toContain('2027');
    expect(day('2027-01-01')).toBeTruthy();
    fireEvent.click(screen.getByTestId('range-calendar-prev'));
    expect(screen.getByTestId('range-calendar-month').textContent).toContain('grudzień');
  });

  it('nagłówek miesiąca podąża za językiem APKI (en), tydzień dalej od poniedziałku', () => {
    localStorage.setItem('app-language', 'en');
    renderCalendar({ initialMonth: '2026-08-15' });
    expect(screen.getByTestId('range-calendar-month').textContent).toContain('August 2026');
    // Pierwsza etykieta dnia tygodnia to poniedziałek także przy en.
    const labels = screen.getByTestId('range-calendar').querySelectorAll('p');
    expect(labels[1].textContent).toContain('Mon');
  });

  it('otwiera się na miesiącu from, gdy zakres już wybrany', () => {
    renderCalendar({ initial: { from: '2026-11-03', to: '2026-11-09' } });
    expect(screen.getByTestId('range-calendar-month').textContent).toContain('listopad');
    expect(day('2026-11-03').dataset.selected).toBe('true');
    expect(day('2026-11-06').dataset.inRange).toBe('true');
  });
});
