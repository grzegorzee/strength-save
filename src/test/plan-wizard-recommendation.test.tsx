import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { getRecommendedPlan, planTemplates } from '@/data/planTemplates';
import { localizePlanName } from '@/lib/plan-i18n';

// X31 H2: krok 5 przy replanie (initial z trainingProfile) ma pokazywac szablon
// z liczba dni == daysPerWeek usera, a zmiana liczby dni w kroku 4 (powrot przez
// "Zmien ustawienia" / strzalka wstecz) ma przeliczyc rekomendacje i dni
// treningowe. X32: replan startuje od kroku 2 z zaznaczonym profilem (user
// potwierdza Dalej x3), startAtPrecision nie istnieje.
// Test SEKWENCJI, nie pojedynczego ekranu. Harness wg plan-wizard-browse.test.tsx.

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const PROFILE = { level: 'intermediate', objective: 'fat_loss', daysPerWeek: 3 } as const;
const planName = (objective: 'fat_loss', level: 'intermediate', days: number) => {
  const tpl = getRecommendedPlan(objective, level, days);
  return localizePlanName(tpl.id, tpl.name, 'pl');
};

// X33 WP-2: rekomendacja to karta "Polecany" (zamiast linii "polecamy plan").
const recommendedLine = () => screen.getByTestId('plan-choice-recommended').textContent ?? '';
// X34: linia odpowiedzi zniknela z 5A; liczba dni siedzi w naglowku.
const headingLine = () => screen.getByRole('heading', { level: 1 }).textContent;
const cardMetas = () => screen.getAllByTestId('plan-choice-meta').map((m) => m.textContent ?? '');
const cardNames = () => screen.getAllByTestId('plan-choice-name').map((n) => n.textContent ?? '');

// X32: krok 2 (poziom z initial) -> 3 (cel z initial) -> 4 (dni z initial) -> 5.
const confirmProfileToStep5 = () => {
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
};

// X34: krok 5A -> strzalka wstecz -> krok 4 (wybor dni) -> Dalej -> krok 5A.
const changeDaysViaBack = (days: number) => {
  fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
  fireEvent.click(screen.getByRole('button', { name: String(days) }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
};
// X34: zatwierdzenie z podgladem = 5A "Wybierz start planu" -> 6/6 "Podglad planu".
const previewFromStep5 = () => {
  fireEvent.click(screen.getByTestId('ob-match-next'));
  fireEvent.click(screen.getByTestId('ob-start-preview'));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('PlanWizard krok 5 przy replanie: dni z kroku 4 rzadza rekomendacja (X31 H2)', () => {
  it('REGRESJA (realne konto): initial {fat_loss, intermediate, 3} -> rekomendacja 3-dniowa + podsumowanie odpowiedzi', () => {
    render(withProviders(<PlanWizard initial={PROFILE} confirmLabelKey="newplan.toReview" onConfirm={() => {}} />));
    confirmProfileToStep5();

    expect(getRecommendedPlan('fat_loss', 'intermediate', 3).daysPerWeek).toBe(3);
    expect(recommendedLine()).toContain(planName('fat_loss', 'intermediate', 3));
    expect(recommendedLine()).not.toContain('Rzeźba i Kondycja');
    expect(headingLine()).toBe('Plany na 3 dni w tygodniu');
  });

  it('SEKWENCJA: zmiana dni 3 -> 4 w kroku 4 przelicza rekomendacje, powrot strzalka do kroku 4 i 4 -> 3 znow', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard initial={PROFILE} confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    confirmProfileToStep5();

    changeDaysViaBack(4);
    // fat_loss/4 = jedyny szablon redukcyjny (Lean Engine, 4 dni).
    expect(recommendedLine()).toContain('Rzeźba i Kondycja');
    expect(headingLine()).toBe('Plany na 4 dni w tygodniu');
    // X33 WP-2 (sekwencja c): po zmianie dni OBIE karty są przeliczone na 4 dni i różne.
    expect(cardMetas()).toHaveLength(2);
    for (const meta of cardMetas()) expect(meta).toContain('· 4 dni ·');
    expect(new Set(cardNames()).size).toBe(2);

    // Po przejsciu przez kroki strzalka wstecz z kroku 5 wraca do kroku 4 (nie wychodzi z kreatora).
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(screen.getByText('Ile dni treningowych w tygodniu?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    expect(recommendedLine()).toContain(planName('fat_loss', 'intermediate', 3));
    expect(headingLine()).toBe('Plany na 3 dni w tygodniu');
    for (const meta of cardMetas()) expect(meta).toContain('· 3 dni ·');
    expect(new Set(cardNames()).size).toBe(2);

    previewFromStep5();
    const choice = onConfirm.mock.calls[0][0];
    expect(choice.level).toBe('intermediate');
    expect(choice.objective).toBe('fat_loss');
    expect(choice.daysPerWeek).toBe(3);
    expect(choice.days).toHaveLength(3);
    expect(choice.trainingDays).toEqual(['monday', 'wednesday', 'friday']);
    expect(choice.templateId).toBe(getRecommendedPlan('fat_loss', 'intermediate', 3).id);
    expect(choice.recommendedTemplateId).toBe(choice.templateId);
    expect(choice.planSource).toBe('recommended');
  });

  it('X32 SEKWENCJA: zmiana dni przez strzalke wstecz przelicza pule Browse (tylko szablony o nowej liczbie dni)', () => {
    render(withProviders(<PlanWizard initial={PROFILE} confirmLabelKey="newplan.toReview" onConfirm={() => {}} />));
    confirmProfileToStep5();

    const browseCards = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.closest('button')!.textContent ?? '');
    fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));
    expect(browseCards().length).toBe(planTemplates.filter((t) => t.daysPerWeek === 3).length);
    for (const card of browseCards()) expect(card).toContain('3×');
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' })); // Browse -> krok 5

    changeDaysViaBack(4);
    fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));
    expect(browseCards().length).toBe(planTemplates.filter((t) => t.daysPerWeek === 4).length);
    for (const card of browseCards()) expect(card).toContain('4×');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Plany na 4 dni w tygodniu');
  });

  it('niezmiennik: bez initial (onboarding od zera) domyslne beginner / build_muscle / 4 dni', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} />));
    fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));

    const tpl = getRecommendedPlan('build_muscle', 'beginner', 4);
    expect(tpl.daysPerWeek).toBe(4);
    expect(recommendedLine()).toContain(localizePlanName(tpl.id, tpl.name, 'pl'));
    expect(headingLine()).toBe('Plany na 4 dni w tygodniu');
  });

  it('X32: replan z initial startuje na kroku 2 z zaznaczonym profilem; strzalka wstecz z kroku 2 wychodzi z kreatora (onExitBack)', () => {
    const onExitBack = vi.fn();
    render(withProviders(<PlanWizard initial={PROFILE} confirmLabelKey="newplan.toReview" onConfirm={() => {}} onExitBack={onExitBack} />));

    expect(screen.getByText('02 / 06')).toBeTruthy();
    expect(screen.getByText('Średnio zaawansowany').closest('button')!.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByTestId('plan-choice-recommended')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(onExitBack).toHaveBeenCalledTimes(1);
  });

  it('X32: strzalka wstecz z kroku 5 wraca do kroku 4 (nie wychodzi z kreatora)', () => {
    const onExitBack = vi.fn();
    render(withProviders(<PlanWizard initial={PROFILE} confirmLabelKey="newplan.toReview" onConfirm={() => {}} onExitBack={onExitBack} />));
    confirmProfileToStep5();

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(screen.getByText('Ile dni treningowych w tygodniu?')).toBeTruthy();
    expect(onExitBack).not.toHaveBeenCalled();
  });
});
