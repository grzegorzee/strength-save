import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LocalizedDateInput } from '@/components/LocalizedDateInput';

// T18-1: wrapper natywnego inputa daty. Etykieta podąża za językiem APKI
// (dateLocale), a kontrakt wartości zostaje ISO YYYY-MM-DD (niezmiennik:
// filtry Historii i urlop porównują stringi leksykograficznie).

const renderInput = (
  lang: 'pl' | 'en',
  props: Partial<Parameters<typeof LocalizedDateInput>[0]> = {},
) => {
  localStorage.setItem('app-language', lang);
  return render(
    <LanguageProvider>
      <LocalizedDateInput data-testid="date-input" value="2026-08-20" onChange={vi.fn()} {...props} />
    </LanguageProvider>,
  );
};

beforeEach(() => localStorage.clear());

describe('LocalizedDateInput', () => {
  it('EN: etykieta po angielsku (Aug 20, 2026), zero polskiego skrótu miesiąca', () => {
    renderInput('en');
    expect(screen.getByText(/Aug 20, 2026/)).toBeTruthy();
    expect(screen.queryByText(/sie/)).toBeNull();
  });

  it('PL: etykieta po polsku (20 sie 2026)', () => {
    renderInput('pl');
    expect(screen.getByText(/20 sie 2026/)).toBeTruthy();
  });

  it('onChange emituje ISO YYYY-MM-DD (kontrakt wartości bez zmian)', () => {
    let received = '';
    renderInput('en', { onChange: (e) => { received = e.target.value; } });
    fireEvent.change(screen.getByTestId('date-input'), { target: { value: '2026-08-21' } });
    expect(received).toBe('2026-08-21');
  });

  it('puste value: placeholder z dateInput.pick w języku apki', () => {
    renderInput('pl', { value: '' });
    expect(screen.getByText('Wybierz datę')).toBeTruthy();
  });

  it('min/max/data-testid trafiają na natywny input type=date', () => {
    renderInput('en', { min: '2026-01-01', max: '2026-12-31' });
    const input = screen.getByTestId('date-input') as HTMLInputElement;
    expect(input.type).toBe('date');
    expect(input.min).toBe('2026-01-01');
    expect(input.max).toBe('2026-12-31');
    expect(input.value).toBe('2026-08-20');
  });
});
