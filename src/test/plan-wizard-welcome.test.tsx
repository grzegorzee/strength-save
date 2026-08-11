import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// PlanBuilder ciągnie firebase (custom exercises); tryb "own" nie jest tu testowany.
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));

import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';
import type { ConsentSelection } from '@/lib/consent-selection';

// Z231: krok Welcome onboardingu — zgody blokują Dalej, imię trafia do choice.
// Pakiet prawny v2: JEDEN zbiorczy checkbox był niezgodny z RODO — teraz 3
// obowiązkowe oświadczenia (regulamin+wiek, privacy, zdrowie art. 9) i
// opcjonalny marketing; przejście kroku 1 zapisuje zgody przez onLegalConsent.
// Z232: powrót z podglądu (resumeStep=5) NIE cofa na krok 1.

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const noop = () => {};

const tickRequired = () => {
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('consent-health'));
};

describe('PlanWizard Welcome (Z231 + pakiet prawny v2)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  it('CTA Dalej zablokowane, dopóki 3 obowiązkowe zgody nie są zaznaczone; onboarding ma DOKŁADNIE 3 checkboxy (marketing na osobnym kroku)', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    const next = screen.getByRole('button', { name: /Dalej/ });
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByTestId('consent-terms'));
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByTestId('consent-privacy'));
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByTestId('consent-health'));
    expect(next).not.toBeDisabled();
    // Krok 9 (spec 2026-08-11): checkbox marketingowy zszedł z Welcome na
    // dedykowany krok onboardingu — na ekranie zgód są DOKŁADNIE 3 pola.
    expect(screen.queryByTestId('consent-marketing')).toBeNull();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('przejście kroku 1 wywołuje onLegalConsent z zaznaczonym wyborem (marketing zawsze false)', async () => {
    const onLegalConsent = vi.fn(async (_selection: ConsentSelection) => {});
    render(withProviders(
      <PlanWizard showWelcome legalConsent onLegalConsent={onLegalConsent} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    tickRequired();
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    await waitFor(() => expect(onLegalConsent).toHaveBeenCalledTimes(1));
    expect(onLegalConsent.mock.calls[0][0]).toEqual({ terms: true, privacy: true, health: true, marketing: false });
  });

  it('odrzucenie onLegalConsent zatrzymuje przejście i pokazuje błąd', async () => {
    const onLegalConsent = vi.fn(async () => { throw new Error('offline'); });
    render(withProviders(
      <PlanWizard showWelcome legalConsent onLegalConsent={onLegalConsent} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    tickRequired();
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    await waitFor(() => expect(screen.getByTestId('consent-error')).toBeInTheDocument());
    // nadal krok 1 (nagłówek Welcome widoczny)
    expect(screen.getByRole('heading', { name: /Witaj w Strength Save/ })).toBeInTheDocument();
  });

  it('bez legalConsent (replan) checkboxy nie istnieją, Dalej aktywne', () => {
    render(withProviders(
      <PlanWizard showWelcome confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.queryByTestId('consent-terms')).toBeNull();
    expect(screen.getByRole('button', { name: /Dalej/ })).not.toBeDisabled();
  });

  it('imię z kroku 1 trafia do PlanWizardChoice.name', async () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />,
    ));
    fireEvent.change(screen.getByTestId('ob-name-input'), { target: { value: 'Grzesiek' } });
    tickRequired();
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));           // -> krok 2
    await screen.findByRole('button', { name: /Następny krok/ });
    fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));   // -> krok 3
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));           // -> krok 4
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));           // -> krok 5
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0].name).toBe('Grzesiek');
  });

  it('tytuł kroku 1 to Witaj w Strength Save', () => {
    render(withProviders(
      <PlanWizard showWelcome confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.getByRole('heading', { name: /Witaj w Strength Save/ })).toBeInTheDocument();
  });
});

describe('PlanWizard resumeStep (Z232)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  it('resumeStep=5 startuje na kroku 5 mimo showWelcome (powrót z podglądu)', () => {
    const resume: PlanWizardChoice = {
      days: [],
      durationWeeks: 10,
      startDate: '2026-08-11',
      level: 'beginner',
      objective: 'build_muscle',
      daysPerWeek: 4,
      templateId: 'tpl-upper-lower-4',
      name: 'Grzegorz',
    };
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName resume={resume} resumeStep={5} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    // Krok 5, nie Welcome: widać kartę planu i CTA podglądu.
    expect(screen.queryByRole('heading', { name: /Witaj w Strength Save/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Podgląd planu/ })).toBeInTheDocument();
  });

  it('bez resumeStep showWelcome nadal startuje od kroku 1 (stary przepływ nietknięty)', () => {
    render(withProviders(
      <PlanWizard showWelcome confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.getByRole('heading', { name: /Witaj w Strength Save/ })).toBeInTheDocument();
  });
});
