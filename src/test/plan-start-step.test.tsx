import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { getRecommendedPlan, planTemplates } from '@/data/planTemplates';
import { localizePlanName } from '@/lib/plan-i18n';
import { listFirstWorkoutOptions } from '@/lib/first-workout-schedule';
import type { TrainingDay } from '@/data/trainingPlan';

// X34 (docs/PLAN-X34-2026-08-25.md, sekcja 0): krok 5A = TYLKO wybor (naglowek,
// dwie karty, Uloz wlasny, Biblioteka, jedno CTA "Wybierz start planu"); nowy
// ekran 6/6 "Start planu" zbiera nazwe / dlugosc / start i ma dwa przyciski:
// glowny spersonalizowany celem (zapis od razu, skipPreview) i "Podglad planu".
// Wlasny plan (PlanBuilder) tez przechodzi przez 6/6. Harness wg plan-wizard-choice-cards.

const CUSTOM_DAY = { id: 'own-1', dayName: 'Własny A', weekday: 'monday', focus: 'FBW', exercises: [] } as TrainingDay;
const builderProps = vi.hoisted(() => ({ last: null as null | { initialDays?: TrainingDay[]; initialDurationWeeks?: number } }));
vi.mock('@/components/PlanBuilder', () => ({
  PlanBuilder: (props: { initialDays?: TrainingDay[]; initialDurationWeeks?: number; onSubmit: (days: TrainingDay[], weeks: number) => void }) => {
    builderProps.last = { initialDays: props.initialDays, initialDurationWeeks: props.initialDurationWeeks };
    return <button onClick={() => props.onSubmit([CUSTOM_DAY], 10)}>BUILDER-SUBMIT</button>;
  },
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanWizard, type PlanWizardChoice, type PlanWizardConfirmOptions } from '@/components/PlanWizard';

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const noop = () => {};
type Confirm = (c: PlanWizardChoice, o?: PlanWizardConfirmOptions) => void;

// Bez showWelcome wizard startuje na kroku 2. Domyslnie beginner / build_muscle / 4 dni.
const goToStep5 = (days = 4, objectiveLabel?: string) => {
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  if (objectiveLabel) fireEvent.click(screen.getByText(objectiveLabel));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: String(days) }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
};
const goToStep6 = (days = 4, objectiveLabel?: string) => {
  goToStep5(days, objectiveLabel);
  fireEvent.click(screen.getByTestId('ob-match-next'));
};

const cards = () => screen.getAllByTestId(/^plan-choice-(recommended|alternative)$/);
const cardName = (card: HTMLElement) => within(card).getByTestId('plan-choice-name').textContent ?? '';
const templateByName = (name: string) => planTemplates.find((t) => localizePlanName(t.id, t.name, 'pl') === name)!;
const nameInput = () => screen.getByTestId('ob-plan-name') as HTMLInputElement;
const tiles = () => within(screen.getByTestId('ob-duration-tiles')).getAllByRole('button');
// X34b: chipy = kolejne dni treningowe od dzis (data w data-date), nie poniedzialki.
const chips = () => within(screen.getByTestId('ob-first-workout-chips')).getAllByRole('button');
const chipDate = (i: number) => chips()[i].getAttribute('data-date')!;

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const mondayOf = (iso: string) => {
  const d = parseISO(iso);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return isoOf(d);
};
const todayISO = () => isoOf(new Date());
const JS_DAY_TO_WEEKDAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const weekdayOf = (iso: string) => JS_DAY_TO_WEEKDAY[parseISO(iso).getDay()];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  builderProps.last = null;
});

describe('X34: krok 5A odchudzony (tylko wybor)', () => {
  it('naglowek "Plany na {days} dni w tygodniu" + kicker; BEZ podsumowania odpowiedzi, "Zmien ustawienia", "Pierwszy trening", ustawien i starych CTA', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(4);

    expect(screen.getByText('05 / 06')).toBeInTheDocument();
    expect(screen.getByText('Dopasowane do Ciebie')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Plany na 4 dni w tygodniu');
    expect(cards()).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Ułóż własny/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Biblioteka planów na 4 dni/ })).toBeInTheDocument();

    expect(screen.queryByTestId('ob-precision-answers')).toBeNull();
    expect(screen.queryByTestId('ob-precision-days')).toBeNull();
    expect(screen.queryByText('Zmień ustawienia')).toBeNull();
    expect(screen.queryByTestId('plan-choice-first')).toBeNull();
    expect(screen.queryByText(/Pierwszy trening/)).toBeNull();
    expect(screen.queryByTestId('ob-plan-name')).toBeNull();
    expect(screen.queryByTestId('ob-first-workout-chips')).toBeNull();
    expect(screen.queryByRole('button', { name: /Zaczynam ten plan/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Podgląd planu/ })).toBeNull();

    const next = screen.getByTestId('ob-match-next');
    expect(next.textContent).toContain('Wybierz start planu');
    // Jedyny przycisk pod kartami poza "Uloz wlasny" i biblioteka.
    expect(screen.getAllByRole('button').filter((b) => /Wybierz start planu/.test(b.textContent ?? ''))).toHaveLength(1);
  });

  it('strzalka wstecz z 5A wraca do kroku 4 (bez "Zmien ustawienia")', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(4);
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(screen.getByText('Ile dni treningowych w tygodniu?')).toBeInTheDocument();
    expect(screen.getByText('04 / 06')).toBeInTheDocument();
  });
});

describe('X34: ekran 6/6 "Start planu"', () => {
  it('"Wybierz start planu" -> 6/6 z domyslnymi: nazwa szablonu, tygodnie szablonu "polecane", najblizszy dzien treningowy, CTA celu', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep6(4);

    expect(screen.getByTestId('ob-start-step')).toBeInTheDocument();
    expect(screen.getByText('06 / 06')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Start planu');

    const tpl = getRecommendedPlan('build_muscle', 'beginner', 4);
    expect(nameInput().value).toBe(localizePlanName(tpl.id, tpl.name, 'pl'));
    expect(nameInput().maxLength).toBe(60);

    // Szablon 12-tygodniowy: kafle 8 / 12 / 16 + Inna; 12 z "polecane" i zaznaczony.
    expect(tpl.durationWeeks).toBe(12);
    expect(tiles().map((b) => b.textContent)).toEqual(['8 tyg.', '12 tyg.polecane', '16 tyg.', 'Inna']);
    expect(tiles()[1].getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByTestId('duration-custom-input')).toBeNull();

    // X34b: 8 chipow = kolejne dni treningowe (4 dni: pn/wt/czw/pt) od dzis, rosnaco; pierwszy zaznaczony.
    expect(chips()).toHaveLength(8);
    // X35a WP-A: siatka 4x2 zamiast przewijanego rzedu (wszystkie chipy widoczne).
    const chipsGrid = screen.getByTestId('ob-first-workout-chips');
    expect(chipsGrid.className).toContain('grid-cols-4');
    expect(chipsGrid.className).not.toContain('overflow-x');
    expect(chips()[0]).toHaveAttribute('aria-pressed', 'true');
    const dates = chips().map((_, i) => chipDate(i));
    expect(dates[0] >= todayISO()).toBe(true);
    expect([...dates].sort()).toEqual(dates);
    for (const iso of dates) expect(['monday', 'tuesday', 'thursday', 'friday']).toContain(weekdayOf(iso));
    expect(chips()[0].textContent).toContain(String(parseISO(dates[0]).getDate()));
    expect(screen.getByText('Data pierwszego treningu')).toBeInTheDocument();

    const cta = screen.getByTestId('ob-start-cta');
    expect(cta.textContent).toContain('Zacznij budować masę');
    expect(screen.getByTestId('ob-start-preview').textContent).toBe('Podgląd planu');
    // Kolejnosc (decyzja wlasciciela po 121): pierwszy trening -> dlugosc -> nazwa -> CTA -> podglad.
    const precedes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(precedes(screen.getByTestId('ob-first-workout-chips'), screen.getByTestId('ob-duration-tiles'))).toBe(true);
    expect(precedes(screen.getByTestId('ob-duration-tiles'), nameInput())).toBe(true);
    expect(precedes(nameInput(), cta)).toBe(true);
    expect(precedes(cta, screen.getByTestId('ob-start-preview'))).toBe(true);
  });

  it('chipy tylko z dni treningowych kroku 4 (3 dni: pn/sr/pt), "Dzis" na pierwszym chipie gdy dzis jest dniem treningowym', () => {
    // Wtorek 2026-08-25: dzis NIE jest dniem treningowym -> pierwszy chip = sroda 26.08 bez "Dzis".
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 25, 12));
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep6(3);
    expect(chips().map((_, i) => chipDate(i))).toEqual(['2026-08-26', '2026-08-28', '2026-08-31', '2026-09-02', '2026-09-04', '2026-09-07', '2026-09-09', '2026-09-11']);
    expect(chips()[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Dziś')).toBeNull();
    expect(chips()[0].textContent).toMatch(/^śr\.?26sie/i);
    cleanup();

    // Sroda 2026-08-26: dzis jest dniem treningowym -> pierwszy chip "Dzis".
    vi.setSystemTime(new Date(2026, 7, 26, 12));
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep6(3);
    expect(chipDate(0)).toBe('2026-08-26');
    expect(chips()[0].textContent).toContain('Dziś');
    expect(chips()[1].textContent).not.toContain('Dziś');
    vi.useRealTimers();
  });

  it('SEKWENCJA (kontrakt zapisu): wybor piatku przy dzis=wtorek -> startDate = poniedzialek tego tygodnia, skippedDates = [pn (przed dzis), wt (dzis, przed wyborem), czw]; poniedzialek = zero skippedDates', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 25, 12)); // wtorek
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep6(4); // pn / wt / czw / pt
    expect(chips().map((_, i) => chipDate(i)).slice(0, 4)).toEqual(['2026-08-25', '2026-08-27', '2026-08-28', '2026-08-31']);
    fireEvent.click(chips()[2]); // piatek 28.08
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      firstWorkoutDate: '2026-08-28', startDate: '2026-08-24', skippedDates: ['2026-08-24', '2026-08-25', '2026-08-27'],
    });

    // Niezmiennik: poniedzialek 31.08 = start ten poniedzialek, zero skippedDates.
    fireEvent.click(chips()[3]);
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(onConfirm.mock.calls[1][0]).toMatchObject({ firstWorkoutDate: '2026-08-31', startDate: '2026-08-31', skippedDates: [] });
    // Kontrakt choice/onboardingAnswers bez zmian: startDate to nadal poniedzialek.
    expect(onConfirm.mock.calls[1][0].daysPerWeek).toBe(4);
    vi.useRealTimers();
  });

  it('zasada 6: zmiana dni w kroku 4 po wyborze chipa nie zostawia pustego wyboru (spada na pierwszy chip)', () => {
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep6(4);
    fireEvent.click(chips()[3]);
    const picked = chipDate(3);
    // Wstecz do kroku 4, inne dni (2: pn/czw) -> 5A -> 6/6.
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    fireEvent.click(screen.getByTestId('ob-match-next'));
    const dates = chips().map((_, i) => chipDate(i));
    const pressed = chips().filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0].getAttribute('data-date')).toBe(dates.includes(picked) ? picked : dates[0]);
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(dates).toContain(onConfirm.mock.calls[0][0].firstWorkoutDate);
  });

  it.each([
    ['Budowa masy', 'Zacznij budować masę'],
    ['Maksymalna siła', 'Zacznij budować siłę'],
    ['Redukcja', 'Zacznij redukcję'],
    ['Atletyka', 'Zacznij trening atletyczny'],
  ])('CTA spersonalizowane celem: %s -> "%s"', (objectiveLabel, cta) => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep6(4, objectiveLabel);
    expect(screen.getByTestId('ob-start-cta').textContent).toContain(cta);
  });

  it('EN: CTA i etykiety 6/6 w jezyku apki', () => {
    localStorage.setItem('app-language', 'en');
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    fireEvent.click(screen.getByRole('button', { name: /Next step/ }));
    fireEvent.click(screen.getByText('Fat Loss'));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    fireEvent.click(screen.getByTestId('ob-match-next'));
    expect(screen.getByTestId('ob-start-cta').textContent).toContain('Start your fat loss');
    expect(screen.getByText('First workout date')).toBeInTheDocument();
    expect(screen.getByTestId('ob-start-preview').textContent).toBe('Review plan');
  });

  it('glowny CTA = onConfirm(choice, {skipPreview: true}); "Podglad planu" = {skipPreview: false}; identyczny payload', () => {
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep6(4);
    fireEvent.change(nameInput(), { target: { value: '  Mój blok  ' } });
    fireEvent.click(tiles()[2]); // 16 tyg.
    fireEvent.click(chips()[2]);

    fireEvent.click(screen.getByTestId('ob-start-cta'));
    fireEvent.click(screen.getByTestId('ob-start-preview'));
    expect(onConfirm).toHaveBeenCalledTimes(2);
    const [direct, viaPreview] = onConfirm.mock.calls;
    expect(direct[1]).toEqual({ skipPreview: true });
    expect(viaPreview[1]).toEqual({ skipPreview: false });
    expect(direct[0]).toEqual(viaPreview[0]);
    expect(direct[0]).toMatchObject({ planName: 'Mój blok', durationWeeks: 16, firstWorkoutDate: chipDate(2), startDate: mondayOf(chipDate(2)), planSource: 'recommended' });
    expect(Array.isArray(direct[0].skippedDates)).toBe(true);
  });

  it('dlugosc szablonu spoza 8/12/16 = czwarty kafel "polecane"; "Inna" otwiera picker (2-36)', () => {
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard initial={{ level: 'intermediate', objective: 'build_muscle', daysPerWeek: 3 }} confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep6(3);
    expect(tiles().map((b) => b.textContent)).toEqual(['8 tyg.', '10 tyg.polecane', '12 tyg.', '16 tyg.', 'Inna']);
    expect(tiles()[1].getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Inna' }));
    fireEvent.change(screen.getByTestId('duration-custom-input'), { target: { value: '20' } });
    expect(screen.getByRole('button', { name: 'Inna' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(onConfirm.mock.calls[0][0].durationWeeks).toBe(20);
  });

  it('pusta nazwa spada do nazwy szablonu (Edge 4)', () => {
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep6(4);
    const defaultName = nameInput().value;
    fireEvent.change(nameInput(), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(onConfirm.mock.calls[0][0].planName).toBe(defaultName);
  });

  it('SEKWENCJA: 6/6 -> wstecz -> 5A (karta nadal zaznaczona, bez przerywnika) -> karta 2 -> 6/6 z defaultami karty 2; powrot bez zmiany karty zachowuje ustawienia', () => {
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5(4);
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    fireEvent.click(screen.getByTestId('ob-match-next'));
    fireEvent.change(nameInput(), { target: { value: 'Moja nazwa' } });
    fireEvent.click(tiles()[2]); // 16
    fireEvent.click(chips()[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(screen.getByText('05 / 06')).toBeInTheDocument();
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    expect(cards()[0].getAttribute('aria-pressed')).toBe('true');

    // Ta sama karta: ustawienia z 6/6 zostaja.
    fireEvent.click(screen.getByTestId('ob-match-next'));
    expect(nameInput().value).toBe('Moja nazwa');
    expect(tiles()[2].getAttribute('aria-pressed')).toBe('true');
    expect(chips()[1]).toHaveAttribute('aria-pressed', 'true');

    // Inna karta: nazwa i dlugosc z nowego szablonu, start bez zmian.
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    const second = cards()[1];
    fireEvent.click(second);
    const tpl = templateByName(cardName(second));
    fireEvent.click(screen.getByTestId('ob-match-next'));
    expect(nameInput().value).toBe(localizePlanName(tpl.id, tpl.name, 'pl'));
    expect(tiles().find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent).toContain(`${tpl.durationWeeks} tyg.`);
    expect(chips()[1]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ templateId: tpl.id, planSource: 'browsed', durationWeeks: tpl.durationWeeks, firstWorkoutDate: chipDate(1), startDate: mondayOf(chipDate(1)) });
  });

  it('wlasny plan (PlanBuilder) przechodzi przez 6/6: nazwa "Wlasny plan", tygodnie z buildera bez "polecane", CTA celu, planSource custom', () => {
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5(4, 'Redukcja');
    fireEvent.click(screen.getByRole('button', { name: /Ułóż własny/ }));
    fireEvent.click(screen.getByText('BUILDER-SUBMIT'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByTestId('ob-start-step')).toBeInTheDocument();
    expect(nameInput().value).toBe('Własny plan');
    expect(screen.queryByText('polecane')).toBeNull();
    // 10 tyg. z buildera nie jest kaflem 8/12/16: "Inna" aktywna z pickerem na 10.
    expect(screen.getByRole('button', { name: 'Inna' }).getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByTestId('duration-custom-input') as HTMLInputElement).placeholder).toBe('10');
    expect(within(screen.getByTestId('ob-weeks-custom')).getByRole('button', { name: '10 tyg.' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('ob-start-cta').textContent).toContain('Zacznij redukcję');

    fireEvent.click(screen.getByTestId('ob-start-cta'));
    const choice = onConfirm.mock.calls[0][0];
    expect(choice).toMatchObject({ planSource: 'custom', durationWeeks: 10, planName: 'Własny plan', objective: 'fat_loss' });
    expect(choice.templateId).toBeUndefined();
    expect(choice.days).toEqual([CUSTOM_DAY]);
    expect(onConfirm.mock.calls[0][1]).toEqual({ skipPreview: true });

    // Wstecz z 6/6 = 5A; "Uloz wlasny plan" otwiera builder z dniami z poprzedniego przejscia.
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(screen.getByText('05 / 06')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ułóż własny/ }));
    expect(builderProps.last?.initialDays).toEqual([CUSTOM_DAY]);
    expect(builderProps.last?.initialDurationWeeks).toBe(10);
  });

  it('po wlasnym planie "Wybierz start planu" z 5A wraca do szablonu (karta), nie do wlasnego planu', () => {
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5(4);
    fireEvent.click(screen.getByRole('button', { name: /Ułóż własny/ }));
    fireEvent.click(screen.getByText('BUILDER-SUBMIT'));
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    fireEvent.click(screen.getByTestId('ob-match-next'));
    const tpl = getRecommendedPlan('build_muscle', 'beginner', 4);
    expect(nameInput().value).toBe(localizePlanName(tpl.id, tpl.name, 'pl'));
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ templateId: tpl.id, planSource: 'recommended', durationWeeks: tpl.durationWeeks });
  });

  it('wznowienie (resume + resumeStep 6) = 6/6 z nazwa, tygodniami i data pierwszego treningu 1:1, bez przerywnika', () => {
    const tpl = planTemplates.find((t) => t.id === 'tpl-upper-lower-4')!;
    const fourth = listFirstWorkoutOptions(tpl.days.map((d) => d.weekday))[3];
    const resume: PlanWizardChoice = {
      days: tpl.days, durationWeeks: 16, startDate: mondayOf(fourth), firstWorkoutDate: fourth, level: 'beginner', objective: 'build_muscle',
      daysPerWeek: 4, templateId: tpl.id, planName: 'Mój szkic', planSource: 'recommended',
    };
    render(withProviders(<PlanWizard resume={resume} resumeStep={6} confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    expect(screen.getByTestId('ob-start-step')).toBeInTheDocument();
    expect(nameInput().value).toBe('Mój szkic');
    expect(tiles().find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent).toBe('16 tyg.');
    expect(chips()[3]).toHaveAttribute('aria-pressed', 'true');
    expect(chipDate(3)).toBe(fourth);
  });

  it('stary szkic bez firstWorkoutDate (sam poniedzialek startu) = pierwszy dzien treningowy >= tego poniedzialku', () => {
    const tpl = planTemplates.find((t) => t.id === 'tpl-upper-lower-4')!;
    const options = listFirstWorkoutOptions(tpl.days.map((d) => d.weekday));
    const monday = mondayOf(options[5]);
    const resume: PlanWizardChoice = {
      days: tpl.days, durationWeeks: 16, startDate: monday, level: 'beginner', objective: 'build_muscle',
      daysPerWeek: 4, templateId: tpl.id, planName: 'Mój szkic', planSource: 'recommended',
    };
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard resume={resume} resumeStep={6} confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    const pressed = chips().find((b) => b.getAttribute('aria-pressed') === 'true')!;
    expect(pressed.getAttribute('data-date')).toBe(options.find((iso) => iso >= monday));
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(onConfirm.mock.calls[0][0].startDate).toBe(monday);
  });

  it('wznowienie na 5A (resume + resumeStep 5, "Wybierz inny plan") = karta zaznaczona; przejscie do 6/6 zachowuje nazwe, tygodnie i start', () => {
    const tpl = planTemplates.find((t) => t.id === 'tpl-fullbody-3')!;
    const third = listFirstWorkoutOptions(tpl.days.map((d) => d.weekday))[2];
    const resume: PlanWizardChoice = {
      days: tpl.days, durationWeeks: 16, startDate: mondayOf(third), firstWorkoutDate: third, level: 'intermediate', objective: 'fat_loss',
      daysPerWeek: 3, templateId: tpl.id, planName: 'Mój szkic', planSource: 'browsed',
    };
    render(withProviders(<PlanWizard resume={resume} resumeStep={5} confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    expect(screen.getByText('05 / 06')).toBeInTheDocument();
    const selected = cards().find((c) => c.getAttribute('aria-pressed') === 'true')!;
    expect(cardName(selected)).toBe(localizePlanName(tpl.id, tpl.name, 'pl'));

    fireEvent.click(screen.getByTestId('ob-match-next'));
    expect(nameInput().value).toBe('Mój szkic');
    expect(tiles().find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent).toBe('16 tyg.');
    expect(chips()[2]).toHaveAttribute('aria-pressed', 'true');
    expect(chipDate(2)).toBe(third);
    expect(screen.getByTestId('ob-start-cta').textContent).toContain('Zacznij redukcję');
  });

  it('wznowienie wlasnego planu na 6/6 (resume bez templateId + resumeStep 6): chipy z dni buildera (sam poniedzialek)', () => {
    const mondays = listFirstWorkoutOptions(['monday']);
    const resume: PlanWizardChoice = {
      days: [CUSTOM_DAY], durationWeeks: 8, startDate: mondays[0], firstWorkoutDate: mondays[0], level: 'beginner', objective: 'athletic',
      daysPerWeek: 1, planName: 'Mój własny', planSource: 'custom',
    };
    const onConfirm = vi.fn<Confirm>();
    render(withProviders(<PlanWizard resume={resume} resumeStep={6} confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    expect(screen.getByTestId('ob-start-step')).toBeInTheDocument();
    expect(nameInput().value).toBe('Mój własny');
    expect(chips().map((_, i) => chipDate(i))).toEqual(mondays);
    expect(chips()[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ob-start-cta').textContent).toContain('Zacznij trening atletyczny');
    fireEvent.click(screen.getByTestId('ob-start-preview'));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ planSource: 'custom', planName: 'Mój własny', durationWeeks: 8, days: [CUSTOM_DAY], firstWorkoutDate: mondays[0], startDate: mondays[0], skippedDates: [] });
  });

  it('zasada 6: isSaving blokuje oba przyciski, error widoczny na 6/6', () => {
    const { rerender } = render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep6(4);
    rerender(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} isSaving />));
    expect(screen.getByTestId('ob-start-cta')).toBeDisabled();
    expect(screen.getByTestId('ob-start-preview')).toBeDisabled();
    rerender(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} error="boom" />));
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByTestId('ob-start-cta')).toBeEnabled();
  });
});
