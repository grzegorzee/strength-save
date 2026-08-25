// X34 (sekcja 0.4 / 2): podglad planu ma na dole DWA przyciski: "Zatwierdz i
// zacznij" (jak dotad) i "Wybierz inny plan", ktory wraca do kreatora na 5A z
// zachowanym stanem (zaznaczona karta, nazwa / tygodnie / start z 6/6), bez
// ponownego przerywnika. Strzalka wstecz z podgladu wraca na 6/6. Onboarding i NewPlan.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { planTemplates } from '@/data/planTemplates';
import { localizePlanName } from '@/lib/plan-i18n';
import type { TrainingDay } from '@/data/trainingPlan';

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/hooks/useCustomExercises', () => ({
  useCustomExercises: () => ({ customExercises: [], addCustomExercise: vi.fn() }),
}));
vi.mock('@/components/ExercisePicker', () => ({ ExercisePicker: () => null }));
// Onboarding / NewPlan: reszta zaleznosci jak w onboarding-skip-preview / newplan-skip-preview.
const profileDoc = vi.hoisted(() => ({ current: { trainingProfile: { level: 'intermediate', objective: 'fat_loss', daysPerWeek: 3 } } }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => new Promise((resolve) => { setTimeout(() => resolve({ exists: () => true, data: () => profileDoc.current }), 0); })),
  updateDoc: vi.fn(async () => {}),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/user-events', () => ({ buildPlanEventEmitter: () => vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Grzegorz', photoURL: '', consents: { marketingGranted: false, marketingVersion: '1.0' } }, isAdmin: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [], planName: '', planDurationWeeks: 12, planStartDate: null, savePlan: vi.fn(async () => ({ success: true })) }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: [], backfillHistoricalWorkouts: vi.fn() }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ archiveCurrentPlan: vi.fn(), createActiveCycle: vi.fn(async () => 'cycle-1'), getCycleById: vi.fn() }),
}));
vi.mock('@/lib/consents-api', () => ({ recordConsents: vi.fn(async () => {}) }));
const startCycleWithPlan = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const completeOnboardingPlan = vi.hoisted(() => vi.fn(async () => ({ success: true })));
vi.mock('@/lib/cycle-actions', () => ({ startCycleWithPlan, completeOnboardingPlan }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

import { PlanPreview } from '@/components/PlanPreview';
import Onboarding from '@/pages/Onboarding';
import NewPlan from '@/pages/NewPlan';

const withProviders = (node: React.ReactNode) => (
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider>{node}</UnitProvider>
    </LanguageProvider>
  </MemoryRouter>
);

const DAYS: TrainingDay[] = [{ id: 'd1', dayName: 'Dzień 1', weekday: 'monday', focus: 'FBW', exercises: [{ id: 'e1', name: 'Przysiad', sets: '3x5', instructions: [] }] }];
const cards = () => screen.getAllByTestId(/^plan-choice-(recommended|alternative)$/);
const cardName = (card: HTMLElement) => within(card).getByTestId('plan-choice-name').textContent ?? '';
const selectedCard = () => cards().find((c) => c.getAttribute('aria-pressed') === 'true')!;
const nameInput = () => screen.getByTestId('ob-plan-name') as HTMLInputElement;
const tiles = () => within(screen.getByTestId('ob-duration-tiles')).getAllByRole('button');
// X34b: chipy dni treningowych (data pierwszego treningu) zamiast poniedzialkow.
const chips = () => within(screen.getByTestId('ob-first-workout-chips')).getAllByRole('button');
const precedes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('PlanPreview: przycisk "Wybierz inny plan"', () => {
  it('dwa przyciski na dole: Zatwierdz (plan-preview-confirm) nad "Wybierz inny plan" (plan-preview-choose-other); klik wola onChooseOther', () => {
    const onChooseOther = vi.fn();
    const onConfirm = vi.fn();
    render(withProviders(
      <PlanPreview days={DAYS} onDaysChange={() => {}} onBack={() => {}} onConfirm={onConfirm} onChooseOther={onChooseOther} confirmLabel="Zatwierdź i zacznij" />,
    ));
    const confirm = screen.getByTestId('plan-preview-confirm');
    const other = screen.getByTestId('plan-preview-choose-other');
    expect(confirm.textContent).toContain('Zatwierdź i zacznij');
    expect(other.textContent).toBe('Wybierz inny plan');
    expect(precedes(confirm, other)).toBe(true);
    fireEvent.click(other);
    expect(onChooseOther).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('isSaving blokuje oba przyciski; bez onChooseOther drugiego przycisku nie ma (stary kontrakt)', () => {
    const { rerender } = render(withProviders(
      <PlanPreview days={DAYS} onDaysChange={() => {}} onBack={() => {}} onConfirm={() => {}} onChooseOther={() => {}} confirmLabel="OK" isSaving />,
    ));
    expect(screen.getByTestId('plan-preview-confirm')).toBeDisabled();
    expect(screen.getByTestId('plan-preview-choose-other')).toBeDisabled();
    rerender(withProviders(
      <PlanPreview days={DAYS} onDaysChange={() => {}} onBack={() => {}} onConfirm={() => {}} confirmLabel="OK" />,
    ));
    expect(screen.queryByTestId('plan-preview-choose-other')).toBeNull();
  });

  it('EN: etykieta w jezyku apki', () => {
    localStorage.setItem('app-language', 'en');
    render(withProviders(
      <PlanPreview days={DAYS} onDaysChange={() => {}} onBack={() => {}} onConfirm={() => {}} onChooseOther={() => {}} confirmLabel="OK" />,
    ));
    expect(screen.getByTestId('plan-preview-choose-other').textContent).toBe('Choose another plan');
  });
});

// Krok 1 (zgody) -> 2 -> 3 (Redukcja) -> 4 (3 dni) -> 5A.
const onboardingToStep5 = async () => {
  fireEvent.click(screen.getByTestId('consent-terms'));
  fireEvent.click(screen.getByTestId('consent-privacy'));
  fireEvent.click(screen.getByTestId('consent-health'));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  await screen.findByRole('button', { name: /Następny krok/ });
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByText('Redukcja'));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: '3' }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  await screen.findByTestId('ob-match-next');
};

// 5A: karta 2 -> 6/6: nazwa, 16 tyg., 3. poniedzialek -> Podglad.
const pickSecondAndPreview = () => {
  fireEvent.click(cards()[1]);
  const secondName = cardName(cards()[1]);
  fireEvent.click(screen.getByTestId('ob-match-next'));
  fireEvent.change(nameInput(), { target: { value: 'Moja nazwa' } });
  fireEvent.click(tiles().find((b) => b.textContent === '16 tyg.')!);
  fireEvent.click(chips()[2]);
  fireEvent.click(screen.getByTestId('ob-start-preview'));
  return secondName;
};

const expectStateKept = (secondName: string) => {
  // 5A: zaznaczona karta 2, bez przerywnika, licznik 05 / 06.
  expect(screen.getByText('05 / 06')).toBeInTheDocument();
  expect(screen.queryByTestId('ob-matching')).toBeNull();
  expect(cardName(selectedCard())).toBe(secondName);
  // 6/6: nazwa, tygodnie i start z poprzedniego przejscia 1:1.
  fireEvent.click(screen.getByTestId('ob-match-next'));
  expect(nameInput().value).toBe('Moja nazwa');
  expect(tiles().find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent).toBe('16 tyg.');
  expect(chips()[2]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('ob-start-cta').textContent).toContain('Zacznij redukcję');
};

describe('Onboarding: "Wybierz inny plan" wraca na 5A z zachowanym stanem', () => {
  it('SEKWENCJA: 5A (karta 2) -> 6/6 (nazwa, 16 tyg., start) -> Podglad -> Wybierz inny plan -> 5A -> 6/6 1:1 -> Podglad -> Zatwierdz', async () => {
    render(withProviders(<Onboarding />));
    await onboardingToStep5();
    const secondName = pickSecondAndPreview();
    await screen.findByTestId('plan-preview-choose-other');

    fireEvent.click(screen.getByTestId('plan-preview-choose-other'));
    await screen.findByTestId('ob-match-next');
    expectStateKept(secondName);

    fireEvent.click(screen.getByTestId('ob-start-preview'));
    fireEvent.click(await screen.findByTestId('plan-preview-confirm'));
    await waitFor(() => expect(completeOnboardingPlan).toHaveBeenCalledTimes(1));
    const choice = (completeOnboardingPlan.mock.calls[0] as unknown as [{ planName: string; durationWeeks: number; templateId: string; planSource: string }])[0];
    expect(choice.planName).toBe('Moja nazwa');
    expect(choice.durationWeeks).toBe(16);
    expect(choice.planSource).toBe('browsed');
    expect(choice.templateId).toBe(planTemplates.find((t) => localizePlanName(t.id, t.name, 'pl') === secondName)!.id);
  });

  it('strzalka wstecz z podgladu wraca na 6/6 (nie 5A), bez przerywnika', async () => {
    render(withProviders(<Onboarding />));
    await onboardingToStep5();
    pickSecondAndPreview();
    fireEvent.click(await screen.findByLabelText('Wstecz'));
    await screen.findByTestId('ob-start-step');
    expect(screen.getByText('06 / 06')).toBeInTheDocument();
    expect(screen.queryByTestId('ob-matching')).toBeNull();
    expect(nameInput().value).toBe('Moja nazwa');
  });
});

// Krok 2 (profil fat_loss / intermediate / 3) -> 3 -> 4 -> 5A.
const newPlanToStep5 = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /Następny krok/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  await screen.findByTestId('ob-match-next');
};

describe('NewPlan: "Wybierz inny plan" wraca na 5A z zachowanym stanem', () => {
  it('SEKWENCJA: 5A (karta 2) -> 6/6 -> Podglad -> Wybierz inny plan -> 5A -> 6/6 1:1 -> Podglad -> Zatwierdz = startCycleWithPlan', async () => {
    render(withProviders(<NewPlan />));
    await newPlanToStep5();
    const secondName = pickSecondAndPreview();
    await screen.findByTestId('plan-preview-choose-other');

    fireEvent.click(screen.getByTestId('plan-preview-choose-other'));
    await screen.findByTestId('ob-match-next');
    expectStateKept(secondName);

    fireEvent.click(screen.getByTestId('ob-start-preview'));
    fireEvent.click(await screen.findByTestId('plan-preview-confirm'));
    await waitFor(() => expect(startCycleWithPlan).toHaveBeenCalledTimes(1));
    const [days, weeks, deps] = startCycleWithPlan.mock.calls[0] as unknown as [TrainingDay[], number, { planName: string }];
    expect(days).toHaveLength(3);
    expect(weeks).toBe(16);
    expect(deps.planName).toBe('Moja nazwa');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  it('strzalka wstecz z podgladu wraca na 6/6 (nie 5A)', async () => {
    render(withProviders(<NewPlan />));
    await newPlanToStep5();
    pickSecondAndPreview();
    fireEvent.click(await screen.findByLabelText('Wstecz'));
    await screen.findByTestId('ob-start-step');
    expect(screen.getByText('06 / 06')).toBeInTheDocument();
    expect(nameInput().value).toBe('Moja nazwa');
  });
});
