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

// Oczekiwane etykiety liczone TYM SAMYM algorytmem co komponent (Intl na żywej
// dacie) — bez fake timers, żeby nie kolidować z waitFor.
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

describe('chipy daty startu z dniem tygodnia (T2)', () => {
  it('PL: chip dzisiejszy = Dziś, jutrzejszy = dzień tygodnia z pl-PL, miesiąc w mini-linii', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();
    expect(screen.getByText('Dziś')).toBeInTheDocument();
    const tomorrowWd = plusDays(1).toLocaleDateString('pl-PL', { weekday: 'short' });
    expect(screen.getByText(tomorrowWd)).toBeInTheDocument();
    // Miesiąc nie ginie: mini-linia miesiąca w chipach (dziś ma go zawsze).
    const monthShort = plusDays(0).toLocaleDateString('pl-PL', { month: 'short' });
    expect(screen.getAllByText(monthShort).length).toBeGreaterThan(0);
  });

  it('PL: linia podglądu startu zawiera dzień tygodnia wybranej daty', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();
    const selectedTxt = plusDays(0).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
    expect(screen.getByText((txt) => txt.includes(`Wybrano ${selectedTxt}`))).toBeInTheDocument();
  });

  it('NIEZMIENNIK (zasada #5): klik chipa nadal zmienia datę startu (podgląd podąża)', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();
    const tomorrow = plusDays(1);
    fireEvent.click(screen.getByText(tomorrow.toLocaleDateString('pl-PL', { weekday: 'short' })));
    const selectedTxt = tomorrow.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
    expect(screen.getByText((txt) => txt.includes(`Wybrano ${selectedTxt}`))).toBeInTheDocument();
  });

  it('EN: dzień tygodnia w chipie podąża za językiem apki (en-US), nie systemem', () => {
    localStorage.setItem('app-language', 'en');
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();
    expect(screen.getByText('Today')).toBeInTheDocument();
    const tomorrowWd = plusDays(1).toLocaleDateString('en-US', { weekday: 'short' });
    expect(screen.getByText(tomorrowWd)).toBeInTheDocument();
  });
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
