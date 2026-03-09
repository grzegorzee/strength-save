import { Menu, LogOut, Moon, Sun, WifiOff, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUser } from '@/contexts/UserContext';
import { useTheme } from 'next-themes';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface AppHeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export const AppHeader = ({ title, onMenuClick }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile, isAdmin } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const { isOnline, pendingOps } = useOnlineStatus();

  const displayName = profile?.displayName || user?.displayName || '';
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'GJ';

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  initials
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {displayName && (
                <div className="px-2 py-1.5 border-b mb-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  {profile?.email && (
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  )}
                </div>
              )}
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Ustawienia
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Wyloguj się
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
