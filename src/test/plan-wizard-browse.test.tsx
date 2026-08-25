import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { planTemplates } from '@/data/planTemplates';

// WP-O (X30): Browse plans posortowane wg dopasowania do odpowiedzi usera
// (scoreTemplates), najlepszy szablon dostaje badge "Polecany".
// Harness wg plan-wizard-protocol.test.tsx.

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanWizard } from '@/components/PlanWizard';

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const noop = () => {};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

// Bez showWelcome wizard startuje na kroku 2 (poziom). Wybieramy fat_loss + 3 dni:
// sortowanie po score widać gołym okiem (bez sortowania pierwszy byłby
// katalogowy tpl-fullbody-2). X31 H2: liczba dni to twardy priorytet, więc
// na górze ląduje 3-dniowy szablon (poziom domyślny beginner → tpl-strength-5x5),
// a nie 4-dniowy Lean Engine (fat_loss).
const goToBrowseAsFatLoss3Days = () => {
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ })); // krok 2 -> 3
  fireEvent.click(screen.getByText('Redukcja'));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ })); // krok 3 -> 4
  fireEvent.click(screen.getByRole('button', { name: '3' }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ })); // krok 4 -> 5
  fireEvent.click(screen.getByText('Przeglądaj plany'));
};

describe('Browse plans: sortowanie wg dopasowania + badge Polecany (WP-O)', () => {
  it('pierwsza karta to najlepsze dopasowanie i ma badge; reszta bez badge', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToBrowseAsFatLoss3Days();

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings[0].textContent).toBe('Siła Fundamentalna'); // tpl-strength-5x5 (PL): 3 dni, beginner
    expect(screen.getAllByTestId('browse-recommended-badge')).toHaveLength(1);
    expect(screen.getByTestId('browse-recommended-badge').textContent).toBe('Polecany');
  });

  it('X31 H2: badge Polecany siedzi na szablonie z liczbą dni == wybór usera (3), nie na 4-dniowym Lean Engine', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToBrowseAsFatLoss3Days();

    const badge = screen.getByTestId('browse-recommended-badge');
    const card = badge.closest('button')!;
    expect(card.textContent).toContain('3×');
    expect(card.textContent).not.toContain('Rzeźba i Kondycja');
  });

  it('niezmiennik: lista nadal pokazuje WSZYSTKIE szablony (sortowanie niczego nie chowa)', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToBrowseAsFatLoss3Days();

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(planTemplates.length);
  });
});
