import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({
  record: vi.fn(), merge: vi.fn(),
  profile: { displayName: 'New user', consents: {} as Record<string, unknown> },
}));
vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({
  uid: 'new-user', profile: state.profile, mergeConfirmedConsentMirror: state.merge,
}) }));
vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ lang: 'pl', t: (key: string) => key }) }));
vi.mock('@/hooks/useTrainingPlan', () => ({ useTrainingPlan: () => ({ savePlan: vi.fn() }) }));
vi.mock('@/hooks/usePlanCycles', () => ({ usePlanCycles: () => ({ createActiveCycle: vi.fn() }) }));
vi.mock('@/hooks/useSubscription', () => ({ useRequiresPaywall: () => false }));
vi.mock('@/lib/consents-api', () => ({ recordConsents: state.record }));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/user-events', () => ({ buildPlanEventEmitter: vi.fn() }));
vi.mock('@/components/PlanPreview', () => ({ PlanPreview: () => null }));
vi.mock('@/components/PlanWizard', () => ({ PlanWizard: ({ onLegalConsent, legalConsentAlreadyRecorded }: {
  onLegalConsent: (selection: { terms: boolean; privacy: boolean; health: boolean; marketing: boolean }) => Promise<void>;
  legalConsentAlreadyRecorded: boolean;
}) => <>
  <span data-testid="confirmed">{String(legalConsentAlreadyRecorded)}</span>
  <button onClick={() => void onLegalConsent({ terms: true, privacy: true, health: false, marketing: false }).catch(() => undefined)}>accept</button>
</> }));

import Onboarding from '@/pages/Onboarding';
import { CONSENT_DOC_VERSION } from '@/lib/legal-versions';

const mirror = { termsVersion: CONSENT_DOC_VERSION.terms, privacyVersion: CONSENT_DOC_VERSION.privacy_ack };
beforeEach(() => {
  localStorage.clear();
  state.profile = { displayName: 'New user', consents: {} };
  state.record.mockReset().mockResolvedValue(mirror);
  state.merge.mockReset().mockImplementation(value => { state.profile.consents = value; });
});

it('keeps confirmed Welcome consents while Firestore still exposes the old cached profile', async () => {
  const view = render(<MemoryRouter><Onboarding /></MemoryRouter>);
  expect(screen.getByTestId('confirmed')).toHaveTextContent('false');
  fireEvent.click(screen.getByText('accept'));
  await waitFor(() => expect(state.merge).toHaveBeenCalledExactlyOnceWith(mirror));
  view.rerender(<MemoryRouter><Onboarding /></MemoryRouter>);
  expect(screen.getByTestId('confirmed')).toHaveTextContent('true');
});

it('does not turn an offline consent rejection into local permission', async () => {
  state.record.mockRejectedValueOnce(new Error('offline'));
  render(<MemoryRouter><Onboarding /></MemoryRouter>);
  fireEvent.click(screen.getByText('accept'));
  await waitFor(() => expect(state.record).toHaveBeenCalledOnce());
  expect(state.merge).not.toHaveBeenCalled();
  expect(screen.getByTestId('confirmed')).toHaveTextContent('false');
});
