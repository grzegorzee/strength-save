import { Menu, Moon, Sun, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface AppHeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export const AppHeader = ({ title, onMenuClick }: AppHeaderProps) => {
  const { theme, setTheme } = useTheme();
  const { isOnline, pendingOps } = useOnlineStatus();

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b">
      <div className="flex items-center justify-between h-16 px-5 md:px-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-xl font-heading font-bold text-foreground tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-medium">
              <WifiOff className="h-3.5 w-3.5" />
              Offline
              {pendingOps > 0 && <span className="ml-0.5">({pendingOps})</span>}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Przełącz motyw"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  );
};
