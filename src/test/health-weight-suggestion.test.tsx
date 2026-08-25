// Bug 42 (X30): banner "Dodaj X kg ze Zdrowia" ignorował jednostkę usera —
// user z unit-system=lbs widział kg nad formularzem pomiarów działającym w lbs.
// Wartość i zapis zawsze były poprawne (kg kanoniczne); bug czysto prezentacyjny.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { HealthWeightSuggestion } from '@/components/HealthWeightSuggestion';

vi.mock('@/lib/health-bridge', () => ({
  loadHealthSettings: () => ({ syncWorkouts: false, suggestWeight: true }),
  getHealthBridge: () => ({
    readLatestWeight: async () => ({ kg: 80.4, date: '2026-08-20' }),
  }),
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

const renderBanner = () => render(
  <LanguageProvider>
    <UnitProvider>
      <HealthWeightSuggestion measurements={[]} onAccept={async () => {}} />
    </UnitProvider>
  </LanguageProvider>,
);

describe('bug 42 (X30): jednostka w bannerze wagi ze Zdrowia', () => {
  it('user lbs widzi wagę w lbs, nie w kg', async () => {
    localStorage.setItem('unit-system', 'lbs');
    renderBanner();

    const banner = await screen.findByTestId('health-weight-suggestion');
    // 80.4 kg ≈ 177.3 lbs (zaokrąglenie do 0.1 jak dotychczas dla kg).
    expect(banner.textContent).toContain('177.3 lbs');
    expect(banner.textContent).not.toContain('kg');
  });

  it('user kg dalej widzi kg (stary przepływ nietknięty)', async () => {
    renderBanner();

    const banner = await screen.findByTestId('health-weight-suggestion');
    expect(banner.textContent).toContain('80.4 kg');
  });
});
