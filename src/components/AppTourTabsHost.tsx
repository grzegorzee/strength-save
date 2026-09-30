import { useLocation } from 'react-router-dom';
import { AppTour } from '@/components/AppTour';
import { useAppTour } from '@/hooks/useAppTour';
import { PRACTICE_PATH, TABS_TOUR_STEPS } from '@/lib/first-workout-tour';

// Przewodnik nowego konta, rozdział zakładek: jeden spotlight na zakładkę
// dolnego paska (Plan, Historia, Postępy, Profil), tap w zakładkę = przejście,
// na końcu dymek „gotowe”. Host żyje w Layout, więc przeżywa zmianę trasy.
// Tylko wskazanie, żadnych akcji na danych: działa na każdym stanie konta
// (także pustym). Nigdy nad prawdziwym treningiem ani treningiem próbnym.
export const AppTourTabsHost = () => {
  const { pathname } = useLocation();
  const appTour = useAppTour(null);
  if (appTour.stage !== 'tabs') return null;
  if (pathname.startsWith('/workout/') || pathname === PRACTICE_PATH) return null;
  return (
    <AppTour
      steps={TABS_TOUR_STEPS}
      initialStepId={appTour.step}
      onStepChange={appTour.rememberStep}
      onComplete={() => appTour.finish('done')}
      onSkip={() => appTour.finish('skipped')}
    />
  );
};
