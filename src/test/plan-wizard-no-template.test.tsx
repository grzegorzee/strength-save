import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// T6: stan "brak planu dla tych odpowiedzi" (zasada 6: każdy stan ma wyjście).
// Od T6b katalog ma plan bez sprzętu dla początkujących, więc stan jest
// nieosiągalny na realnym katalogu; sztuczny katalog bez tpl-bodyweight-home-3
// pilnuje, że guard i wyjścia nadal działają.

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => <div data-testid="plan-builder-stub" /> }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/data/planTemplates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/planTemplates')>();
  return { ...actual, planTemplates: actual.planTemplates.filter((t) => t.id !== 'tpl-bodyweight-home-3') };
});

import { PlanWizard } from '@/components/PlanWizard';

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);
const cards = () => screen.getAllByTestId(/^plan-choice-(recommended|alternative)$/);
const goToStep3 = () => fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
const fromStep3ToStep5 = (days = 3) => {
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: String(days) }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('kreator: profil bez dozwolonego szablonu (sztuczny katalog)', () => {
  it('początkujący + masa ciała: brak planu = stan z wyjściem (zmień miejsce -> krok 3, własny plan -> builder)', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} />));
    goToStep3();
    fireEvent.click(screen.getByTestId('ob-equipment-bodyweight'));
    fromStep3ToStep5(3);
    expect(screen.getByTestId('ob-no-template')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-choice-recommended')).toBeNull();
    expect(screen.queryByTestId('ob-match-next')).toBeNull();

    fireEvent.click(screen.getByTestId('ob-no-template-equipment'));
    expect(screen.getByTestId('ob-equipment')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ob-equipment-dumbbells_home'));
    fromStep3ToStep5(3);
    expect(screen.queryByTestId('ob-no-template')).toBeNull();
    expect(cards().length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    fireEvent.click(screen.getByTestId('ob-equipment-bodyweight'));
    fromStep3ToStep5(3);
    fireEvent.click(screen.getByTestId('ob-no-template-own'));
    expect(screen.getByTestId('plan-builder-stub')).toBeInTheDocument();
  });
});
