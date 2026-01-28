import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

interface AppHeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export const AppHeader = ({ title, onMenuClick }: AppHeaderProps) => {
  const { user, logout } = useAuth();

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
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
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </div>

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
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={logout} className="cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Wyloguj się
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
