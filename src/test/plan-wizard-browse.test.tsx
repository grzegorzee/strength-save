import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { planTemplates } from '@/data/planTemplates';

// WP-O (X30): Browse plans posortowane wg dopasowania do odpowiedzi usera
// (scoreTemplates), najlepszy szablon dostaje badge "Polecany".
// X32 (zgloszenie wlasciciela: "wybralem 3 dni, a dostalem 4 dni w tygodniu"):
// krok 5 i Browse pokazuja WYLACZNIE szablony o liczbie dni z kroku 4,
// naglowek z liczba dni i licznikiem, kafel Czestotliwosc = wybor usera.
// Harness wg plan-wizard-protocol.test.tsx.

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';

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

// Bez showWelcome wizard startuje na kroku 2 (poziom). Wybieramy fat_loss + N dni.
const goToStep5AsFatLoss = (days: number) => {
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ })); // krok 2 -> 3
  fireEvent.click(screen.getByText('Redukcja'));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ })); // krok 3 -> 4
  fireEvent.click(screen.getByRole('button', { name: String(days) }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ })); // krok 4 -> 5
};
// X33 WP-2: wejście do biblioteki przez link "Biblioteka planów na {days} dni ({n})".
const openBrowse = () => fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));
const goToBrowseAsFatLoss3Days = () => { goToStep5AsFatLoss(3); openBrowse(); };

const cards = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.closest('button')!);
// X33 WP-2: kafel "Częstotliwość" zniknął; liczba dni z kroku 4 = linia odpowiedzi,
// a liczba dni szablonu = meta zaznaczonej karty ("{weeks} tyg. · {days} dni · ...").
const answersLine = () => screen.getByTestId('ob-precision-answers').textContent ?? '';
const selectedCardMeta = () => {
  const selected = screen.getAllByTestId(/^plan-choice-(recommended|second)$/).find((c) => c.getAttribute('aria-pressed') === 'true')!;
  return selected.querySelector('[data-testid="plan-choice-meta"]')!.textContent ?? '';
};
const countFor = (days: number) => planTemplates.filter((t) => t.daysPerWeek === days).length;

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
});

describe('Browse plans + krok 5: tylko szablony o liczbie dni z kroku 4 (X32)', () => {
  it('REGRESJA (zgloszenie wlasciciela): fat_loss / 3 dni -> zaznaczona karta 3-dniowa, link biblioteki z licznikiem, Browse tylko 3-dniowe', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5AsFatLoss(3);

    expect(answersLine()).toContain('3 dni w tygodniu');
    expect(selectedCardMeta()).toContain('· 3 dni ·');
    expect(screen.getByRole('button', { name: `Biblioteka planów na 3 dni (${countFor(3)})` })).toBeTruthy();
    expect(screen.queryByText(/Ten plan ma \d+ dni treningowych/)).toBeNull();

    openBrowse();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(`Plany na 3 dni w tygodniu (${countFor(3)})`);
    expect(screen.queryByTestId('browse-nearest-note')).toBeNull();
    const list = cards();
    expect(list).toHaveLength(countFor(3));
    for (const card of list) {
      expect(card.textContent).toContain('3×');
      expect(card.textContent).not.toContain('4×');
    }
    expect(screen.queryByText('Rzeźba i Kondycja')).toBeNull();
  });

  it('WŁASNOŚĆ: dla każdej liczby dni 2..6 każda karta w Browse ma tę liczbę dni, a licznik = liczba takich szablonów', () => {
    for (const days of [2, 3, 4, 5, 6]) {
      const view = render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
      goToStep5AsFatLoss(days);
      expect(selectedCardMeta(), `${days} dni`).toContain(`· ${days} dni ·`);
      openBrowse();
      const list = cards();
      expect(list, `${days} dni`).toHaveLength(countFor(days));
      for (const card of list) expect(card.textContent, `${days} dni`).toContain(`${days}×`);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(`Plany na ${days} dni w tygodniu (${countFor(days)})`);
      view.unmount();
    }
  });

  it('wybór z Browse zachowuje dni tygodnia z kroku 4 (ta sama liczba dni = bez resetu do domyślnych)', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    // Domyślnie pon/śr/pt; user przekłada piątek na sobotę ('P' = Pn i Pt, drugi to piątek).
    fireEvent.click(screen.getAllByRole('button', { name: 'P' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'S' }));
    expect(screen.getByText('Wybrano 3/3 dni')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));

    openBrowse();
    const list = cards();
    fireEvent.click(list[list.length - 1]);
    expect(selectedCardMeta()).toContain('· 3 dni ·');
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));

    const choice = onConfirm.mock.calls[0][0];
    expect(choice.daysPerWeek).toBe(3);
    expect(choice.trainingDays).toEqual(['monday', 'wednesday', 'saturday']);
    expect(choice.days.map((d) => d.weekday)).toEqual(['monday', 'wednesday', 'saturday']);
    expect(choice.planSource).toBe('browsed');
  });
});
