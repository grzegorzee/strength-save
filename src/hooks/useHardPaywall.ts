import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useSubscription, isPaywallPlatform } from '@/hooks/useSubscription';
import { readE2EAuthState } from '@/lib/e2e-auth';
import { resolvePaywallGuard, type PaywallGuardStatus } from '@/lib/paywall-guard';

// Status hard paywalla onboardingowego dla bieżącego usera.
// 'enforced' = świeży user na iOS bez PRO i bez treningów → każda trasa na /paywall,
// a sam paywall przechodzi w tryb bez wyjścia (teaser + brak strzałki wstecz).
export const useHardPaywall = (): PaywallGuardStatus => {
  const { uid } = useCurrentUser();
  const { isPro, loading } = useSubscription();
  const platformEligible = isPaywallPlatform();
  const [hasWorkouts, setHasWorkouts] = useState<boolean | null>(null);

  const shouldCheckWorkouts = platformEligible && !loading && !isPro && hasWorkouts === null;

  useEffect(() => {
    if (!shouldCheckWorkouts) return;

    if (import.meta.env.VITE_E2E_MODE === 'true') {
      setHasWorkouts(readE2EAuthState().hasWorkouts === true);
      return;
    }

    let cancelled = false;
    getDocs(query(collection(db, 'workouts'), where('userId', '==', uid), limit(1)))
      .then((snap) => { if (!cancelled) setHasWorkouts(!snap.empty); })
      // Fail-open: błąd odczytu nie może zamknąć apki przed userem z danymi;
      // monetyzację i tak chronią bramki akcji (start treningu, kreator).
      .catch(() => { if (!cancelled) setHasWorkouts(true); });
    return () => { cancelled = true; };
  }, [shouldCheckWorkouts, uid]);

  return resolvePaywallGuard({
    platformEligible,
    subscriptionLoading: loading,
    isPro,
    hasCompletedWorkouts: hasWorkouts,
  });
};
