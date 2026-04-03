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
    };
  } catch {
    return { scenario: 'active-admin' };
  }
};
