import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { getRecommendedPlan, planTemplates } from '@/data/planTemplates';
import { localizePlanName } from '@/lib/plan-i18n';

// X33 (plan docs/PLAN-X33-2026-08-25.md, sekcja 1): krok 5A "Dopasowane do Ciebie".
// WP-1 przerywnik "Dobieram plany" (~900 ms, raz na przejscie kreatora),
// WP-2 dwie karty (Polecany / Alternatywa / Wybrany z biblioteki) + chipy celu,
// WP-3 zwinieta linia ustawien (nazwa · tygodnie · start), WP-5 scroll na gore.
// Harness wg plan-wizard-browse.test.tsx.

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { MATCHING_INTERSTITIAL_MS, PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const noop = () => {};

// Bez showWelcome wizard startuje na kroku 2 (poziom). Domyslnie beginner / build_muscle.
const goToStep5 = (days = 4, objectiveLabel?: string) => {
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  if (objectiveLabel) fireEvent.click(screen.getByText(objectiveLabel));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: String(days) }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
};

const cards = () => screen.getAllByTestId(/^plan-choice-(recommended|second)$/);
const cardName = (card: HTMLElement) => within(card).getByTestId('plan-choice-name').textContent ?? '';
const cardMeta = (card: HTMLElement) => within(card).getByTestId('plan-choice-meta').textContent ?? '';
const cardBadge = (card: HTMLElement) => within(card).getByTestId('plan-choice-badge').textContent ?? '';
const selectedCard = () => cards().find((c) => c.getAttribute('aria-pressed') === 'true')!;
const templateByName = (name: string) => planTemplates.find((t) => localizePlanName(t.id, t.name, 'pl') === name)!;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('WP-2: dwie karty planow w kroku 5A', () => {
  it('naglowek "Dwa plany na {days} dni", karta 1 = rekomendacja (badge Polecany) zaznaczona domyslnie, karta 2 = Alternatywa', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(4);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dwa plany na 4 dni w tygodniu');
    expect(screen.getByText('Dopasowane do Ciebie')).toBeInTheDocument();
    expect(screen.getByTestId('ob-precision-days').textContent).toBe('Pn · Wt · Cz · Pt');

    const [first, second] = cards();
    const expected = getRecommendedPlan('build_muscle', 'beginner', 4);
    expect(cardName(first)).toBe(localizePlanName(expected.id, expected.name, 'pl'));
    expect(cardBadge(first)).toBe('Polecany');
    expect(first.getAttribute('aria-pressed')).toBe('true');
    expect(cardBadge(second)).toBe('Alternatywa');
    expect(second.getAttribute('aria-pressed')).toBe('false');
    // Alternatywa = najlepszy szablon puli o INNYM celu niz Polecany (4 dni: jest fat_loss/strength/athletic).
    expect(templateByName(cardName(second)).objective).not.toBe(expected.objective);
  });

  it('karta pokazuje "dlaczego", meta "{weeks} tyg. · {days} dni · {n} cw./trening" i pierwszy trening z 3 cwiczeniami', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(4);

    const first = cards()[0];
    const tpl = templateByName(cardName(first));
    const avg = Math.round(tpl.days.reduce((s, d) => s + d.exercises.length, 0) / tpl.days.length);
    expect(cardMeta(first)).toBe(`${tpl.durationWeeks} tyg. · ${tpl.daysPerWeek} dni · ${avg} ćw./trening`);
    // "Dlaczego" = etykiety celu i poziomu SZABLONU (4 dni / masa: katalog ma tylko intermediate).
    const LEVEL_PL = { beginner: 'Początkujący', intermediate: 'Średnio zaawansowany', advanced: 'Zaawansowany' } as const;
    expect(tpl.objective).toBe('build_muscle');
    expect(within(first).getByText(`Budowa masy · ${LEVEL_PL[tpl.level]}`)).toBeInTheDocument();
    const firstWorkout = within(first).getByTestId('plan-choice-first').textContent ?? '';
    expect(firstWorkout.startsWith('Pierwszy trening: ')).toBe(true);
    for (const ex of tpl.days[0].exercises.slice(0, 3)) expect(firstWorkout).toContain(ex.name);
    // Hero webp z getPlanTemplateImageUrl; blad pliku = karta bez obrazka, tresc zostaje.
    const img = first.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(`/plan-templates/${tpl.id}.webp`);
    fireEvent.error(img);
    expect(first.querySelector('img')).toBeNull();
    expect(cardName(first)).toBe(localizePlanName(tpl.id, tpl.name, 'pl'));
  });

  it('WLASNOSC: dla kazdej liczby dni 2..6 obie karty maja daysPerWeek == wybrane dni i sa rozne', () => {
    for (const days of [2, 3, 4, 5, 6]) {
      const view = render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
      goToStep5(days, 'Redukcja');
      const list = cards();
      expect(list, `${days} dni`).toHaveLength(2);
      const names = list.map(cardName);
      expect(new Set(names).size, `${days} dni`).toBe(2);
      for (const name of names) expect(templateByName(name).daysPerWeek, `${days} dni: ${name}`).toBe(days);
      view.unmount();
    }
  });

  it('tap karty 2 zaznacza ja (aria-pressed) i daje planSource=browsed z jej templateId; tap karty 1 wraca do recommended', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5(4);

    const [first, second] = cards();
    fireEvent.click(second);
    expect(second.getAttribute('aria-pressed')).toBe('true');
    expect(first.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /Zaczynam ten plan/ }));
    let choice = onConfirm.mock.calls[0][0];
    expect(choice.templateId).toBe(templateByName(cardName(second)).id);
    expect(choice.planSource).toBe('browsed');
    expect(choice.recommendedTemplateId).toBe(templateByName(cardName(first)).id);
    expect(choice.days).toHaveLength(4);

    fireEvent.click(first);
    expect(first.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Zaczynam ten plan/ }));
    choice = onConfirm.mock.calls[1][0];
    expect(choice.templateId).toBe(choice.recommendedTemplateId);
    expect(choice.planSource).toBe('recommended');
  });

  it('wybor z biblioteki spoza dwoch kart podmienia karte 2 (badge Wybrany, zaznaczona); wybor jednej z kart tylko ja zaznacza', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(4);
    const [first, second] = cards();
    const shown = new Set([cardName(first), cardName(second)]);

    fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));
    const outside = screen.getAllByRole('heading', { level: 3 }).find((h) => !shown.has(h.textContent ?? ''))!;
    const outsideName = outside.textContent ?? '';
    fireEvent.click(outside.closest('button')!);

    const after = cards();
    expect(after).toHaveLength(2);
    expect(cardName(after[0])).toBe([...shown][0]);
    expect(cardName(after[1])).toBe(outsideName);
    expect(cardBadge(after[1])).toBe('Wybrany');
    expect(after[1].getAttribute('aria-pressed')).toBe('true');

    // Wybor rekomendacji z biblioteki: karty bez podmiany, karta 1 zaznaczona.
    fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));
    fireEvent.click(screen.getByTestId('browse-recommended-badge').closest('button')!);
    expect(cards().map(cardName)).toEqual([...shown]);
    expect(cards()[0].getAttribute('aria-pressed')).toBe('true');
    expect(cardBadge(cards()[1])).toBe('Alternatywa');
  });

  it('chipy celu w bibliotece filtruja w obrebie puli dni; "Wszystkie" domyslnie; pusty cel = komunikat z wyjsciem', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(3);
    fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));

    const chips = within(screen.getByTestId('browse-objective-chips')).getAllByRole('button');
    expect(chips.map((c) => c.textContent)).toEqual(['Wszystkie', 'Masa', 'Siła', 'Redukcja', 'Atletyka']);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    const pool = planTemplates.filter((t) => t.daysPerWeek === 3);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(pool.length);

    fireEvent.click(screen.getByRole('button', { name: 'Siła' }));
    const strength = pool.filter((t) => t.objective === 'peak_strength');
    expect(strength.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent))
      .toEqual(strength.map((t) => localizePlanName(t.id, t.name, 'pl')));
    // Naglowek nadal liczy cala pule dni, nie filtr.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(`Plany na 3 dni w tygodniu (${pool.length})`);

    // 3 dni: brak szablonu redukcyjnego = komunikat, chipy zostaja (wyjscie ze stanu).
    fireEvent.click(screen.getByRole('button', { name: 'Redukcja' }));
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.getByTestId('browse-empty-objective')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wszystkie' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(pool.length);
  });

  it('niezmiennik: ostrzezenie daysMismatch nie pojawia sie, gdy karty maja liczbe dni z kroku 4', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(5);
    expect(screen.queryByText(/Ten plan ma \d+ dni treningowych/)).toBeNull();
  });
});

describe('WP-3: zwinieta linia ustawien planu', () => {
  it('zwinieta: "{nazwa} · {n} tyg. · start {dzien} {d.MM}" + Zmien; rozwiniecie pokazuje nazwe, kafle i chipy startu', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(4);

    const tpl = templateByName(cardName(cards()[0]));
    const summary = screen.getByTestId('ob-plan-settings-summary').textContent ?? '';
    expect(summary).toMatch(new RegExp(`^${localizePlanName(tpl.id, tpl.name, 'pl')} · ${tpl.durationWeeks} tyg\\. · start \\S+ \\d{1,2}\\.\\d{2}$`));
    expect(screen.queryByTestId('ob-plan-name')).toBeNull();
    expect(screen.queryByTestId('ob-start-week-chips')).toBeNull();

    const change = screen.getByRole('button', { name: 'Zmień' });
    expect(change.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(change);
    expect(screen.getByRole('button', { name: 'Zwiń' }).getAttribute('aria-expanded')).toBe('true');
    expect((screen.getByTestId('ob-plan-name') as HTMLInputElement).maxLength).toBe(60);
    expect(within(screen.getByTestId('ob-start-week-chips')).getAllByRole('button')).toHaveLength(8);
    const tiles = within(screen.getByTestId('template-duration-picker')).getAllByRole('button');
    // Szablon 12-tygodniowy: kafle 8 / 12 / 16 + Inna; 12 z etykieta "polecane" i zaznaczony.
    expect(tpl.durationWeeks).toBe(12);
    expect(tiles.map((b) => b.textContent)).toEqual(['8 tyg.', '12 tyg.polecane', '16 tyg.', 'Inna']);
    expect(tiles[1].getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByTestId('duration-custom-input')).toBeNull();
  });

  it('dlugosc szablonu spoza 8/12/16 = czwarty kafel "polecane"; kafel zmienia durationWeeks, "Inna" otwiera picker', () => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard initial={{ level: 'intermediate', objective: 'build_muscle', daysPerWeek: 3 }} confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep5(3);
    const tpl = templateByName(cardName(cards()[0]));
    expect(tpl.durationWeeks).toBe(10);

    fireEvent.click(screen.getByRole('button', { name: 'Zmień' }));
    const picker = () => within(screen.getByTestId('template-duration-picker'));
    expect(picker().getAllByRole('button').map((b) => b.textContent)).toEqual(['8 tyg.', '10 tyg.polecane', '12 tyg.', '16 tyg.', 'Inna']);

    fireEvent.click(picker().getByRole('button', { name: /^16 tyg\./ }));
    expect(screen.getByTestId('ob-plan-settings-summary').textContent).toContain('· 16 tyg. ·');

    fireEvent.click(picker().getByRole('button', { name: 'Inna' }));
    fireEvent.change(screen.getByTestId('duration-custom-input'), { target: { value: '20' } });
    expect(screen.getByTestId('ob-plan-settings-summary').textContent).toContain('· 20 tyg. ·');
    expect(picker().getByRole('button', { name: 'Inna' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /Zaczynam ten plan/ }));
    expect(onConfirm.mock.calls[0][0].durationWeeks).toBe(20);
  });

  it('zmiana szablonu (tap karty 2) wraca do nazwy i dlugosci nowego szablonu w linii ustawien', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(4);
    fireEvent.click(screen.getByRole('button', { name: 'Zmień' }));
    fireEvent.change(screen.getByTestId('ob-plan-name'), { target: { value: 'Moja nazwa' } });
    expect(screen.getByTestId('ob-plan-settings-summary').textContent).toContain('Moja nazwa');

    const second = cards()[1];
    fireEvent.click(second);
    const tpl = templateByName(cardName(second));
    expect(screen.getByTestId('ob-plan-settings-summary').textContent)
      .toContain(`${localizePlanName(tpl.id, tpl.name, 'pl')} · ${tpl.durationWeeks} tyg.`);
  });
});

describe('WP-1: przerywnik "Dobieram plany" po Dalej w kroku 4', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('pokazuje Poziom / Cel / Czestotliwosc przez ~900 ms, potem znika; powrot przez "Zmien ustawienia" go pomija', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    goToStep5(3, 'Redukcja');

    const overlay = screen.getByTestId('ob-matching');
    expect(within(overlay).getByText('Dobieram plany')).toBeInTheDocument();
    expect(within(overlay).getByText('Początkujący')).toBeInTheDocument();
    expect(within(overlay).getByText('Redukcja')).toBeInTheDocument();
    expect(within(overlay).getByText('3 dni/tydz')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(MATCHING_INTERSTITIAL_MS - 1); });
    expect(screen.getByTestId('ob-matching')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    expect(cards()).toHaveLength(2);

    fireEvent.click(screen.getByText('Zmień ustawienia'));
    fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Dwa plany na 4 dni w tygodniu');
  });

  it('wznowienie szkicu (resume + resumeStep 5) bez przerywnika', () => {
    const tpl = planTemplates.find((t) => t.id === 'tpl-upper-lower-4')!;
    const resume: PlanWizardChoice = {
      days: tpl.days, durationWeeks: 12, startDate: '2026-08-31', level: 'beginner', objective: 'build_muscle',
      daysPerWeek: 4, templateId: tpl.id, planSource: 'recommended',
    };
    render(withProviders(<PlanWizard resume={resume} resumeStep={5} confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    expect(cards()).toHaveLength(2);
  });
});

describe('WP-5: scroll na gore przy zmianie kroku / trybu', () => {
  it('kazde przejscie kroku i wejscie/wyjscie z biblioteki wola window.scrollTo(0, 0)', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={noop} />));
    const calls = () => scrollTo.mock.calls.filter((c) => c[0] === 0 && c[1] === 0).length;
    const afterMount = calls();
    expect(afterMount).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
    expect(calls()).toBe(afterMount + 1);
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    expect(calls()).toBe(afterMount + 3);
    fireEvent.click(screen.getByRole('button', { name: /Biblioteka planów/ }));
    expect(calls()).toBe(afterMount + 4);
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(calls()).toBe(afterMount + 5);
    scrollTo.mockRestore();
  });
});
