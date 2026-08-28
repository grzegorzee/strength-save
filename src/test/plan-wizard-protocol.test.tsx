import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// PlanBuilder ciągnie firebase (custom exercises); tryb "own" nie jest tu testowany.
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => <div data-testid="plan-builder" /> }));
// WP-PLANS-1 dodał do PlanWizard PlanDurationPicker (PlanDaysEditor → ExercisePicker
// → lib/firebase) — realny init Auth wywala jsdom (pułapka transitive importu).
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanWizard } from '@/components/PlanWizard';
import type { OnboardingDraftV1 } from '@/lib/onboarding-draft';

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

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// X34b: poniedzialek tygodnia daty ISO (plan zakotwiczony w poniedzialku).
const mondayOf = (iso: string) => {
  const [y, m, day] = iso.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return isoOf(d);
};
const chips = () => within(screen.getByTestId('ob-first-workout-chips')).getAllByRole('button');

describe('krok 4 bez daty startu (WP-PLANS-2)', () => {
  it('przywraca krok i odpowiedzi z bezpiecznego szkicu po restarcie WKWebView', () => {
    const draft: OnboardingDraftV1 = {
      version: 1,
      updatedAt: Date.now(),
      phase: 'wizard',
      wizardStep: 4,
      level: 'advanced',
      objective: 'peak_strength',
      daysPerWeek: 3,
      trainingDays: ['tuesday', 'thursday', 'saturday'],
    };

    render(withProviders(
      <PlanWizard
        showWelcome
        legalConsent
        legalConsentAlreadyRecorded
        initialDraft={draft}
        confirmLabelKey="newplan.toReview"
        onConfirm={noop}
      />,
    ));

    expect(screen.getByText('Ile dni treningowych w tygodniu?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Wtorek' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Poniedziałek' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('consent-terms')).toBeNull();
  });

  it('nie zamienia szkicu własnego planu na rekomendowany po restarcie', () => {
    const draft: OnboardingDraftV1 = {
      version: 1,
      updatedAt: Date.now(),
      phase: 'wizard',
      wizardStep: 6,
      level: 'intermediate',
      objective: 'build_muscle',
      daysPerWeek: 3,
      trainingDays: ['monday', 'wednesday', 'friday'],
      planSource: 'custom',
    };

    render(withProviders(
      <PlanWizard
        showWelcome
        legalConsent
        legalConsentAlreadyRecorded
        initialDraft={draft}
        confirmLabelKey="newplan.toReview"
        onConfirm={noop}
      />,
    ));

    expect(screen.getByTestId('plan-builder')).toBeInTheDocument();
    expect(screen.queryByTestId('ob-start-preview')).toBeNull();
  });

  it('sekcja "Data startu" zniknęła z kroku protokołu, dni treningowe zostały', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();
    expect(screen.getByText('Ile dni treningowych w tygodniu?')).toBeInTheDocument();
    expect(screen.queryByText('Data startu')).toBeNull();
    expect(screen.queryByText('Wybierz konkretną datę')).toBeNull();
  });

  it('siedem dni mieści się w siatce na telefonie 320 px bez poziomego ucięcia', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();
    const monday = screen.getByRole('button', { name: 'Poniedziałek' });
    expect(monday.parentElement).toHaveClass('grid', 'grid-cols-4');
    expect(monday).toHaveClass('w-full', 'min-w-0');
  });
});

// X34 / X34b: data pierwszego treningu / długość / nazwa żyją na ekranie 6/6
// "Start planu" (po CTA "Wybierz start planu" w 5A); testid-y
// ob-first-workout-chips, ob-duration-tiles, ob-plan-name.
const goToStep6 = () => { goToStep5(); fireEvent.click(screen.getByTestId('ob-match-next')); };

describe('ekran 6/6: data pierwszego treningu + tygodnie + nazwa planu (WP-PLANS-2, X34, X34b)', () => {
  it('pole nazwy ma default z rekomendacji, a wybór startu to 8 najbliższych dni treningowych (pierwszy zaznaczony)', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep6();

    const nameInput = screen.getByTestId('ob-plan-name') as HTMLInputElement;
    expect(nameInput.value.length).toBeGreaterThan(0);

    expect(chips()).toHaveLength(8);
    expect(chips()[0]).toHaveAttribute('aria-pressed', 'true');
    const first = chips()[0].getAttribute('data-date')!;
    expect(first >= isoOf(new Date())).toBe(true);
    expect(chips()[0].textContent).toContain(String(Number(first.slice(8, 10))));
  });

  it('zmiany nazwy, daty pierwszego treningu i tygodni trafiają do onConfirm (choice); startDate = poniedziałek tygodnia wyboru', () => {
    const onConfirm = vi.fn();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep6();

    fireEvent.change(screen.getByTestId('ob-plan-name'), { target: { value: '  Mój blok  ' } });
    fireEvent.click(chips()[2]);
    const picked = chips()[2].getAttribute('data-date')!;
    // X33 WP-3: kafel długości "16 tyg." (bez otwierania pickera "Inna").
    fireEvent.click(screen.getByRole('button', { name: /^16 tyg\./ }));
    fireEvent.click(screen.getByTestId('ob-start-preview'));

    // X33 WP-4: drugi argument = { skipPreview: false } (ścieżka z podglądem).
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      planName: 'Mój blok',
      firstWorkoutDate: picked,
      startDate: mondayOf(picked),
      durationWeeks: 16,
    }), { skipPreview: false });
  });

  it('pusta nazwa spada do nazwy rekomendowanego planu (Edge 4)', () => {
    const onConfirm = vi.fn();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep6();

    const nameInput = screen.getByTestId('ob-plan-name') as HTMLInputElement;
    const defaultName = nameInput.value;
    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('ob-start-preview'));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ planName: defaultName }), { skipPreview: false });
  });

  it('EN: etykiety sekcji startu i nazwy w języku apki', () => {
    localStorage.setItem('app-language', 'en');
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5();
    fireEvent.click(screen.getByRole('button', { name: 'Choose plan start' }));
    expect(screen.getByText('First workout date')).toBeInTheDocument();
    expect(screen.getByText('Plan name')).toBeInTheDocument();
    expect(screen.getByTestId('ob-first-workout-chips')).toBeInTheDocument();
  });
});

// X32 (zgłoszenie właściciela: "najpierw nazwa planu, dopiero potem 'przeglądaj
// plany' — dziwna kolejność") + X33 + X34 + X34b: krok 5A = nagłówek, DWIE KARTY
// planów, "Ułóż własny plan", link biblioteki, jedno CTA "Wybierz start planu";
// ekran 6/6 = data pierwszego treningu, długość, nazwa, CTA celu, "Podgląd planu".
describe('krok 5A i ekran 6/6: kolejność bloków (X32 + X33 + X34 + X34b)', () => {
  const precedes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('5A: karty -> Ułóż własny -> biblioteka -> Wybierz start planu; 6/6: pierwszy trening -> długość -> nazwa -> CTA -> Podgląd', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5();
    // 5A bez pól ustawień.
    expect(screen.queryByTestId('ob-plan-name')).toBeNull();

    const cards = screen.getByTestId('ob-plan-choices');
    const own = screen.getByRole('button', { name: /Ułóż własny/ });
    const library = screen.getByRole('button', { name: /Biblioteka planów/ });
    const next = screen.getByTestId('ob-match-next');
    expect(precedes(cards, own)).toBe(true);
    expect(precedes(own, library)).toBe(true);
    expect(precedes(library, next)).toBe(true);

    fireEvent.click(next);
    const name = screen.getByTestId('ob-plan-name');
    const duration = screen.getByTestId('ob-duration-tiles');
    const firstWorkout = screen.getByTestId('ob-first-workout-chips');
    const start = screen.getByTestId('ob-start-cta');
    const preview = screen.getByTestId('ob-start-preview');
    expect(precedes(firstWorkout, duration)).toBe(true);
    expect(precedes(duration, name)).toBe(true);
    expect(precedes(name, start)).toBe(true);
    expect(precedes(start, preview)).toBe(true);
  });
});

describe('krok protokołu: nagłówek dni treningowych + notatka o elastyczności (T1)', () => {
  it('VoiceOver/TalkBack dostaje pełne nazwy i stan wyboru częstotliwości oraz dni', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToProtocolStep();

    const frequency = screen.getByRole('button', { name: '4' });
    expect(frequency).toHaveAttribute('aria-pressed', 'true');

    const monday = screen.getByRole('button', { name: 'Poniedziałek' });
    const tuesday = screen.getByRole('button', { name: 'Wtorek' });
    expect(monday).toHaveAttribute('aria-pressed', 'true');
    expect(tuesday).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(tuesday);
    expect(tuesday).toHaveAttribute('aria-pressed', 'false');
  });

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
    // Krok 5A: karta rekomendowanego planu + CTA do ekranu 6/6.
    expect(screen.getByTestId('plan-choice-recommended')).toBeInTheDocument();
    expect(screen.getByTestId('ob-match-next')).toBeInTheDocument();
  });
});
