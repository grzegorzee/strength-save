import { ArrowLeft, Dumbbell, Menu, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkoutReads } from '@/hooks/useFirebaseWorkouts';
import { useTranslation } from '@/contexts/LanguageContext';

interface AppHeaderProps {
  title: string;
  onBack?: () => void;
  onMenuClick?: () => void;
}

export const AppHeader = ({ title, onBack, onMenuClick }: AppHeaderProps) => {
  const { t } = useTranslation();
  const { uid } = useCurrentUser();
  const { workouts, isLoaded } = useFirebaseWorkoutReads(uid);
  const { isOnline, pendingOps } = useOnlineStatus();
  const completedCount = workouts.filter((w) => w.completed).length;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-16 px-5 md:px-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="rounded-2xl bg-muted/60 md:hidden"
              aria-label={t('nav.openMenu')}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
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
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold"
              aria-label={t('comp.header.workoutsCount', { count: completedCount })}
              title={t('comp.header.workoutsCount', { count: completedCount })}
            >
              <Dumbbell className="h-4 w-4" />
              {completedCount}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
