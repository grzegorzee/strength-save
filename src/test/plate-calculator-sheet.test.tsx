// X17B Z133: arkusz kalkulatora v2. Zarzut usera: „nie mogę tam zmienić wagi,
// miałem na stałe przypisane np. 60 kg". Arkusz przestaje być ślepą uliczką.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { PlateCalculatorSheet } from '@/components/PlateCalculatorSheet';
import { PLATE_INVENTORY_STORAGE_KEY, savePlateInventory, DEFAULT_PLATE_INVENTORY } from '@/lib/plate-calculator';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  savePlateInventory(20, DEFAULT_PLATE_INVENTORY);
});

const renderSheet = (props: Partial<Parameters<typeof PlateCalculatorSheet>[0]> = {}) => {
  const onOpenChange = vi.fn();
  render(
    <LanguageProvider>
      <UnitProvider>
        <PlateCalculatorSheet open onOpenChange={onOpenChange} targetKg={60} {...props} />
      </UnitProvider>
    </LanguageProvider>,
  );
  return { onOpenChange };
};

const weightInput = () => screen.getByLabelText(/Waga docelowa/i) as HTMLInputElement;

describe('PlateCalculatorSheet v2 (Z133)', () => {
  it('pole wagi jest edytowalne i przelicza rozkład talerzy', () => {
    renderSheet({ targetKg: 60 });
    expect(weightInput().value).toBe('60');
    // 60 kg na gryfie 20 => 20 kg na stronę => 20
    expect(within(screen.getByTestId('plates-summary')).getByText(/1×20/)).toBeTruthy();

    fireEvent.change(weightInput(), { target: { value: '100' } });
    // 100 kg => 40 kg na stronę => 25 + 15
    expect(within(screen.getByTestId('plates-summary')).getByText(/1×25/)).toBeTruthy();
  });

  it('steppery zmieniają wagę o zadany krok', () => {
    renderSheet({ targetKg: 60 });
    fireEvent.click(screen.getByRole('button', { name: '+2.5 kg' }));
    expect(weightInput().value).toBe('62.5');
    fireEvent.click(screen.getByRole('button', { name: '-5 kg' }));
    expect(weightInput().value).toBe('57.5');
  });

  it('waga startowa pochodzi z serii, ale user może ją nadpisać', () => {
    renderSheet({ targetKg: 82.5 });
    expect(weightInput().value).toBe('82.5');
    fireEvent.change(weightInput(), { target: { value: '70' } });
    expect(weightInput().value).toBe('70');
  });

  it('„Ustaw w serii" oddaje policzoną wagę z exerciseId w sygnaturze', () => {
    const onApplyWeight = vi.fn();
    renderSheet({ targetKg: 60, exerciseId: 'ex-1', onApplyWeight });
    fireEvent.change(weightInput(), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Ustaw w serii/i }));
    expect(onApplyWeight).toHaveBeenCalledWith('ex-1', 100);
  });

  it('bez callbacku „Ustaw w serii" nie ma (widok tylko do podglądu)', () => {
    renderSheet({ targetKg: 60 });
    expect(screen.queryByRole('button', { name: /Ustaw w serii/i })).toBeNull();
  });

  it('waga nieosiągalna: para propozycji w dół i w górę, obie klikalne', () => {
    const onApplyWeight = vi.fn();
    renderSheet({ targetKg: 60, exerciseId: 'ex-1', onApplyWeight });
    fireEvent.change(weightInput(), { target: { value: '101' } });

    const suggestions = screen.getByTestId('plates-suggestions');
    expect(within(suggestions).getByText(/100/)).toBeTruthy();
    expect(within(suggestions).getByText(/102\.5/)).toBeTruthy();

    fireEvent.click(within(suggestions).getByTestId('plates-suggest-down'));
    expect(weightInput().value).toBe('100');
  });

  it('wskazuje brakujący nominał, gdy to on blokuje trafienie w cel', () => {
    savePlateInventory(20, [
      { weightKg: 25, count: 8 }, { weightKg: 20, count: 8 }, { weightKg: 15, count: 4 },
      { weightKg: 10, count: 4 }, { weightKg: 5, count: 4 }, { weightKg: 2.5, count: 4 },
    ]);
    renderSheet({ targetKg: 102.5 });
    expect(screen.getByTestId('plates-missing')).toBeTruthy();
  });

  it('tryb bez gryfu liczy całą wagę na jedną stronę', () => {
    renderSheet({ targetKg: 30 });
    fireEvent.click(screen.getByRole('button', { name: /Bez gryfu/i }));
    // 30 kg bez gryfu => 25 + 5 wprost, nie 15 na stronę.
    const summary = screen.getByTestId('plates-summary');
    expect(within(summary).getByText(/1×25/)).toBeTruthy();
    expect(within(summary).getByText(/1×5/)).toBeTruthy();
  });

  it('talerze mają widoczną liczbę kg niezależnie od presetu kolorów', () => {
    renderSheet({ targetKg: 100 });
    const visual = screen.getByTestId('plates-visual');
    expect(within(visual).getByText('25')).toBeTruthy();
    expect(within(visual).getByText('15')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'IWF' }));
    expect(within(screen.getByTestId('plates-visual')).getByText('25')).toBeTruthy();
  });

  it('zmiana gryfu przelicza rozkład i zostaje zapisana', () => {
    renderSheet({ targetKg: 60 });
    fireEvent.click(screen.getByRole('button', { name: '15 kg' }));
    // 60 na gryfie 15 => 22.5 na stronę => 20 + 2.5
    const summary = screen.getByTestId('plates-summary');
    expect(within(summary).getByText(/1×20/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(PLATE_INVENTORY_STORAGE_KEY)!).barKg).toBe(15);
  });
});
