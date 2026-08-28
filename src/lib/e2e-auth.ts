import type { ConsentMirror } from '@/lib/legal-versions';

export const E2E_AUTH_STATE_KEY = 'fittracker_e2e_auth_state';

export type E2EAuthScenario =
  | 'unauthenticated'
  | 'pending-verification'
  | 'suspended'
  | 'active-user'
  | 'active-admin'
  | 'new-user'
  | 'new-invited-user';

export interface E2EAuthState {
  scenario: E2EAuthScenario;
  email?: string;
  displayName?: string;
  /** Symuluj natywny iOS (paywall) w testach E2E uruchamianych w przeglądarce. */
  simulateNative?: boolean;
  /** Stan subskrypcji wstrzykiwany do profilu E2E (surowy kształt z Firestore). */
  subscription?: { tier: string; status: string; expiresAt: string | null } | null;
  /** Czy user ma ukończone treningi (sprawdzane przez hard paywall guard). */
  hasWorkouts?: boolean;
  /** WP-G (X35a): profil treningowy w profilu E2E (cel steruje tonem delty wagi). */
  trainingProfile?: { level?: string; objective?: string; daysPerWeek?: number };
  /** Mirror serwera wyłącznie do testów wznowienia/re-consent. */
  consents?: ConsentMirror;
}

export const readE2EAuthState = (): E2EAuthState => {
  if (typeof window === 'undefined') {
    return { scenario: 'active-admin' };
  }

  const raw = window.localStorage.getItem(E2E_AUTH_STATE_KEY);
  if (!raw) {
    return { scenario: 'active-admin' };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<E2EAuthState>;
    if (!parsed || typeof parsed.scenario !== 'string') {
      return { scenario: 'active-admin' };
    }

    return {
      scenario: parsed.scenario as E2EAuthScenario,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : undefined,
      simulateNative: parsed.simulateNative === true,
      subscription: parsed.subscription && typeof parsed.subscription === 'object' ? parsed.subscription : null,
      hasWorkouts: parsed.hasWorkouts === true,
      trainingProfile: parsed.trainingProfile && typeof parsed.trainingProfile === 'object' ? parsed.trainingProfile : undefined,
      consents: parsed.consents && typeof parsed.consents === 'object' ? parsed.consents : undefined,
    };
  } catch {
    return { scenario: 'active-admin' };
  }
};
