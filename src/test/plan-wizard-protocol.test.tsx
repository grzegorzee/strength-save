import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// PlanBuilder ciągnie firebase (custom exercises); tryb "own" nie jest tu testowany.
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
// WP-PLANS-1 dodał do PlanWizard PlanDurationPicker (PlanDaysEditor → ExercisePicker
// → lib/firebase) — realny init Auth wywala jsdom (pułapka transitive importu).
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanWizard } from '@/components/PlanWizard';

// T1 (feedback 2026-08-20): krok "Zatwierdź protokół" pyta o dni TRENINGOWE,
// notatka uspokaja, że plan można później dostosować. WP-PLANS-2 (X27): data
// startu przeniesiona z kroku 4 do kroku 5 (wybór z najbliższych poniedziałków)
// + edytowalna nazwa planu i kontrola tygodni w kroku 5.

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


// WP-PLANS-2 (X27, Task O3): data startu przeniesiona z kroku 4 do kroku 5;
// krok 5 zawiera też edytowalną nazwę planu i kontrolę liczby tygodni.
const goToStep5 = () => {
  goToProtocolStep();
  fireEvent.click(screen.getByRole('button', { name: /Dalej|Continue/ }));
};

const mondayOfWeek = (weeksAhead: number) => {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + weeksAhead * 7);
  return d;
};

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('krok 4 bez daty startu (WP-PLANS-2)', () => {
  it('sekcja "Data startu" zniknęła z kroku protokołu, dni treningowe zostały', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();
    expect(screen.getByText('Ile dni treningowych w tygodniu?')).toBeInTheDocument();
    expect(screen.queryByText('Data startu')).toBeNull();
    expect(screen.queryByText('Wybierz konkretną datę')).toBeNull();
  });
});

// X33 WP-3: nazwa / długość / start siedzą w zwiniętej linii ustawień; pola
// pojawiają się po "Zmień" (testid-y ob-plan-name, ob-start-week-chips,
// template-duration-picker zachowane).
const expandSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Zmień' }));

describe('krok 5: nazwa planu + start (poniedziałki) + tygodnie (WP-PLANS-2)', () => {
  it('pole nazwy ma default z rekomendacji, a wybór startu to 8 najbliższych poniedziałków', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5();
    expandSettings();

    const nameInput = screen.getByTestId('ob-plan-name') as HTMLInputElement;
    expect(nameInput.value.length).toBeGreaterThan(0);

    const chips = within(screen.getByTestId('ob-start-week-chips')).getAllByRole('button');
    expect(chips).toHaveLength(8);
    // Default = poniedziałek bieżącego tygodnia (stary flow bez zmian, Edge 8).
    expect(chips[0]).toHaveAttribute('aria-pressed', 'true');
    expect(chips[0].textContent).toContain(String(mondayOfWeek(0).getDate()));
  });

  it('zmiany nazwy, startu i tygodni trafiają do onConfirm (choice)', () => {
    const onConfirm = vi.fn();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5();
    expandSettings();

    fireEvent.change(screen.getByTestId('ob-plan-name'), { target: { value: '  Mój blok  ' } });
    const chips = within(screen.getByTestId('ob-start-week-chips')).getAllByRole('button');
    fireEvent.click(chips[2]);
    // X33 WP-3: kafel długości "16 tyg." (bez otwierania pickera "Inna").
    fireEvent.click(screen.getByRole('button', { name: /^16 tyg\./ }));
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));

    // X33 WP-4: drugi argument = { skipPreview: false } (ścieżka z podglądem).
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      planName: 'Mój blok',
      startDate: isoOf(mondayOfWeek(2)),
      durationWeeks: 16,
    }), { skipPreview: false });
  });

  it('pusta nazwa spada do nazwy rekomendowanego planu (Edge 4)', () => {
    const onConfirm = vi.fn();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5();
    expandSettings();

    const nameInput = screen.getByTestId('ob-plan-name') as HTMLInputElement;
    const defaultName = nameInput.value;
    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Podgląd planu/ }));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ planName: defaultName }), { skipPreview: false });
  });

  it('EN: etykiety sekcji startu i nazwy w języku apki', () => {
    localStorage.setItem('app-language', 'en');
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5();
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByText('Plan start')).toBeInTheDocument();
    expect(screen.getByTestId('ob-start-week-chips')).toBeInTheDocument();
  });
});

// X32 (zgłoszenie właściciela: "najpierw nazwa planu, dopiero potem 'przeglądaj
// plany' — dziwna kolejność") + X33 (sekcja 1 planu): krok 5A = nagłówek +
// odpowiedzi + "Zmień ustawienia", potem DWIE KARTY planów, "Ułóż własny plan",
// link biblioteki, zwinięta linia ustawień (po rozwinięciu: nazwa, długość,
// tydzień startu), na końcu główny CTA "Zaczynam ten plan" i drugorzędny podgląd.
describe('krok 5: kolejność bloków (X32 + X33)', () => {
  const precedes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('odpowiedzi -> karty -> Ułóż własny -> biblioteka -> ustawienia (nazwa, długość, start) -> Zaczynam -> Podgląd', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5();
    // Linia ustawień zwinięta domyślnie: bez pól do czasu "Zmień".
    expect(screen.queryByTestId('ob-plan-name')).toBeNull();
    expandSettings();

    const answers = screen.getByTestId('ob-precision-answers');
    const change = screen.getByRole('button', { name: /Zmień ustawienia/ });
    const cards = screen.getByTestId('ob-plan-choices');
    const own = screen.getByRole('button', { name: /Ułóż własny/ });
    const library = screen.getByRole('button', { name: /Biblioteka planów/ });
    const name = screen.getByTestId('ob-plan-name');
    const duration = screen.getByTestId('template-duration-picker');
    const startWeek = screen.getByTestId('ob-start-week-chips');
    const start = screen.getByRole('button', { name: /Zaczynam ten plan/ });
    const preview = screen.getByRole('button', { name: /Podgląd planu/ });

    expect(precedes(answers, change)).toBe(true);
    expect(precedes(change, cards)).toBe(true);
    expect(precedes(cards, own)).toBe(true);
    expect(precedes(own, library)).toBe(true);
    expect(precedes(library, name)).toBe(true);
    expect(precedes(name, duration)).toBe(true);
    expect(precedes(duration, startWeek)).toBe(true);
    expect(precedes(startWeek, start)).toBe(true);
    expect(precedes(start, preview)).toBe(true);
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
