// X17B Z134.1: ustawienia sprzętu z toggli on/off na realną konfigurację.
// Wzorzec StrengthLog: liczba sztuk per rozmiar, własne talerze, lista gryfów.
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { PlateInventorySettings } from '@/components/PlateCalculatorSheet';
import { loadPlateInventory, savePlateInventory, DEFAULT_PLATE_INVENTORY } from '@/lib/plate-calculator';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  savePlateInventory(20, DEFAULT_PLATE_INVENTORY);
});

const renderSettings = () => render(
  <LanguageProvider>
    <UnitProvider>
      <PlateInventorySettings />
    </UnitProvider>
  </LanguageProvider>,
);

// Dopasowanie DOKŁADNE: `Sztuk .*25` łapałoby też „Sztuk 1.25".
const countInput = (weightKg: number) => screen.getByLabelText(`Sztuk ${weightKg}`) as HTMLInputElement;

describe('PlateInventorySettings v2 (Z134.1)', () => {
  it('pozwala ustawić liczbę sztuk per rozmiar i zapisuje ją', () => {
    renderSettings();
    fireEvent.change(countInput(25), { target: { value: '2' } });
    const saved = loadPlateInventory().plates.find((p) => p.weightKg === 25);
    expect(saved?.count).toBe(2);
  });

  it('liczba sztuk 0 wyłącza talerz z obliczeń', () => {
    renderSettings();
    fireEvent.change(countInput(1.25), { target: { value: '0' } });
    const saved = loadPlateInventory().plates.find((p) => p.weightKg === 1.25);
    expect(saved?.count).toBe(0);
  });

  it('pozwala dodać własny rozmiar talerza', () => {
    renderSettings();
    fireEvent.change(screen.getByLabelText(/Własny talerz/i), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Dodaj talerz/i }));
    expect(loadPlateInventory().plates.some((p) => p.weightKg === 12.5)).toBe(true);
  });

  it('nie dodaje duplikatu ani wartości bezsensownej', () => {
    renderSettings();
    const before = loadPlateInventory().plates.length;

    fireEvent.change(screen.getByLabelText(/Własny talerz/i), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /Dodaj talerz/i }));
    expect(loadPlateInventory().plates.length).toBe(before);

    fireEvent.change(screen.getByLabelText(/Własny talerz/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Dodaj talerz/i }));
    expect(loadPlateInventory().plates.length).toBe(before);
  });

  it('pozwala ustawić gryf spoza presetów', () => {
    renderSettings();
    fireEvent.change(screen.getByLabelText(/Własny gryf/i), { target: { value: '7.5' } });
    expect(loadPlateInventory().barKg).toBe(7.5);
  });

  it('preset imperialny podmienia inwentarz na talerze funtowe', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /lbs/i }));
    const plates = loadPlateInventory().plates;
    // 45 lb ≈ 20.412 kg — kg kanonicznie, lbs tylko na ekranie.
    expect(plates.some((p) => Math.abs(p.weightKg - 20.412) < 0.01)).toBe(true);
  });

  it('preset metryczny wraca do domyślnej siódemki', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /lbs/i }));
    fireEvent.click(screen.getByRole('button', { name: /^kg$/i }));
    expect(loadPlateInventory().plates).toEqual(DEFAULT_PLATE_INVENTORY);
  });

  it('usunięcie własnego talerza znika z inwentarza', () => {
    renderSettings();
    fireEvent.change(screen.getByLabelText(/Własny talerz/i), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Dodaj talerz/i }));

    const row = screen.getByTestId('plate-row-12.5');
    fireEvent.click(within(row).getByRole('button', { name: /Usuń/i }));
    expect(loadPlateInventory().plates.some((p) => p.weightKg === 12.5)).toBe(false);
  });
});

// Zgłoszenie 2026-07-24 (build 77): klik LBS wyglądał na martwy — preset się aplikował,
// ale przycisk nie pokazywał wyboru, a nominały dalej renderowały się w kg (20.412 kg
// zamiast 45 lbs). Jednostka inwentarza musi być widoczna, trwała i spójna z wpisem.
describe('jednostka inwentarza w UI', () => {
  it('klik LBS zaznacza przycisk i pokazuje nominały funtowe', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /lbs/i }));

    expect(screen.getByRole('button', { name: /lbs/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^kg$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('45 lbs')).toBeInTheDocument();
    expect(screen.queryByText(/20\.412/)).toBeNull();
    expect(screen.getByText('Dostępne talerze (lbs)')).toBeInTheDocument();
  });

  it('wybór jednostki przeżywa remount (persist w localStorage)', () => {
    const first = renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /lbs/i }));
    first.unmount();

    renderSettings();
    expect(screen.getByRole('button', { name: /lbs/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('45 lbs')).toBeInTheDocument();
  });

  it('własny talerz przy inwentarzu lbs jest interpretowany w funtach', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /lbs/i }));

    fireEvent.change(screen.getByLabelText(/Własny talerz/i), { target: { value: '55' } });
    fireEvent.click(screen.getByRole('button', { name: /Dodaj talerz/i }));

    // 55 lb ≈ 24.948 kg — kanonicznie kg, wpis w jednostce inwentarza.
    expect(loadPlateInventory().plates.some((p) => Math.abs(p.weightKg - 24.948) < 0.01)).toBe(true);
    expect(screen.getByText('55 lbs')).toBeInTheDocument();
  });
});
