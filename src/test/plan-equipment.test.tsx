import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { getRecommendedPlan, planTemplates, type PlanObjective, type PlanTemplate } from '@/data/planTemplates';
import { isEquipmentAccessible, resolvePlanEquipment, type PlanEquipment } from '@/lib/plan-equipment';
import { selectTemplatesForDays, scoreTemplates, templateRequiresBodyweightSupport } from '@/lib/plan-recommendation';
import { readOnboardingDraft, writeOnboardingDraft, type OnboardingDraftStorage, type OnboardingDraftV1 } from '@/lib/onboarding-draft';
import { buildTrainingProfile } from '@/lib/onboarding-answers';
import { localizePlanName } from '@/lib/plan-i18n';
import { buildCanonicalState } from '@/test/canonical-states';

// T6 (2026-09-29): "Gdzie trenujesz?" (Siłownia / Hantle w domu / Masa ciała)
// = twardy filtr szablonów przed doborem. Stare profile i szkice bez pola = siłownia.

vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => <div data-testid="plan-builder-stub" /> }));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));

import { PlanWizard, type PlanWizardChoice } from '@/components/PlanWizard';

const EQUIPMENT: PlanEquipment[] = ['gym', 'dumbbells_home', 'bodyweight'];
const OBJECTIVES: PlanObjective[] = ['build_muscle', 'peak_strength', 'fat_loss', 'athletic'];
const LEVELS: PlanTemplate['level'][] = ['beginner', 'intermediate', 'advanced'];
const DAYS = [2, 3, 4, 5, 6];

describe('model sprzętu', () => {
  it('stare dokumenty bez pola (i śmieci) = siłownia', () => {
    expect(resolvePlanEquipment(undefined)).toBe('gym');
    expect(resolvePlanEquipment(null)).toBe('gym');
    expect(resolvePlanEquipment('garage')).toBe('gym');
    expect(resolvePlanEquipment('dumbbells_home')).toBe('dumbbells_home');
  });

  it('dostępność: siłownia widzi wszystko, dom z hantlami + masa ciała, masa ciała tylko siebie', () => {
    expect(EQUIPMENT.every((e) => isEquipmentAccessible(e, 'gym'))).toBe(true);
    expect(isEquipmentAccessible('bodyweight', 'dumbbells_home')).toBe(true);
    expect(isEquipmentAccessible('gym', 'dumbbells_home')).toBe(false);
    expect(isEquipmentAccessible('dumbbells_home', 'bodyweight')).toBe(false);
  });

  it('każdy szablon ma pole equipment; kalistenika = masa ciała, plany domowe z hantlami', () => {
    for (const tpl of planTemplates) expect(EQUIPMENT, tpl.id).toContain(tpl.equipment);
    expect(planTemplates.find((t) => t.id === 'tpl-calisthenics-3')!.equipment).toBe('bodyweight');
    expect(planTemplates.find((t) => t.id === 'tpl-travel-2')!.equipment).toBe('bodyweight');
    for (const id of ['tpl-home-db-3', 'tpl-home-db-4', 'tpl-kettlebell-3']) {
      expect(planTemplates.find((t) => t.id === id)!.equipment, id).toBe('dumbbells_home');
    }
  });

  it('buildTrainingProfile: pole equipment tylko gdy jest (stary kształt bez pola bez zmian)', () => {
    expect(buildTrainingProfile({ level: 'beginner', objective: 'fat_loss', daysPerWeek: 3 }))
      .toEqual({ level: 'beginner', objective: 'fat_loss', daysPerWeek: 3 });
    expect(buildTrainingProfile({ level: 'beginner', objective: 'fat_loss', daysPerWeek: 3, equipment: 'bodyweight' }))
      .toEqual({ level: 'beginner', objective: 'fat_loss', daysPerWeek: 3, equipment: 'bodyweight' });
  });

  it('kanoniczny stan z profilem sprzed T6 (trainingProfile bez equipment) czyta się jako siłownia', () => {
    const state = buildCanonicalState('active-plan-legacy-profile');
    expect(state.profile.trainingProfile).toBeDefined();
    expect(state.profile.trainingProfile && 'equipment' in state.profile.trainingProfile).toBe(false);
    expect(resolvePlanEquipment(state.profile.trainingProfile?.equipment)).toBe('gym');
  });
});

describe('rekomendacja z twardym filtrem sprzętu', () => {
  it('WŁASNOŚĆ: każda kombinacja sprzęt × poziom × cel × dni daje szablon dostępny w tym miejscu (albo pustą pulę)', () => {
    for (const equipment of EQUIPMENT) {
      for (const level of LEVELS) {
        for (const objective of OBJECTIVES) {
          for (const daysPerWeek of DAYS) {
            const pool = selectTemplatesForDays(daysPerWeek, planTemplates, { level, equipment }).templates;
            if (!pool.length) continue;
            const top = scoreTemplates({ objective, level, daysPerWeek, equipment }, pool)[0].template;
            const label = `${equipment}/${level}/${objective}/${daysPerWeek} -> ${top.id}`;
            expect(isEquipmentAccessible(top.equipment, equipment), label).toBe(true);
            if (level === 'beginner') expect(templateRequiresBodyweightSupport(top), label).toBe(false);
            expect(getRecommendedPlan(objective, level, daysPerWeek, equipment).id, label).toBe(top.id);
          }
        }
      }
    }
  });

  it('pusta pula tylko tam, gdzie katalog nie ma żadnego dozwolonego planu (początkujący + masa ciała)', () => {
    const empty: string[] = [];
    for (const equipment of EQUIPMENT) for (const level of LEVELS) {
      if (!selectTemplatesForDays(3, planTemplates, { level, equipment }).templates.length) empty.push(`${equipment}/${level}`);
    }
    expect(empty).toEqual(['bodyweight/beginner']);
  });

  it('siłownia (i brak pola) = rekomendacje identyczne jak bez filtra sprzętu (niezmiennik starego przepływu)', () => {
    for (const level of LEVELS) for (const objective of OBJECTIVES) for (const daysPerWeek of DAYS) {
      expect(getRecommendedPlan(objective, level, daysPerWeek, 'gym').id)
        .toBe(getRecommendedPlan(objective, level, daysPerWeek).id);
    }
  });
});

// ── Kreator ──────────────────────────────────────────────────────────────────

const withProviders = (node: React.ReactNode) => (
  <LanguageProvider>
    <UnitProvider>{node}</UnitProvider>
  </LanguageProvider>
);

const templateByName = (name: string) => planTemplates.find((t) => localizePlanName(t.id, t.name, 'pl') === name)!;
const cards = () => screen.getAllByTestId(/^plan-choice-(recommended|alternative)$/);
const cardName = (card: HTMLElement) => within(card).getByTestId('plan-choice-name').textContent ?? '';

const goToStep3 = (levelLabel?: string) => {
  if (levelLabel) fireEvent.click(screen.getByText(levelLabel));
  fireEvent.click(screen.getByRole('button', { name: /Następny krok/ }));
};
const fromStep3ToStep5 = (days = 3) => {
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
  fireEvent.click(screen.getByRole('button', { name: String(days) }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/ }));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('kreator: krok "Gdzie trenujesz?"', () => {
  it('krok 3 pyta o miejsce (3 opcje PL), domyślnie Siłownia', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} />));
    goToStep3();
    const box = screen.getByTestId('ob-equipment');
    expect(within(box).getByText('Gdzie trenujesz?')).toBeInTheDocument();
    expect(within(box).getAllByRole('button').map((b) => b.textContent)).toEqual(['Siłownia', 'Hantle w domu', 'Masa ciała']);
    expect(screen.getByTestId('ob-equipment-gym')).toHaveAttribute('aria-pressed', 'true');
  });

  it('EN: Gym / Dumbbells at home / Bodyweight', () => {
    localStorage.setItem('app-language', 'en');
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} />));
    fireEvent.click(screen.getByRole('button', { name: /Next step/ }));
    const box = screen.getByTestId('ob-equipment');
    expect(within(box).getByText('Where do you train?')).toBeInTheDocument();
    expect(within(box).getAllByRole('button').map((b) => b.textContent)).toEqual(['Gym', 'Dumbbells at home', 'Bodyweight']);
  });

  it.each([
    ['dumbbells_home', 'Początkujący'],
    ['bodyweight', 'Średnio zaawansowany'],
    ['gym', 'Początkujący'],
  ] as const)('%s (%s): karty kroku 5 i zatwierdzony plan pasują do sprzętu; choice.equipment zapisany', (equipment, levelLabel) => {
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    goToStep3(levelLabel);
    fireEvent.click(screen.getByTestId(`ob-equipment-${equipment}`));
    fromStep3ToStep5(3);
    for (const card of cards()) {
      const tpl = templateByName(cardName(card));
      expect(isEquipmentAccessible(tpl.equipment, equipment), `${equipment}: ${tpl.id}`).toBe(true);
    }
    fireEvent.click(screen.getByTestId('ob-match-next'));
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    const choice = onConfirm.mock.calls[0][0];
    expect(choice.equipment).toBe(equipment);
    const tpl = planTemplates.find((t) => t.id === choice.templateId)!;
    expect(isEquipmentAccessible(tpl.equipment, equipment)).toBe(true);
  });

  it('początkujący + masa ciała: brak planu = stan z wyjściem (zmień miejsce -> krok 3, własny plan -> builder)', () => {
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} />));
    goToStep3();
    fireEvent.click(screen.getByTestId('ob-equipment-bodyweight'));
    fromStep3ToStep5(3);
    expect(screen.getByTestId('ob-no-template')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-choice-recommended')).toBeNull();
    expect(screen.queryByTestId('ob-match-next')).toBeNull();

    fireEvent.click(screen.getByTestId('ob-no-template-equipment'));
    expect(screen.getByTestId('ob-equipment')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ob-equipment-dumbbells_home'));
    fromStep3ToStep5(3);
    expect(screen.queryByTestId('ob-no-template')).toBeNull();
    expect(cards().length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    fireEvent.click(screen.getByTestId('ob-equipment-bodyweight'));
    fromStep3ToStep5(3);
    fireEvent.click(screen.getByTestId('ob-no-template-own'));
    expect(screen.getByTestId('plan-builder-stub')).toBeInTheDocument();
  });
});

describe('kreator: przerwanie i wznowienie nie gubi miejsca treningu', () => {
  const memoryStorage = () => {
    const values = new Map<string, string>();
    const storage: OnboardingDraftStorage = {
      get: vi.fn(async ({ key }) => ({ value: values.get(key) ?? null })),
      set: vi.fn(async ({ key, value }) => { values.set(key, value); }),
      remove: vi.fn(async ({ key }) => { values.delete(key); }),
    };
    return storage;
  };

  it('SEKWENCJA: wybór -> szkic (onDraftChange) -> zapis/odczyt storage -> nowy kreator ma to samo zaznaczenie i krok', async () => {
    const drafts: unknown[] = [];
    const first = render(withProviders(
      <PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} onDraftChange={(d) => drafts.push(d)} />,
    ));
    goToStep3();
    fireEvent.click(screen.getByTestId('ob-equipment-dumbbells_home'));
    const last = drafts.at(-1) as { equipment?: string; wizardStep?: number };
    expect(last.equipment).toBe('dumbbells_home');
    expect(last.wizardStep).toBe(3);
    first.unmount();

    const storage = memoryStorage();
    const NOW = Date.UTC(2026, 8, 29, 12);
    await writeOnboardingDraft('u1', last, { storage, now: NOW });
    const restored = await readOnboardingDraft('u1', { storage, now: NOW + 1000 });
    expect(restored?.equipment).toBe('dumbbells_home');

    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} initialDraft={restored} />));
    expect(screen.getByTestId('ob-equipment-dumbbells_home')).toHaveAttribute('aria-pressed', 'true');
  });

  it('szkic sprzed T6 (bez pola) i śmieciowa wartość = Siłownia', async () => {
    const storage = memoryStorage();
    const NOW = Date.UTC(2026, 8, 29, 12);
    await writeOnboardingDraft('u1', { phase: 'wizard', wizardStep: 3, equipment: 'garage' }, { storage, now: NOW });
    const restored = await readOnboardingDraft('u1', { storage, now: NOW + 1 }) as OnboardingDraftV1;
    expect(restored.equipment).toBeUndefined();
    render(withProviders(<PlanWizard confirmLabelKey="newplan.toReview" onConfirm={() => {}} initialDraft={restored} />));
    expect(screen.getByTestId('ob-equipment-gym')).toHaveAttribute('aria-pressed', 'true');
  });

  it('powrót z podglądu (resume) zachowuje miejsce treningu', () => {
    const tpl = planTemplates.find((t) => t.id === 'tpl-home-db-3')!;
    const resume: PlanWizardChoice = {
      days: tpl.days, durationWeeks: tpl.durationWeeks, startDate: '2026-09-28', level: 'beginner', objective: 'build_muscle',
      equipment: 'dumbbells_home', daysPerWeek: 3, templateId: tpl.id, planSource: 'recommended',
    };
    const onConfirm = vi.fn<(c: PlanWizardChoice) => void>();
    render(withProviders(<PlanWizard resume={resume} resumeStep={5} confirmLabelKey="newplan.toReview" onConfirm={onConfirm} />));
    fireEvent.click(screen.getByTestId('ob-match-next'));
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(onConfirm.mock.calls[0][0].equipment).toBe('dumbbells_home');
  });
});
