import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// PlanBuilder ciągnie firebase (custom exercises); tryb "own" nie jest tu testowany.
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
// WP-PLANS-1 dodał do PlanWizard PlanDurationPicker (PlanDaysEditor → ExercisePicker
// → lib/firebase) — realny init Auth wywala jsdom (pułapka transitive importu).
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
// X33 WP-8: kandydaci kolorow ze zdjecia mutowalni per test (bez canvasu w jsdom).
const deriveAccentCandidatesFromAvatar = vi.hoisted(() => vi.fn(async (): Promise<string[]> => []));
vi.mock('@/lib/avatar-accent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/avatar-accent')>();
  return { ...actual, deriveAccentCandidatesFromAvatar };
});

import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';
import { ACCENTS } from '@/lib/accent-theme';
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
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));           // -> krok 5A
    fireEvent.click(screen.getByTestId('ob-match-next'));                     // -> 6/6 (X34)
    fireEvent.click(screen.getByTestId('ob-start-preview'));
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

// Plan I (2026-08-20): wybór koloru aplikacji na Welcome przy pytaniu o imię.
// Warunki właściciela: bez osobnego kroku, tylko paleta (bez custom hex),
// live preview od kliknięcia (applyAccent + storeAccentId natychmiast).
describe('PlanWizard Welcome: wybór koloru (plan I)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    document.documentElement.style.cssText = '';
    delete document.documentElement.dataset.accent;
  });

  it('askName: rząd kropek palety pod polem imienia — 11 kolorów, bez custom, limonka zaznaczona', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.getAllByRole('radio')).toHaveLength(ACCENTS.length);
    for (const a of ACCENTS) expect(screen.getByTestId(`ob-accent-${a.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId('ob-accent-custom')).toBeNull();
    expect(screen.getByTestId('ob-accent-lime')).toHaveAttribute('aria-checked', 'true');
  });

  it('LIVE PREVIEW: klik kropki natychmiast przebarwia ekran i zapisuje localStorage', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    fireEvent.click(screen.getByTestId('ob-accent-indigo'));
    expect(document.documentElement.dataset.accent).toBe('indigo');
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('235 86% 65%');
    // Ciemny akcent od razu z jasnym tekstem na CTA (kontrast per luminancja).
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('0 0% 100%');
    expect(localStorage.getItem('ss-accent-color')).toBe('indigo');
    expect(screen.getByTestId('ob-accent-indigo')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('ob-accent-lime')).toHaveAttribute('aria-checked', 'false');
    // Powrót do limonki zdejmuje nadpisania (czyste tokeny).
    fireEvent.click(screen.getByTestId('ob-accent-lime'));
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
    expect(localStorage.getItem('ss-accent-color')).toBe('lime');
  });

  it('NIEZMIENNIK (zasada #5): onboarding bez dotknięcia kolorów wygląda i działa jak dotąd', async () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    // Zero nadpisań tokenów, limonka z index.css, brak zapisu do localStorage.
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
    expect(localStorage.getItem('ss-accent-color')).toBeNull();
    // Dalej działa jak dotąd (zgody odblokowują przejście na krok 2).
    tickRequired();
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    await screen.findByRole('button', { name: /Następny krok/ });
  });

  it('bez askName (replan/new-plan) kropek NIE ma', () => {
    render(withProviders(
      <PlanWizard showWelcome confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.queryByTestId('ob-accent-lime')).toBeNull();
    expect(screen.queryAllByRole('radio')).toEqual([]);
  });
});

// X33 WP-8: krok 1 z avatarem, "Czesc, {imie}" i kolorami ze zdjecia.
// Apple Sign-In nie daje zdjecia (photoURL ''), wiec wariant z inicjalami jest
// rownorzedny. Brak kandydatow (Apple, szare zdjecie, blad) = dzisiejszy widok.
describe('PlanWizard Welcome: avatar, imie i kolory ze zdjecia (X33 WP-8)', () => {
  const photoURL = 'https://lh3.example/avatar.jpg';
  const radioOrder = () => screen.getAllByRole('radio').map((el) => el.getAttribute('data-testid'));
  // Kandydaci przychodza asynchronicznie; testy synchroniczne domykaja obietnice w act().
  const flushCandidates = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  beforeEach(() => {
    vi.clearAllMocks();
    deriveAccentCandidatesFromAvatar.mockResolvedValue([]);
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    document.documentElement.style.cssText = '';
    delete document.documentElement.dataset.accent;
  });

  it('konto Google: zdjecie w kolku (alt pusty, nieprzeciagalne) obok "Czesc, Grzegorz"', async () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    await flushCandidates();
    const img = screen.getByTestId('ob-avatar-img');
    expect(img).toHaveAttribute('src', photoURL);
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('draggable', 'false');
    expect(screen.getByRole('heading', { name: 'Cześć, Grzegorz' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Witaj w Strength Save/ })).toBeNull();
    // Pole imienia i zgody nietkniete.
    expect(screen.getByTestId('ob-name-input')).toHaveValue('Grzegorz');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('konto Apple (bez zdjecia): inicjaly z imienia na tle akcentu, "Czesc, Anna"', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Anna" confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.queryByTestId('ob-avatar-img')).toBeNull();
    expect(screen.getByTestId('ob-avatar-initials')).toHaveTextContent('A');
    expect(screen.getByRole('heading', { name: 'Cześć, Anna' })).toBeInTheDocument();
    expect(deriveAccentCandidatesFromAvatar).not.toHaveBeenCalled();
  });

  it('blad ladowania zdjecia -> inicjaly', async () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    await flushCandidates();
    fireEvent.error(screen.getByTestId('ob-avatar-img'));
    expect(screen.queryByTestId('ob-avatar-img')).toBeNull();
    expect(screen.getByTestId('ob-avatar-initials')).toHaveTextContent('G');
  });

  it('bez imienia: dotychczasowy tytul; litera z e-maila w kolku; wpisanie imienia daje powitanie', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName accountEmail="kasia@example.com" confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.getByRole('heading', { name: /Witaj w Strength Save/ })).toBeInTheDocument();
    expect(screen.getByTestId('ob-avatar-initials')).toHaveTextContent('K');
    fireEvent.change(screen.getByTestId('ob-name-input'), { target: { value: 'Kasia' } });
    expect(screen.getByRole('heading', { name: 'Cześć, Kasia' })).toBeInTheDocument();
    expect(screen.getByTestId('ob-avatar-initials')).toHaveTextContent('K');
  });

  it('bez imienia i e-maila: ikona w kolku, tytul bez zmian', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.getByTestId('ob-avatar-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('ob-avatar-initials')).toBeNull();
    expect(screen.getByRole('heading', { name: /Witaj w Strength Save/ })).toBeInTheDocument();
  });

  it('prywatność: zdjęcie nie jest analizowane przed jawnym kliknięciem usera', async () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    await Promise.resolve();
    expect(deriveAccentCandidatesFromAvatar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Dopasuj kolory ze zdjęcia/i }));
    await waitFor(() => expect(deriveAccentCandidatesFromAvatar).toHaveBeenCalledWith(photoURL));
  });

  it('kandydaci ze zdjecia jako PIERWSZE kropki z etykieta, reszta palety bez duplikatow, pierwszy preselekcjonowany', async () => {
    deriveAccentCandidatesFromAvatar.mockResolvedValue(['rose', 'sky']);
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    fireEvent.click(screen.getByRole('button', { name: /Dopasuj kolory ze zdjęcia/i }));
    await waitFor(() => expect(screen.getByTestId('ob-accent-from-photo')).toBeInTheDocument());
    expect(deriveAccentCandidatesFromAvatar).toHaveBeenCalledWith(photoURL);
    const expected = ['ob-accent-rose', 'ob-accent-sky', ...ACCENTS.filter((a) => a.id !== 'rose' && a.id !== 'sky').map((a) => `ob-accent-${a.id}`)];
    expect(radioOrder()).toEqual(expected);
    expect(screen.getAllByRole('radio')).toHaveLength(ACCENTS.length);
    // Analiza tylko proponuje; zapis następuje dopiero po świadomym wyborze.
    expect(screen.getByTestId('ob-accent-lime')).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('ss-accent-color')).toBeNull();
    fireEvent.click(screen.getByTestId('ob-accent-rose'));
    expect(localStorage.getItem('ss-accent-color')).toBe('rose');
  });

  it('wczesniejszy wybor (localStorage): kandydaci widoczni, ale automat NIE nadpisuje wyboru', async () => {
    localStorage.setItem('ss-accent-color', 'indigo');
    deriveAccentCandidatesFromAvatar.mockResolvedValue(['rose']);
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    fireEvent.click(screen.getByRole('button', { name: /Dopasuj kolory ze zdjęcia/i }));
    await waitFor(() => expect(screen.getByTestId('ob-accent-from-photo')).toBeInTheDocument());
    expect(radioOrder()[0]).toBe('ob-accent-rose');
    expect(screen.getByTestId('ob-accent-indigo')).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('ss-accent-color')).toBe('indigo');
  });

  it('brak kandydatow (szare zdjecie / blad): dokladnie dzisiejsza kolejnosc palety, bez etykiety, limonka', async () => {
    deriveAccentCandidatesFromAvatar.mockResolvedValue([]);
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    fireEvent.click(screen.getByRole('button', { name: /Dopasuj kolory ze zdjęcia/i }));
    await waitFor(() => expect(deriveAccentCandidatesFromAvatar).toHaveBeenCalled());
    expect(screen.queryByTestId('ob-accent-from-photo')).toBeNull();
    expect(radioOrder()).toEqual(ACCENTS.map((a) => `ob-accent-${a.id}`));
    expect(screen.getByTestId('ob-accent-lime')).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('ss-accent-color')).toBeNull();
  });

  it('bez askName (replan) ani avatara, ani powitania nie ma', () => {
    render(withProviders(
      <PlanWizard showWelcome initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.queryByTestId('ob-avatar')).toBeNull();
    expect(screen.getByRole('heading', { name: /Witaj w Strength Save/ })).toBeInTheDocument();
    expect(deriveAccentCandidatesFromAvatar).not.toHaveBeenCalled();
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
    // Krok 5A, nie Welcome: widać kartę planu i CTA "Wybierz start planu" (X34).
    expect(screen.queryByRole('heading', { name: /Witaj w Strength Save/ })).toBeNull();
    expect(screen.getByTestId('plan-choice-recommended')).toBeInTheDocument();
    expect(screen.getByTestId('ob-match-next')).toBeInTheDocument();
  });

  it('bez resumeStep showWelcome nadal startuje od kroku 1 (stary przepływ nietknięty)', () => {
    render(withProviders(
      <PlanWizard showWelcome confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.getByRole('heading', { name: /Witaj w Strength Save/ })).toBeInTheDocument();
  });
});
