import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { planTemplates } from '@/data/planTemplates';
import type { TrainingDay } from '@/data/trainingPlan';
import { LEGAL_VERSIONS } from '@/lib/legal-versions';
import { readOnboardingDraft, writeOnboardingDraft } from '@/lib/onboarding-draft';
import { ANDROID_BACK_EVENT } from '@/components/AndroidBackHandler';

const state = vi.hoisted(() => ({ complete: vi.fn(), navigate: vi.fn() }));
vi.mock('@capacitor/core', async (importOriginal) => ({
  ...await importOriginal<typeof import('@capacitor/core')>(),
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc: vi.fn(async () => undefined) }));
vi.mock('@/hooks/useTrainingPlan', () => ({ useTrainingPlan: () => ({ savePlan: vi.fn() }) }));
vi.mock('@/hooks/usePlanCycles', () => ({ usePlanCycles: () => ({ createActiveCycle: vi.fn() }) }));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/lib/cycle-actions', () => ({ completeOnboardingPlan: state.complete }));
vi.mock('@/lib/consents-api', () => ({ recordConsents: vi.fn() }));
vi.mock('@/lib/user-events', () => ({ buildPlanEventEmitter: () => vi.fn() }));
vi.mock('@/lib/rest-preferences', () => ({ restDefaultsDeps: () => undefined }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({
  uid: 'preview-owner',
  profile: { displayName: 'Test', consents: { termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy } },
  mergeConfirmedConsentMirror: vi.fn(),
}) }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(), useNavigate: () => state.navigate,
}));
vi.mock('@/components/PlanBuilder', () => ({ PlanBuilder: () => null }));
vi.mock('@/components/PlanPreview', () => ({ PlanPreview: ({ days, onDaysChange, onBack, onConfirm }: {
  days: TrainingDay[]; onDaysChange: (days: TrainingDay[]) => void; onBack: () => void; onConfirm: () => void;
}) => <div>
  <p data-testid="review-exercise">{days[0].exercises[0].name}</p>
  <button onClick={() => onDaysChange(days.map((day, index) => index ? day : {
    ...day, exercises: day.exercises.map((ex, exIndex) => exIndex ? ex : { ...ex, id: 'swapped-exercise', name: 'Synthetic replacement' }),
  }))}>SWAP</button>
  <button onClick={onBack}>PREVIEW-BACK</button>
  <button onClick={onConfirm}>PREVIEW-CONFIRM</button>
</div> }));

import Onboarding from '@/pages/Onboarding';

const template = planTemplates.find(plan => plan.daysPerWeek === 4)!;
const mount = () => render(<MemoryRouter><LanguageProvider><UnitProvider><Onboarding /></UnitProvider></LanguageProvider></MemoryRouter>);
const swapInPreview = async () => {
  fireEvent.click(screen.getByTestId('ob-start-preview'));
  fireEvent.click(screen.getByText('SWAP'));
  expect(screen.getByTestId('review-exercise')).toHaveTextContent('Synthetic replacement');
  await act(async () => undefined);
};

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  state.complete.mockReset().mockResolvedValue({ success: true });
  state.navigate.mockReset();
  await writeOnboardingDraft('preview-owner', {
    phase: 'wizard', wizardStep: 6, level: 'beginner', objective: 'build_muscle',
    daysPerWeek: 4, trainingDays: ['monday', 'tuesday', 'thursday', 'friday'],
    templateId: template.id, planSource: 'browsed', durationWeeks: 12,
  });
});
afterEach(cleanup);

describe('onboarding preview edits and pending save recovery', () => {
  it('preview swap → Back → change name → preview → confirm retains the replacement', async () => {
    mount();
    await swapInPreview();
    fireEvent.click(screen.getByText('PREVIEW-BACK'));
    fireEvent.change(screen.getByTestId('ob-plan-name'), { target: { value: 'Renamed plan' } });
    fireEvent.click(screen.getByTestId('ob-start-preview'));
    expect(screen.getByTestId('review-exercise')).toHaveTextContent('Synthetic replacement');
    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await act(async () => undefined);
    expect(state.complete.mock.calls[0][0]).toMatchObject({
      planName: 'Renamed plan', templateId: template.id,
      days: expect.arrayContaining([expect.objectContaining({ exercises: expect.arrayContaining([expect.objectContaining({ name: 'Synthetic replacement' })]) })]),
    });
  });

  it('preview swap → reload → preview restores all days and the replacement from the owner draft', async () => {
    const view = mount();
    await swapInPreview();
    view.unmount();
    mount();
    fireEvent.click(screen.getByTestId('ob-start-preview'));
    expect(screen.getByTestId('review-exercise')).toHaveTextContent('Synthetic replacement');
    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await act(async () => undefined);
    expect(state.complete.mock.calls[0][0].days).toHaveLength(template.days.length);
    expect(await readOnboardingDraft('other-owner')).toBeNull();
  });

  it('pending save blocks Back and Android Back; failure preserves input and unlocks retry', async () => {
    let fail!: (result: { success: boolean; error: string }) => void;
    state.complete.mockImplementationOnce(() => new Promise(resolve => { fail = resolve; }));
    mount();
    fireEvent.change(screen.getByTestId('ob-plan-name'), { target: { value: 'Saved choice' } });
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    expect(screen.getByTestId('ob-plan-name')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Wstecz/ })).toBeDisabled();
    act(() => window.dispatchEvent(new Event(ANDROID_BACK_EVENT, { cancelable: true })));
    expect(screen.getByTestId('ob-start-cta')).toBeDisabled();
    await act(async () => fail({ success: false, error: 'Offline. Try again.' }));
    expect(screen.getByText('Offline. Try again.')).toBeInTheDocument();
    expect(screen.getByTestId('ob-plan-name')).toBeEnabled();
    expect(screen.getByTestId('ob-plan-name')).toHaveValue('Saved choice');
    fireEvent.click(screen.getByTestId('ob-start-cta'));
    await act(async () => undefined);
    expect(state.complete).toHaveBeenCalledTimes(2);
    expect(state.complete.mock.calls[1][0]).toEqual(state.complete.mock.calls[0][0]);
  });

  it('selecting a different template replaces the old preview edits deliberately', async () => {
    mount();
    await swapInPreview();
    fireEvent.click(screen.getByText('PREVIEW-BACK'));
    fireEvent.click(screen.getByRole('button', { name: /Wstecz/ }));
    const otherTemplate = screen.getByTestId('ob-plan-choices').querySelector<HTMLButtonElement>('button[aria-pressed="false"]')!;
    fireEvent.click(otherTemplate);
    fireEvent.click(screen.getByTestId('ob-match-next'));
    fireEvent.click(screen.getByTestId('ob-start-preview'));
    expect(screen.getByTestId('review-exercise')).not.toHaveTextContent('Synthetic replacement');
    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await act(async () => undefined);
    expect(state.complete.mock.calls[0][0].templateId).not.toBe(template.id);
  });

  it('a rapid repeated confirmation starts one save and cannot leave the pending preview', async () => {
    let fail!: (result: { success: boolean; error: string }) => void;
    state.complete.mockImplementationOnce(() => new Promise(resolve => { fail = resolve; }));
    mount();
    await swapInPreview();
    act(() => {
      fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
      fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
      fireEvent.click(screen.getByText('PREVIEW-BACK'));
    });
    expect(state.complete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('review-exercise')).toHaveTextContent('Synthetic replacement');
    await act(async () => fail({ success: false, error: 'Retry allowed' }));
    fireEvent.click(screen.getByText('PREVIEW-CONFIRM'));
    await act(async () => undefined);
    expect(state.complete).toHaveBeenCalledTimes(2);
  });
});
