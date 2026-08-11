import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// PlanBuilder ciągnie firebase (custom exercises); tryb "own" nie jest tu testowany.
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));

import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';

// Z231: krok Welcome onboardingu — checkbox zgód blokuje Dalej, imię trafia do choice.
// Z232: powrót z podglądu (resumeStep=5) NIE cofa na krok 1.

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const noop = () => {};

describe('PlanWizard Welcome (Z231)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  it('CTA Dalej jest zablokowane bez zgody, odblokowuje się po zaznaczeniu', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    const next = screen.getByRole('button', { name: /Dalej/ });
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByTestId('ob-legal-accept'));
    expect(next).not.toBeDisabled();
  });

  it('bez legalConsent (replan) checkbox nie istnieje, Dalej aktywne', () => {
    render(withProviders(
      <PlanWizard showWelcome confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.queryByTestId('ob-legal-accept')).toBeNull();
    expect(screen.getByRole('button', { name: /Dalej/ })).not.toBeDisabled();
  });

  it('imię z kroku 1 trafia do PlanWizardChoice.name', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />,
    ));
    fireEvent.change(screen.getByTestId('ob-name-input'), { target: { value: 'Grzesiek' } });
    fireEvent.click(screen.getByTestId('ob-legal-accept'));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));           // -> krok 2
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
