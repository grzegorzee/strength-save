import { ArrowLeft, Menu, Moon, Sun, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTranslation } from '@/contexts/LanguageContext';

interface AppHeaderProps {
  title: string;
  onMenuClick?: () => void;
  onBack?: () => void;
}

export const AppHeader = ({ title, onMenuClick, onBack }: AppHeaderProps) => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { isOnline, pendingOps } = useOnlineStatus();

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between h-16 px-5 md:px-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {onBack ? (
            <Button variant="ghost" size="icon" onClick={onBack} aria-label={t('comp.header.back')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
              <Menu className="h-5 w-5" />
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={t('comp.header.toggleTheme')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  );
};
