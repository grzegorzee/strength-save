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
import { PALETTE_THEMES, readStoredPaletteTheme } from '@/lib/palette-theme';
import type { ConsentSelection } from '@/lib/consent-selection';

// Z231: krok Welcome onboardingu — zgody blokują Dalej, imię trafia do choice.
// Pakiet prawny v2: JEDEN zbiorczy checkbox był niezgodny z RODO — teraz 3
// wymagane regulamin+privacy, dobrowolne zdrowie art. 9 i opcjonalny marketing;
// przejście kroku 1 zapisuje decyzje przez onLegalConsent.
// Z232: powrót z podglądu (resumeStep=5) NIE cofa na krok 1.

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const noop = () => {};

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const tickRequired = () => {
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('consent-health'));
};

const openLegalView = () => fireEvent.click(screen.getByTestId('ob-personalization-next'));
const openCustomColors = () => fireEvent.click(screen.getByTestId('ob-custom-colors-toggle'));
const acceptLegalView = () => {
  openLegalView();
  tickRequired();
  fireEvent.click(screen.getByTestId('ob-legal-submit'));
};

describe('PlanWizard Welcome (Z231 + pakiet prawny v2)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  it('najpierw pokazuje lekką personalizację bez checkboxów, a zgody na osobnym podwidoku 01/06', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.getByTestId('ob-name-input')).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('01 / 06');

    openLegalView();
    expect(screen.getByRole('heading', { name: /Zanim zaczniesz/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('01 / 06');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    const next = screen.getByTestId('ob-legal-submit');
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByTestId('consent-terms'));
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByTestId('consent-privacy'));
    expect(next).not.toBeDisabled();
    expect(screen.getByTestId('consent-health')).not.toBeChecked();
    // Krok 9 (spec 2026-08-11): checkbox marketingowy zszedł z Welcome na
    // dedykowany krok onboardingu — na ekranie zgód są DOKŁADNIE 3 pola.
    expect(screen.queryByTestId('consent-marketing')).toBeNull();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('pozwala wejść do trybu podstawowego bez zgody zdrowotnej', async () => {
    const onLegalConsent = vi.fn(async (_selection: ConsentSelection) => {});
    render(withProviders(
      <PlanWizard showWelcome legalConsent onLegalConsent={onLegalConsent} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    openLegalView();
    fireEvent.click(screen.getByTestId('consent-terms'));
    fireEvent.click(screen.getByTestId('consent-privacy'));
    fireEvent.click(screen.getByTestId('ob-legal-submit'));
    await waitFor(() => expect(onLegalConsent).toHaveBeenCalledTimes(1));
    expect(onLegalConsent.mock.calls[0]?.[0]).toEqual({ terms: true, privacy: true, health: false, marketing: false });
    expect(await screen.findByRole('button', { name: /Następny krok/ })).toBeInTheDocument();
  });

  it('przejście kroku 1 wywołuje onLegalConsent z zaznaczonym wyborem (marketing zawsze false)', async () => {
    const onLegalConsent = vi.fn(async (_selection: ConsentSelection) => {});
    render(withProviders(
      <PlanWizard showWelcome legalConsent onLegalConsent={onLegalConsent} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    openLegalView();
    expect(onLegalConsent).not.toHaveBeenCalled();
    tickRequired();
    fireEvent.click(screen.getByTestId('ob-legal-submit'));
    await waitFor(() => expect(onLegalConsent).toHaveBeenCalledTimes(1));
    expect(onLegalConsent.mock.calls[0][0]).toEqual({ terms: true, privacy: true, health: true, marketing: false });
  });

  it('odrzucenie onLegalConsent zatrzymuje przejście i pokazuje błąd', async () => {
    const onLegalConsent = vi.fn(async () => { throw new Error('offline'); });
    render(withProviders(
      <PlanWizard showWelcome legalConsent onLegalConsent={onLegalConsent} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    openLegalView();
    tickRequired();
    fireEvent.click(screen.getByTestId('ob-legal-submit'));
    await waitFor(() => expect(screen.getByTestId('consent-error')).toBeInTheDocument());
    expect(screen.getByTestId('consent-error')).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('consent-error')).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByRole('heading', { name: /Zanim zaczniesz/ })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ob-legal-submit'));
    await waitFor(() => expect(onLegalConsent).toHaveBeenCalledTimes(2));
  });

  it('podczas zapisu zgód blokuje wizualne Wstecz i jednoznacznie opisuje loading', async () => {
    const saving = deferred<void>();
    const onLegalConsent = vi.fn(() => saving.promise);
    render(withProviders(
      <PlanWizard showWelcome legalConsent onLegalConsent={onLegalConsent} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    openLegalView();
    tickRequired();
    fireEvent.click(screen.getByTestId('ob-legal-submit'));

    const submit = screen.getByTestId('ob-legal-submit');
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(submit).toHaveAccessibleName('Zapisywanie zgód');
    const back = screen.getByRole('button', { name: 'Wstecz' });
    expect(back).toBeDisabled();
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    fireEvent.click(screen.getByTestId('consent-health'));
    expect(screen.getByTestId('consent-health')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(back);
    expect(screen.getByRole('heading', { name: /Zanim zaczniesz/ })).toBeInTheDocument();

    await act(async () => { saving.resolve(); await saving.promise; });
    expect(await screen.findByRole('button', { name: /Następny krok/ })).toBeInTheDocument();
  });

  it('Wstecz z formalności wraca do personalizacji i zachowuje imię', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Ola" confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    fireEvent.change(screen.getByTestId('ob-name-input'), { target: { value: 'Aleksandra' } });
    openLegalView();
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(screen.getByTestId('ob-name-input')).toHaveValue('Aleksandra');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('aktualny serwerowy mirror zgód omija formalności i przechodzi bezpośrednio do 02/06', async () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent legalConsentAlreadyRecorded confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    fireEvent.click(screen.getByTestId('ob-personalization-next'));
    expect(await screen.findByRole('button', { name: /Następny krok/ })).toBeInTheDocument();
    expect(screen.queryByTestId('ob-legal-submit')).toBeNull();
  });

  it('bez legalConsent (replan) checkboxy nie istnieją, Dalej aktywne', () => {
    render(withProviders(
      <PlanWizard showWelcome confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.queryByTestId('consent-terms')).toBeNull();
    expect(screen.getByTestId('ob-personalization-next')).not.toBeDisabled();
  });

  it('imię z kroku 1 trafia do PlanWizardChoice.name', async () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />,
    ));
    fireEvent.change(screen.getByTestId('ob-name-input'), { target: { value: 'Grzesiek' } });
    acceptLegalView();                                                       // -> krok 2
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

  it('nie pokazuje niezweryfikowanego social proof 12K+', () => {
    render(withProviders(
      <PlanWizard showWelcome socialProof confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.queryByText(/12K\+/i)).toBeNull();
  });

  it('trial notice nie obiecuje stałej długości, której nie podał sklep', () => {
    render(withProviders(
      <PlanWizard showWelcome trialNotice confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    const notice = screen.getByText(/opcje subskrypcji/i);
    expect(notice).not.toHaveTextContent(/\d+\s*(dni|days)/i);
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

  it('askName: pokazuje trzy palety, a 11 kolorów dodatkowych dopiero na żądanie', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.getAllByRole('radio')).toHaveLength(PALETTE_THEMES.length);
    expect(screen.queryByTestId('ob-accent-lime')).toBeNull();
    expect(screen.getByTestId('ob-custom-colors-toggle')).toHaveAttribute('aria-expanded', 'false');
    openCustomColors();
    expect(screen.getAllByRole('radio')).toHaveLength(ACCENTS.length + PALETTE_THEMES.length);
    for (const a of ACCENTS) expect(screen.getByTestId(`ob-accent-${a.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId('ob-accent-custom')).toBeNull();
    expect(screen.getByRole('radio', { name: /Pulse/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('ob-accent-lime')).toHaveAttribute('aria-checked', 'false');
  });

  it('gotowa paleta zapisuje się jednym tapnięciem, a legacy nadal można wybrać', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    fireEvent.click(screen.getByRole('radio', { name: /Forge/ }));
    expect(readStoredPaletteTheme()?.id).toBe('forge');
    expect(document.documentElement.dataset.palette).toBe('forge');

    openCustomColors();
    fireEvent.click(screen.getByTestId('ob-accent-indigo'));
    expect(readStoredPaletteTheme()).toBeNull();
    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(document.documentElement.dataset.accent).toBe('indigo');
  });

  it('kompaktowa paleta zapisuje się jednym tapnięciem i nie znika po Dalej', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    expect(screen.getByText('Wybierz paletę jednym tapnięciem. Możesz zmienić ją później w Profilu.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Forge/ }));
    expect(readStoredPaletteTheme()?.id).toBe('forge');
    expect(screen.queryByTestId('palette-preview-actions')).toBeNull();

    fireEvent.click(screen.getByTestId('ob-personalization-next'));
    expect(readStoredPaletteTheme()?.id).toBe('forge');
    expect(document.documentElement.dataset.palette).toBe('forge');
  });

  it('legacy kolory mają jeden tab stop i wybór strzałkami', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    openCustomColors();
    const radios = screen.getByTestId('ob-accent-swatches').querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect(Array.from(radios).filter((radio) => radio.tabIndex === 0)).toHaveLength(1);
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
    expect(radios[1]).toHaveFocus();
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
  });

  it('LIVE PREVIEW: klik kropki natychmiast przebarwia ekran i zapisuje localStorage', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    openCustomColors();
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

  it('NIEZMIENNIK (zasada #5): domyślna paleta Pulse nie blokuje starego przejścia dalej', async () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    // Nowy użytkownik od razu dostaje pełną, odwracalną paletę Pulse.
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('73 100% 50%');
    expect(localStorage.getItem('ss-accent-color')).toBe('#c6ff00');
    expect(readStoredPaletteTheme()?.id).toBe('pulse');
    // Dalej działa jak dotąd (zgody odblokowują przejście na krok 2).
    acceptLegalView();
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

// Kontrakt 1.0: avatar personalizuje powitanie, ale nie jest analizowany.
// Google, Apple i e-mail dostają ten sam prosty wybór gotowych motywów.
describe('PlanWizard Welcome: avatar i imię bez analizy zdjęcia w 1.0', () => {
  const photoURL = 'https://lh3.googleusercontent.com/avatar.jpg';
  const radioOrder = () => Array.from(
    screen.getByTestId('ob-accent-swatches').querySelectorAll('[role="radio"]'),
  ).map((el) => el.getAttribute('data-testid'));
  beforeEach(() => {
    vi.clearAllMocks();
    deriveAccentCandidatesFromAvatar.mockResolvedValue([]);
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    document.documentElement.style.cssText = '';
    delete document.documentElement.dataset.accent;
  });

  it('konto Google: zdjecie w kolku (alt pusty, nieprzeciagalne) obok "Czesc, Grzegorz"', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    const img = screen.getByTestId('ob-avatar-img');
    expect(img).toHaveAttribute('src', photoURL);
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('draggable', 'false');
    expect(screen.getByRole('heading', { name: 'Cześć, Grzegorz' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Witaj w Strength Save/ })).toBeNull();
    // Pole imienia jest na personalizacji; zgody dopiero po jawnym przejściu.
    expect(screen.getByTestId('ob-name-input')).toHaveValue('Grzegorz');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
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

  it('blad ladowania zdjecia -> inicjaly', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
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

  it('zaufane zdjęcie Google nie pokazuje CTA ani nie uruchamia analizy', () => {
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    openCustomColors();
    expect(screen.queryByRole('button', { name: /Dopasuj kolory ze zdjęcia/i })).toBeNull();
    expect(screen.queryByTestId('ob-accent-from-photo')).toBeNull();
    expect(deriveAccentCandidatesFromAvatar).not.toHaveBeenCalled();
    expect(radioOrder()).toEqual(ACCENTS.map((a) => `ob-accent-${a.id}`));
    expect(radioOrder()).toHaveLength(ACCENTS.length);
    expect(screen.getByRole('radio', { name: /Pulse/ })).toHaveAttribute('aria-checked', 'true');
    expect(readStoredPaletteTheme()?.id).toBe('pulse');
  });

  it('wcześniejszy wybór pozostaje zaznaczony przy avatarze Google', () => {
    localStorage.setItem('ss-accent-color', 'indigo');
    render(withProviders(
      <PlanWizard showWelcome legalConsent askName initialName="Grzegorz" avatarPhotoURL={photoURL} confirmLabelKey="newplan.toReview" onConfirm={noop} />,
    ));
    openCustomColors();
    expect(deriveAccentCandidatesFromAvatar).not.toHaveBeenCalled();
    expect(screen.getByTestId('ob-accent-indigo')).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('ss-accent-color')).toBe('indigo');
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
