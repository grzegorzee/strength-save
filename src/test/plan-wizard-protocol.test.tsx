import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// PlanBuilder ciągnie firebase (custom exercises); tryb "own" nie jest tu testowany.
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));

import { PlanWizard } from '@/components/PlanWizard';

// T1+T2 (feedback 2026-08-20): krok "Zatwierdź protokół" — nagłówek mówi wprost
// o dniach TRENINGOWYCH, notatka uspokaja, że plan można później dostosować,
// a chipy daty startu pokazują dzień tygodnia (śr., czw., ...).

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const noop = () => {};

// Bez showWelcome wizard startuje na kroku 2: 'Następny krok' -> 3, 'Dalej' -> 4.
const goToProtocolStep = () => {
  fireEvent.click(screen.getByRole('button', { name: /Następny krok|Next step/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej|Continue/ }));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('krok protokołu: nagłówek dni treningowych + notatka o elastyczności (T1)', () => {
  it('nagłówek pyta o dni TRENINGOWE, a notatka o późniejszej zmianie planu jest widoczna', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();
    expect(screen.getByText('Ile dni treningowych w tygodniu?')).toBeInTheDocument();
    expect(
      screen.getByText('Plan możesz później dostosować, a treningi przekładać na inne dni.'),
    ).toBeInTheDocument();
  });

  it('NIEZMIENNIK (zasada #5): wybór dni i przejście dalej działają jak dotąd', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();
    // Domyślnie 4 dni; przełączenie na 3 aktualizuje hint i odblokowuje Dalej.
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getByText('Wybrano 3/3 dni')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: /Dalej/ });
    expect(next).not.toBeDisabled();
    fireEvent.click(next);
    // Krok 5: karta rekomendowanego planu.
    expect(screen.getByRole('button', { name: /Podgląd planu/ })).toBeInTheDocument();
  });
});
