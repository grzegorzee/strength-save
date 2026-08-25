import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// X32, galaz pustej puli: katalog bez szablonu o liczbie dni z kroku 4 (dzis
// niemozliwe, katalog pokrywa 2..6) = krok 5 i Browse pokazuja szablony o +-1
// dnia z JAWNA etykieta "brak planu na X dni, pokazujemy najblizsze", zamiast
// pustego ekranu albo cichej podmiany. Sztuczny katalog: realny bez 3-dniowych.

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/data/planTemplates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/planTemplates')>();
  return { ...actual, planTemplates: actual.planTemplates.filter((t) => t.daysPerWeek !== 3) };
});

import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';
import { planTemplates } from '@/data/planTemplates';

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const goToStep5With3Days = () => {
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: '3' }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('Browse plans: pusta pula dla wybranej liczby dni (X32)', () => {
  it('sztuczny katalog bez 3-dniowych: Browse pokazuje szablony o 2 i 4 dniach z jawna etykieta', () => {
    expect(planTemplates.some((t) => t.daysPerWeek === 3)).toBe(false);
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} />));
    goToStep5With3Days();

    // Krok 5: rekomendacja o innej liczbie dni jest jawnie oznaczona (ostrzezenie daysMismatch).
    expect(screen.getByText(/Ten plan ma \d+ dni treningowych, wybrałeś 3/)).toBeTruthy();

    const expectedCount = planTemplates.filter((t) => t.daysPerWeek === 2 || t.daysPerWeek === 4).length;
    // X33 WP-2: link biblioteki z licznikiem puli (zastępczej) zamiast "Przeglądaj plany (n)".
    fireEvent.click(screen.getByRole('button', { name: `Biblioteka planów na 3 dni (${expectedCount})` }));
    expect(screen.getByTestId('browse-nearest-note').textContent).toBe('Brak planu na 3 dni w tygodniu, pokazujemy najbliższe.');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(`Najbliższe plany (${expectedCount})`);
    const cards = screen.getAllByRole('heading', { level: 3 }).map((h) => h.closest('button')!);
    expect(cards).toHaveLength(expectedCount);
    for (const card of cards) expect(card.textContent).toMatch(/(2|4)×/);
    expect(screen.getAllByTestId('browse-recommended-badge')).toHaveLength(1);
  });

  it('wybor szablonu z najblizszych przestawia liczbe dni na jego liczbe (spojny stan: kafel = szablon, bez ostrzezenia)', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5With3Days();
    fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));
    const fourDay = screen.getAllByRole('heading', { level: 3 }).map((h) => h.closest('button')!).find((c) => c.textContent?.includes('4×'))!;
    fireEvent.click(fourDay);

    // X33 WP-2: kafel Czestotliwosc zniknal; spojnosc = zaznaczona karta ma 4 dni i brak ostrzezenia.
    const selected = screen.getAllByTestId(/^plan-choice-(recommended|second)$/).find((c) => c.getAttribute('aria-pressed') === 'true')!;
    expect(selected.querySelector('[data-testid="plan-choice-meta"]')!.textContent).toContain('· 4 dni ·');
    expect(screen.queryByText(/Ten plan ma \d+ dni treningowych/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));
    const choice = onConfirm.mock.calls[0][0];
    expect(choice.daysPerWeek).toBe(4);
    expect(choice.days).toHaveLength(4);
  });
});
