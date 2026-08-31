import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { DateRangeField } from '@/components/DateRangeField';
import type { DateRangeValue } from '@/lib/date-range-select';

// T20.2: trigger + popover z RangeCalendar i Wyczyść (zasada 6: filtr ma wyjście).

const Harness = ({ onChange }: { onChange: (value: DateRangeValue) => void }) => {
  const [value, setValue] = useState<DateRangeValue>({ from: null, to: null });
  return (
    <DateRangeField
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
};

const day = (iso: string): HTMLButtonElement => {
  const el = document.querySelector<HTMLButtonElement>(`[data-day='${iso}']`);
  if (!el) throw new Error(`Brak dnia ${iso} w siatce`);
  return el;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 0));
});

describe('DateRangeField', () => {
  it('trzyma wybór lokalnie i zatwierdza pełny zakres dopiero przy zamknięciu', () => {
    const onChange = vi.fn();
    render(
      <LanguageProvider>
        <Harness onChange={onChange} />
      </LanguageProvider>,
    );
    const trigger = screen.getByTestId('date-range-field-trigger');
    expect(trigger.textContent).toContain('Wybierz zakres dat');

    fireEvent.click(trigger);
    expect(screen.getByTestId('date-range-field-calendar')).toBeTruthy();

    fireEvent.click(day('2026-08-23'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(day('2026-08-31'));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-08-23', to: '2026-08-31' });
    expect(trigger.textContent).toContain('23 sie 2026');
    expect(trigger.textContent).toContain('31 sie 2026');

    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId('date-range-field-clear'));
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onChange).toHaveBeenLastCalledWith({ from: null, to: null });
    expect(trigger.textContent).toContain('Wybierz zakres dat');
  });
});
