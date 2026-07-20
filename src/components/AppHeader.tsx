import { useEffect, useState } from 'react';
import { ArrowLeft, Dumbbell, WifiOff } from 'lucide-react';
import { AllTimeStatsSheet } from '@/components/AllTimeStatsSheet';
import { consumeCelebration } from '@/lib/workout-celebration';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkoutReads } from '@/hooks/useFirebaseWorkouts';
import { useTranslation } from '@/contexts/LanguageContext';

interface AppHeaderProps {
  title: string;
  onBack?: () => void;
}

export const AppHeader = ({ title, onBack }: AppHeaderProps) => {
  const { t } = useTranslation();
  const { uid } = useCurrentUser();
  const { workouts, isLoaded } = useFirebaseWorkoutReads(uid);
  const { isOnline, pendingOps } = useOnlineStatus();
  const completedCount = workouts.filter((w) => w.completed).length;
  const [statsOpen, setStatsOpen] = useState(false);
  const [celebration, setCelebration] = useState(0);

  // Z140.4: użytkownicy z `prefers-reduced-motion` dostają samą zmianę liczby.
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Z140.2: AppHeader jest UKRYTY na /workout/*, więc w momencie zakończenia
  // treningu nie ma go w drzewie. Gratulację odczytujemy z trwałego stanu po
  // powrocie na Dashboard, zamiast liczyć na zamontowany komponent.
  useEffect(() => {
    if (!isLoaded) return;
    const delta = consumeCelebration(completedCount);
    if (delta <= 0) return;
    setCelebration(delta);
    const id = setTimeout(() => setCelebration(0), 1800);
    return () => clearTimeout(id);
  }, [isLoaded, completedCount]);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-16 px-5 md:px-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} aria-label={t('comp.header.back')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-heading font-bold uppercase text-foreground tracking-[0.08em]">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-fitness-warning/10 text-fitness-warning text-xs font-medium">
              <WifiOff className="h-3.5 w-3.5" />
              {t('comp.header.offline')}
              {pendingOps > 0 && <span className="ml-0.5">({pendingOps})</span>}
            </div>
          )}
          {isLoaded && (
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              aria-label={t('stats.open')}
              title={t('comp.header.workoutsCount', { count: completedCount })}
              data-testid="header-workout-count"
              className="relative flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
            >
              <Dumbbell className="h-4 w-4" />
              <span className="tabular-nums">{completedCount}</span>

              {/* Z140.1: „+1" unosi się i gaśnie. Keyframes inline jak w ConfettiBurst
                  — w projekcie nie ma (i nie ma być) framer-motion. */}
              {celebration > 0 && (
                <>
                  <style>{'@keyframes ss-plus-one{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-22px);opacity:0}}'}</style>
                  <span
                    aria-hidden="true"
                    data-testid="header-plus-one"
                    className="pointer-events-none absolute -top-1 right-1 text-sm font-bold text-fitness-success"
                    style={reducedMotion
                      ? undefined
                      : { animation: 'ss-plus-one 1.6s ease-out forwards' }}
                  >
                    +{celebration}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <AllTimeStatsSheet open={statsOpen} onOpenChange={setStatsOpen} workouts={workouts} />
    </header>
  );
};
