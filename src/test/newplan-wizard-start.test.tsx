// X32: po zakonczeniu cyklu (closeout z ?fromCycle) i przy kazdym replanie
// (/new-plan bez fromCycle) kreator ma STARTOWAC OD KROKU 2 (poziom) z
// odpowiedziami z users/{uid}.trainingProfile wstepnie zaznaczonymi, zeby user
// tylko potwierdzal (Dalej x3) albo zmienil. Do X31 kreator wchodzil od razu na
// krok 5 (startAtPrecision), a user nie mial okazji zweryfikowac poziomu/celu/dni.
// Wznowienie szkicu (resume) ma pierwszenstwo: powrot z podgladu = krok 5.
// Test SEKWENCJI. Harness wg newplan-profile-hint.test.tsx + cycle-closeout-share.test.tsx.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { getRecommendedPlan, planTemplates } from '@/data/planTemplates';
import { localizePlanName } from '@/lib/plan-i18n';
import type { PlanWizardChoice } from '@/components/PlanWizard';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';

type ProfileDoc = { trainingProfile?: { level: string; objective: string; daysPerWeek: number } } | null;
const profileDoc = vi.hoisted(() => ({ current: null as ProfileDoc }));
const cycleFixture = vi.hoisted(() => ({ cycle: null as unknown }));
// Stabilna referencja (jak useCallback w hooku): efekt closeout w NewPlan zalezy
// od getCycleById, nowa funkcja na kazdy render cofalaby faze do closeout.
const getCycleById = vi.hoisted(() => vi.fn(async () => cycleFixture.cycle));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  // Odpowiedz PO pierwszym renderze (makrotask) = realna kolejnosc w apce.
  getDoc: vi.fn(() => new Promise((resolve) => {
    setTimeout(() => resolve({ exists: () => profileDoc.current !== null, data: () => profileDoc.current }), 0);
  })),
  updateDoc: vi.fn(async () => {}),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/user-events', () => ({ buildPlanEventEmitter: () => vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [], planName: 'Stary blok', planDurationWeeks: 12, planStartDate: null, savePlan: vi.fn() }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: [], backfillHistoricalWorkouts: vi.fn() }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({
    archiveCurrentPlan: vi.fn(),
    createActiveCycle: vi.fn(),
    getCycleById,
  }),
}));
vi.mock('@/lib/cycle-actions', () => ({ startCycleWithPlan: vi.fn(async () => ({ success: true })) }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/components/PlanPreview', () => ({
  PlanPreview: ({ days, onBack }: { days: TrainingDay[]; onBack: () => void }) => (
    <button onClick={onBack}>PREVIEW-BACK:{days.length}</button>
  ),
}));

import NewPlan from '@/pages/NewPlan';

const PROFILE = { level: 'intermediate', objective: 'fat_loss', daysPerWeek: 3 };

const completedCycle: PlanCycle = {
  id: 'cycle-1',
  userId: 'u1',
  days: [],
  durationWeeks: 8,
  startDate: '2026-05-04',
  endDate: '2026-06-28',
  status: 'completed',
  createdAt: '2026-05-04T08:00:00.000Z',
  stats: { totalWorkouts: 20, totalTonnage: 100000, prs: [], completionRate: 83, expectedWorkouts: 24 },
};

const renderNewPlan = (entry = '/new-plan') => render(
  <MemoryRouter initialEntries={[entry]}>
    <LanguageProvider>
      <UnitProvider><NewPlan /></UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

const isSelected = (label: string) => screen.getByText(label).closest('button')!.getAttribute('aria-pressed');
// X34: licznik kroków 1..6 (ekran 6/6 "Start planu").
const stepIndicator = (step: number) => screen.getByText(`0${step} / 06`);
// X33 WP-2: rekomendacja = karta "Polecany" (zamiast linii "polecamy plan").
const recommendedLine = () => screen.getByTestId('plan-choice-recommended').textContent ?? '';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  profileDoc.current = { trainingProfile: PROFILE };
  cycleFixture.cycle = null;
});

describe('NewPlan: kreator startuje od kroku 2 z profilem treningowym (X32)', () => {
  it('bez fromCycle: krok 2 z zaznaczonym poziomem, kroki 3-4 z celem i dniami, krok 5 rekomenduje plan 3-dniowy', async () => {
    renderNewPlan();

    await screen.findByText('Średnio zaawansowany');
    stepIndicator(2);
    expect(isSelected('Średnio zaawansowany')).toBe('true');
    expect(isSelected('Początkujący')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
    stepIndicator(3);
    expect(isSelected('Redukcja')).toBe('true');
    expect(isSelected('Budowa masy')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    stepIndicator(4);
    expect(screen.getByText('Wybrano 3/3 dni')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
    stepIndicator(5);
    const expected = getRecommendedPlan('fat_loss', 'intermediate', 3);
    expect(expected.daysPerWeek).toBe(3);
    expect(recommendedLine()).toContain(localizePlanName(expected.id, expected.name, 'pl'));
    // X34: bez linii odpowiedzi; liczba dni z kroku 4 w nagłówku, cel w CTA ekranu 6/6.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Plany na 3 dni w tygodniu');
    fireEvent.click(screen.getByTestId('ob-match-next'));
    stepIndicator(6);
    expect(screen.getByTestId('ob-start-cta').textContent).toContain('Zacznij redukcję');
  });

  it('z fromCycle po closeout: "Wybierz nowy plan" prowadzi na krok 2 z profilem; wstecz wraca do closeout', async () => {
    cycleFixture.cycle = completedCycle;
    renderNewPlan('/new-plan?fromCycle=cycle-1');

    await screen.findByText('Faza ukończona');
    fireEvent.click(screen.getByRole('button', { name: /Wybierz nowy plan/ }));

    await screen.findByText('Średnio zaawansowany');
    stepIndicator(2);
    expect(isSelected('Średnio zaawansowany')).toBe('true');
    expect(screen.queryByTestId('plan-choice-recommended')).toBeNull();

    // Strzalka wstecz z kroku 2 = wyjscie z kreatora do closeout (onExitBack), nie do kroku 1.
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(await screen.findByText('Faza ukończona')).toBeTruthy();
  });

  it('niezmiennik: brak profilu -> krok 2 z domyslnym poziomem (poczatkujacy), nie krok 5', async () => {
    profileDoc.current = {};
    renderNewPlan();

    await screen.findByText('Początkujący');
    stepIndicator(2);
    expect(isSelected('Początkujący')).toBe('true');
  });

  it('resume szkicu ma pierwszenstwo: Kontynuuj -> podglad -> wstecz = ekran 6/6 z zapisanym planem (nazwa 1:1), wstecz = 5A z zaznaczona karta, nie krok 2', async () => {
    const template = planTemplates.find((t) => t.id === 'tpl-fullbody-3')!;
    const chosen: PlanWizardChoice = {
      days: template.days,
      durationWeeks: 10,
      startDate: '2026-08-31',
      level: 'intermediate',
      objective: 'fat_loss',
      daysPerWeek: 3,
      templateId: template.id,
      planName: 'Mój szkic',
      planSource: 'browsed',
    };
    localStorage.setItem('ss-newplan-draft_u1', JSON.stringify({ chosen, reviewDays: template.days }));
    renderNewPlan();

    fireEvent.click(await screen.findByRole('button', { name: 'Kontynuuj' }));
    fireEvent.click(await screen.findByText('PREVIEW-BACK:3'));

    // X34: powrót z podglądu = ekran 6/6 z nazwą i długością szkicu 1:1.
    await waitFor(() => stepIndicator(6));
    expect((screen.getByTestId('ob-plan-name') as HTMLInputElement).value).toBe('Mój szkic');
    expect(screen.getByRole('button', { name: /^10 tyg\./ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    // Wstecz z 6/6 = 5A: zapisany szablon jest zaznaczoną kartą (X33 WP-2), bez przerywnika.
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    stepIndicator(5);
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    const selected = screen.getAllByTestId(/^plan-choice-(recommended|alternative)$/).find((c) => c.getAttribute('aria-pressed') === 'true')!;
    expect(selected.textContent).toContain(localizePlanName(template.id, template.name, 'pl'));
  });
});
