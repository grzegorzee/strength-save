import { useEffect, useState } from 'react';
import { collection, getDocs, getDocsFromCache, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { useSubscription, isPaywallPlatform } from '@/hooks/useSubscription';
import { readE2EAuthState } from '@/lib/e2e-auth';
import { resolvePaywallGuard, type PaywallGuardStatus } from '@/lib/paywall-guard';
import { withTimeout } from '@/lib/promise-timeout';

const PAYWALL_WORKOUT_TIMEOUT_MS = 1500;

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
    const workoutQuery = query(collection(db, 'workouts'), where('userId', '==', uid), limit(1));
    const resolveWorkouts = async () => {
      try {
        const cached = await getDocsFromCache(workoutQuery);
        if (!cached.empty) return true;
        const remote = await withTimeout(
          getDocs(workoutQuery),
          PAYWALL_WORKOUT_TIMEOUT_MS,
          'Paywall workout lookup',
        );
        return !remote.empty;
      } catch {
        // Fail-open: awaria nie może uwięzić usera z danymi. Nie nadaje to PRO —
        // bramki płatnych akcji nadal opierają się na useSubscription.
        return true;
      }
    };
    void resolveWorkouts().then((value) => { if (!cancelled) setHasWorkouts(value); });
    return () => { cancelled = true; };
  }, [shouldCheckWorkouts, uid]);

  return resolvePaywallGuard({
    platformEligible,
    subscriptionLoading: loading,
    isPro,
    hasCompletedWorkouts: hasWorkouts,
  });
};
