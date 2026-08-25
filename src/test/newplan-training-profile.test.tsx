// WP-O (X30): start nowego planu (/new-plan) aktualizuje users/{uid}.trainingProfile
// (poziom/cel/dni), bo do tej pory zamarzal na wartosciach z onboardingu i kolejny
// kreator podpowiadal nieaktualny profil. Snapshot onboardingAnswers zostaje
// nietkniety. Zapis best-effort: awaria nie cofa juz wystartowanego planu.
// Harness wg cycle-closeout-share.test.tsx.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { PlanWizardChoice } from '@/components/PlanWizard';
import type { TrainingDay } from '@/data/trainingPlan';

const updateDoc = vi.hoisted(() => vi.fn<(ref: unknown, data: Record<string, unknown>) => Promise<void>>(async () => {}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
  updateDoc,
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/user-events', () => ({ buildPlanEventEmitter: () => vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { displayName: 'Tester' }, isAdmin: false }),
}));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [], planName: '', planDurationWeeks: 12, planStartDate: null, savePlan: vi.fn() }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: [], backfillHistoricalWorkouts: vi.fn() }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ archiveCurrentPlan: vi.fn(), createActiveCycle: vi.fn(), getCycleById: vi.fn() }),
}));
const startCycleWithPlan = vi.hoisted(() => vi.fn<() => Promise<{ success: boolean; error?: string }>>(async () => ({ success: true })));
vi.mock('@/lib/cycle-actions', () => ({ startCycleWithPlan }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

const DAY = { id: 'd1', dayName: 'A', weekday: 'monday', focus: 'FBW', exercises: [] } as TrainingDay;
const CHOICE: PlanWizardChoice = {
  days: [DAY, { ...DAY, id: 'd2', weekday: 'thursday' }],
  durationWeeks: 8,
  startDate: '2026-08-31',
  level: 'advanced',
  objective: 'peak_strength',
  daysPerWeek: 2,
  templateId: 'tpl-fullbody-2',
  planSource: 'browsed',
};
// Kreator i podglad jako atrapy: test sprawdza tylko zapis po zatwierdzeniu.
vi.mock('@/components/PlanWizard', () => ({
  PlanWizard: ({ onConfirm }: { onConfirm: (c: PlanWizardChoice) => void }) => (
    <button onClick={() => onConfirm(CHOICE)}>WIZARD-CONFIRM</button>
  ),
}));
vi.mock('@/components/PlanPreview', () => ({
  PlanPreview: ({ onConfirm }: { onConfirm: () => void }) => <button onClick={onConfirm}>PREVIEW-CONFIRM</button>,
}));

import NewPlan from '@/pages/NewPlan';

const renderAndConfirm = async () => {
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider><NewPlan /></UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText('WIZARD-CONFIRM'));
  fireEvent.click(await screen.findByText('PREVIEW-CONFIRM'));
  await waitFor(() => expect(startCycleWithPlan).toHaveBeenCalledTimes(1));
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('NewPlan: replan aktualizuje trainingProfile (WP-O)', () => {
  it('po udanym starcie planu zapisuje poziom/cel/dni; onboardingAnswers nietkniete', async () => {
    await renderAndConfirm();

    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    const payload = updateDoc.mock.calls[0][1];
    expect(payload).toEqual({ trainingProfile: { level: 'advanced', objective: 'peak_strength', daysPerWeek: 2 } });
    expect(payload).not.toHaveProperty('onboardingAnswers');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  it('nieudany start planu: profil bez zmian', async () => {
    startCycleWithPlan.mockResolvedValueOnce({ success: false, error: 'boom' });
    await renderAndConfirm();

    expect(updateDoc).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('awaria zapisu profilu nie cofa replanu (best-effort, user trafia na dashboard)', async () => {
    updateDoc.mockRejectedValueOnce(new Error('offline'));
    await renderAndConfirm();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });
});
