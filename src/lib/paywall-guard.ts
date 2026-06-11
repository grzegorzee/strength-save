// Hard paywall onboardingowy (wariant B): świeży user na natywnym iOS bez PRO
// i bez żadnego ukończonego treningu nie widzi apki — każda trasa idzie na /paywall.
// User z danymi (expired) zostaje w trybie read-only z bramkami akcji (anty-"data hostage").

export type PaywallGuardStatus = 'off' | 'pending' | 'enforced';

export interface PaywallGuardInput {
  /** Platforma objęta paywallem (natywny iOS; web jest invite-only, bez sprzedaży). */
  platformEligible: boolean;
  /** Stan subskrypcji jeszcze się ustala (profil / RevenueCat). */
  subscriptionLoading: boolean;
  /** Aktywny dostęp PRO (admin/comp/subskrypcja/trial) — z useSubscription. */
  isPro: boolean;
  /** Czy user ma jakikolwiek ukończony trening (null = jeszcze nie wiemy). */
  hasCompletedWorkouts: boolean | null;
}

export const resolvePaywallGuard = (input: PaywallGuardInput): PaywallGuardStatus => {
  if (!input.platformEligible) return 'off';
  // PRO z dowolnego ustalonego źródła wystarcza — kolejne źródła mogą dostęp tylko dodać.
  if (input.isPro) return 'off';
  if (input.subscriptionLoading) return 'pending';
  if (input.hasCompletedWorkouts === null) return 'pending';
  return input.hasCompletedWorkouts ? 'off' : 'enforced';
};
