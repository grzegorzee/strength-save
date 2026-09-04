import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, WifiOff } from 'lucide-react';
import { AllTimeStatsSheet } from '@/components/AllTimeStatsSheet';
import { HeaderActionsOutlet } from '@/components/HeaderActions';
import { NotificationBell } from '@/components/NotificationBell';
import { consumeCelebration } from '@/lib/workout-celebration';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkoutReads } from '@/hooks/useFirebaseWorkouts';
import { useWorkoutAggregate } from '@/hooks/useWorkoutAggregate';
import { useTranslation } from '@/contexts/LanguageContext';
import { APP_CHROME_ROOT_PATHS } from '@/lib/main-navigation';
import { countCompletedWorkouts } from '@/lib/completed-workouts';

interface AppHeaderProps {
  title: string;
  onBack?: () => void;
}

export const AppHeader = ({ title, onBack }: AppHeaderProps) => {
  const { t } = useTranslation();
  const { uid, profile, avatarSrc } = useCurrentUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Licznik i dzwonek tworzą jeden kontrakt nagłówka głównych zakładek. Dzięki
  // temu przejście Dzisiaj -> Plan -> Historia nie zmienia znaczenia prawego
  // klastra ani nie zastępuje liczby dopiskiem zależnym od ekranu.
  const isDashboard = pathname === '/';
  const contentOwnsPageHeading = title === 'Strength Save'
    || isDashboard
    || pathname === '/achievements'
    || pathname === '/plan/edit'
    || pathname === '/exercises'
    || pathname.startsWith('/admin');
  const showBell = APP_CHROME_ROOT_PATHS.has(pathname);
  const showWorkoutCount = APP_CHROME_ROOT_PATHS.has(pathname);
  const displayName = profile?.displayName || '';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'SS';
  // Z216: nagłówek jest na każdym ekranie — nie może trzymać szerokiego
  // listenera (pomiary 'none', treningi okno recent). Licznik all-time daje
  // agregat Z217; fallback z okna dotyczy tylko kont bez dokumentu agregatu.
  const { workouts, isLoaded } = useFirebaseWorkoutReads(uid, 'none', 'recent');
  const aggregate = useWorkoutAggregate(uid);
  const { isOnline, pendingOps } = useOnlineStatus();
  const completedCount = aggregate?.totals.workoutCount ?? countCompletedWorkouts(workouts);
  const [statsOpen, setStatsOpen] = useState(false);
  const [celebration, setCelebration] = useState(0);

  // Z140.4: użytkownicy z `prefers-reduced-motion` dostają samą zmianę liczby.
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Z140.2: AppHeader jest UKRYTY na /workout/*, więc w momencie zakończenia
  // treningu nie ma go w drzewie. Gratulację odczytujemy z trwałego stanu po
  // powrocie na Dashboard, zamiast liczyć na zamontowany komponent.
  useEffect(() => {
    // Naprawa r2: konsumpcja tylko tam, gdzie licznik jest widoczny — inaczej
    // "+1" przepadałoby po cichu na pod-tabach bez pigułki.
    if (!isDashboard) {
      // Nawigacja przed końcem animacji czyści ją od razu; cleanup poniższego
      // timera nie może zostawić wiszącego "+1" na kolejnej zakładce.
      setCelebration(0);
      return;
    }
    if (!isLoaded) return;
    const delta = consumeCelebration(completedCount);
    if (delta <= 0) return;
    setCelebration(delta);
    const id = setTimeout(() => setCelebration(0), 1800);
    return () => clearTimeout(id);
  }, [isLoaded, isDashboard, completedCount]);

  // WP-F (X27): wspólna tafla .kinetic-glass zamiast ad-hoc bg/blur — spójność
  // z bottom navem; header jest edge-to-edge, więc bez bocznych i górnej krawędzi.
  return (
    <header className="kinetic-glass sticky top-0 z-40 border-x-0 border-t-0 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-16 px-5 md:px-6 max-w-4xl mx-auto">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {onBack ? (
            <Button variant="ghost" size="icon" onClick={onBack} aria-label={t('comp.header.back')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label={t('nav.profile')}
              data-testid="header-avatar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {/* Naprawa r2 (2026-08-21): inicjał na tincie akcentu 20% + litera
                  w akcencie (artboardy; ten sam wariant co avatar na Profilu). */}
              <span className="flex h-9 w-9 overflow-hidden rounded-full ring-1 ring-border">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-primary/20 text-xs font-bold text-primary">
                    {initials}
                  </span>
                )}
              </span>
            </button>
          )}
          {/* Naprawa r1 (2026-08-21, sędzia struktury): tytuł zawijał się do dwóch
              linii przy 390px (PLAN / TRENINGOWY) — jedna linia jak artboardy
              (15.5px, ls .14em) + truncate jako bezpiecznik. */}
          {contentOwnsPageHeading ? (
            <p className="min-w-0 truncate whitespace-nowrap text-[15.5px] font-heading font-bold uppercase text-foreground tracking-[0.14em]">{title}</p>
          ) : (
            <h1 className="min-w-0 truncate whitespace-nowrap text-[15.5px] font-heading font-bold uppercase text-foreground tracking-[0.14em]">{title}</h1>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Naprawa r2 (2026-08-21): slot na kontekstowe akcje ekranu
              (artboard 1a: History ma tu kafle lupy i filtrów). */}
          <HeaderActionsOutlet />
          {showBell && uid && <NotificationBell uid={uid} />}
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-fitness-warning/10 text-fitness-warning text-xs font-medium">
              <WifiOff className="h-3.5 w-3.5" />
              {t('comp.header.offline')}
              {pendingOps > 0 && <span className="ml-0.5">({pendingOps})</span>}
            </div>
          )}
          {showWorkoutCount && isLoaded && (
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              aria-label={t('stats.open')}
              title={t('comp.header.workoutsCount', { count: completedCount })}
              data-testid="header-workout-count"
              className="relative flex min-h-11 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
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
                    className="pointer-events-none absolute -top-1 right-1 text-sm font-bold text-primary"
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

      <AllTimeStatsSheet open={statsOpen} onOpenChange={setStatsOpen} workouts={workouts} uid={uid} />
    </header>
  );
};
